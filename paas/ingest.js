// Load the Carvelo dataset into Adobe Commerce (PaaS) over the Admin REST API:
// structure (customer group, attributes, attribute set, categories) via REST, products via
// POST /V1/import/json, then prices via REST. USD loads on any instance; EUR is added if an
// EUR website exists. --smoke loads a small product slice. See PAAS_TO_ACO.md.

import { loadPaasConfig } from "../lib/env.js";
import { readData } from "../lib/data.js";
import { PaasClient, mapWithConcurrency } from "./client.js";
import {
  ATTRIBUTE_SET_NAME,
  ATTRIBUTE_GROUP_NAME,
  SKELETON_ATTRIBUTE_SET_ID,
  ROOT_CATEGORY_ID,
  VIP_GROUP_CODE,
  VIP_TAX_CLASS_ID,
  PRICE_BATCH_SIZE,
  PRODUCT_CONCURRENCY,
  SMOKE_SEED_SKUS,
  resolveScopes,
  EUR_SETUP_HINT,
} from "./config.js";
import {
  isConfigurable,
  isReferenceVehicle,
  selectSmoke,
  deriveAttributeSpec,
  buildAttributeCreateBody,
  orderCategoriesTopDown,
  getParentSlug,
  buildCategoryPayload,
  buildImportContext,
  buildImportItem,
  buildMediaPath,
  orderForImport,
  indexPricesBySku,
  buildBasePriceRows,
  buildTierPriceRows,
} from "./dto.js";

const printSection = (title) => console.info(`\n=== ${title} ===`);

const USAGE = `Usage: npm run ingest:paas [-- <options>]

Load the Carvelo catalog into Adobe Commerce (PaaS). With no options, loads the full catalog.
Structure (customer group, attributes, categories) is always created in full.

  --smoke        load a small product slice (one vehicle line + a fitting part) — run this first
  --image-put    link images via per-product updates instead of a second import (see PAAS_TO_ACO.md)
  --help         show this help

See PAAS_TO_ACO.md.`;

const parseArgs = (argv) => {
  const args = { smoke: false, imagePut: false };
  for (const a of argv.slice(2)) {
    if (a === "--help" || a === "-h") {
      console.log(USAGE);
      process.exit(0);
    } else if (a === "--smoke") args.smoke = true;
    else if (a === "--image-put") args.imagePut = true;
    else {
      console.error(`Unknown option: ${a}\n\n${USAGE}`);
      process.exit(1);
    }
  }
  return args;
};

// ---- Structure -------------------------------------------------------------------------

const ensureCustomerGroup = async (client) => {
  printSection("Customer group");
  // Search first so a re-run can't create a second group (group codes aren't always
  // uniqueness-validated on create).
  const params = new URLSearchParams({
    "searchCriteria[filterGroups][0][filters][0][field]": "code",
    "searchCriteria[filterGroups][0][filters][0][value]": VIP_GROUP_CODE,
  });
  const found = await client.get(`/V1/customerGroups/search?${params}`);
  if (found?.items?.length) {
    console.info(`Customer group '${VIP_GROUP_CODE}' already exists.`);
    return;
  }
  await client.post("/V1/customerGroups", {
    group: { code: VIP_GROUP_CODE, tax_class_id: VIP_TAX_CLASS_ID },
  });
  console.info(`Created customer group '${VIP_GROUP_CODE}'.`);
};


// Backfill any of our option labels missing from an existing dropdown attribute.
const ensureAttributeOptions = async (client, code, options) => {
  const existing =
    (await client.get(`/V1/products/attributes/${encodeURIComponent(code)}/options`)) ?? [];
  const have = new Set(existing.map((o) => o.label));
  let added = 0;
  for (const opt of options) {
    if (opt.label === "" || have.has(opt.label)) continue;
    await client.post(
      `/V1/products/attributes/${encodeURIComponent(code)}/options`,
      { option: { label: opt.label } },
      { tolerate: [400] },
    );
    added++;
  }
  return added;
};

// Apply the layered-nav / search flags to an attribute and confirm they persisted. The create
// POST doesn't reliably store these (and does nothing when the attribute already exists), so we
// always PUT and read the response back. The update endpoint rebuilds the attribute from the
// payload rather than merging, so we resend the whole spec entry (which carries frontend_label,
// required by the validator) minus `options` — options are managed separately and would re-add
// duplicates here. Returns true when is_filterable/is_searchable match.
const ensureAttributeFlags = async (client, entry) => {
  // Commerce's attribute-update endpoint rebuilds the attribute from the payload: a partial body
  // fails validation (frontend_label / frontend_input required), while a hand-built full body lacks
  // the existing attribute_id and is treated as a create ("already exists"). So GET the existing
  // attribute and PUT it back verbatim with only the facet/search flags overridden.
  const code = encodeURIComponent(entry.attribute_code);
  const existing = await client.get(`/V1/products/attributes/${code}`, { tolerate: [404] });
  if (!existing || existing.tolerated) {
    console.error(`  ${entry.attribute_code}: could not load attribute for flag update`);
    return false;
  }
  const attribute = {
    ...existing,
    is_filterable: entry.is_filterable,
    is_filterable_in_search: entry.is_filterable_in_search,
    used_in_product_listing: entry.used_in_product_listing,
    is_searchable: entry.is_searchable,
    used_for_sort_by: entry.used_for_sort_by,
  };
  const res = await client.put(
    `/V1/products/attributes/${code}`,
    { attribute },
    { tolerate: [400, 404] },
  );
  if (res?.tolerated) {
    console.error(
      `  ${entry.attribute_code}: flag update rejected (${res.status}): ${String(res.body).slice(0, 200)}`,
    );
    return false;
  }
  // Verify against a fresh read — the PUT response doesn't reliably echo these flags.
  const after = await client.get(`/V1/products/attributes/${code}`, { tolerate: [404] });
  const applied =
    !!after &&
    !after.tolerated &&
    Number(after.is_filterable) === Number(entry.is_filterable) &&
    Boolean(Number(after.is_searchable)) === Boolean(entry.is_searchable);
  if (!applied) {
    console.error(
      `  ${entry.attribute_code}: flags did not persist (is_filterable=${after?.is_filterable}, is_searchable=${after?.is_searchable})`,
    );
  }
  return applied;
};

const ingestAttributes = async (client, spec) => {
  printSection(`Attributes (${spec.length})`);
  let optionsAdded = 0;
  let flagged = 0;
  for (const entry of spec) {
    const res = await client.post("/V1/products/attributes", buildAttributeCreateBody(entry), {
      tolerate: [400],
    });
    // If the attribute already existed (a built-in like `manufacturer`, or a re-run), the create
    // body's inline options weren't applied — backfill any missing ones so import values validate.
    if (res?.tolerated && entry.options?.length) {
      optionsAdded += await ensureAttributeOptions(client, entry.attribute_code, entry.options);
    }
    // Always (re)apply the facet/search flags — create doesn't reliably persist them, and existing
    // attributes need updating in place.
    if (await ensureAttributeFlags(client, entry)) flagged++;
  }
  console.info(
    `Created/verified ${spec.length} attributes; ${flagged}/${spec.length} facet-flagged; added ${optionsAdded} missing options.`,
  );
};

const ensureAttributeSet = async (client, spec) => {
  printSection("Attribute set + group");
  // Find the set by name first; create only if absent (idempotent).
  const setParams = new URLSearchParams({
    "searchCriteria[filterGroups][0][filters][0][field]": "attribute_set_name",
    "searchCriteria[filterGroups][0][filters][0][value]": ATTRIBUTE_SET_NAME,
  });
  const setList = await client.get(`/V1/products/attribute-sets/sets/list?${setParams}`);
  let setId = setList?.items?.[0]?.attribute_set_id;
  if (!setId) {
    const created = await client.post("/V1/products/attribute-sets", {
      attributeSet: { attribute_set_name: ATTRIBUTE_SET_NAME, sort_order: 200 },
      skeletonId: SKELETON_ATTRIBUTE_SET_ID,
    });
    setId = created?.attribute_set_id;
  }
  if (!setId) throw new Error(`Could not create or find attribute set '${ATTRIBUTE_SET_NAME}'.`);

  const groupParams = new URLSearchParams({
    "searchCriteria[filterGroups][0][filters][0][field]": "attribute_set_id",
    "searchCriteria[filterGroups][0][filters][0][value]": String(setId),
  });
  const groups = await client.get(
    `/V1/products/attribute-sets/groups/list?${groupParams}`,
  );
  let groupId = (groups?.items ?? []).find(
    (g) => g.attribute_group_name === ATTRIBUTE_GROUP_NAME,
  )?.attribute_group_id;
  if (!groupId) {
    const g = await client.post("/V1/products/attribute-sets/groups", {
      group: { attribute_group_name: ATTRIBUTE_GROUP_NAME, attribute_set_id: setId },
    });
    groupId = g.attribute_group_id;
  }

  for (const [i, entry] of spec.entries()) {
    await client.post(
      "/V1/products/attribute-sets/attributes",
      {
        attributeSetId: setId,
        attributeGroupId: groupId,
        attributeCode: entry.attribute_code,
        sortOrder: (i + 1) * 10,
      },
      { tolerate: [400] },
    );
  }
  console.info(`Attribute set '${ATTRIBUTE_SET_NAME}' ready with ${spec.length} attributes.`);
};

const ingestCategories = async (client, categories) => {
  printSection(`Categories (${categories.length})`);

  // Existing tree -> reuse categories already present (idempotent re-runs); key = parentId::name.
  const tree = await client.get("/V1/categories");
  const existing = new Map();
  const walk = (node) => {
    for (const child of node.children_data ?? []) {
      existing.set(`${node.id}::${child.name}`, child.id);
      walk(child);
    }
  };
  if (tree) walk(tree);

  const idBySlug = {};
  let created = 0;
  let reused = 0;
  for (const record of orderCategoriesTopDown(categories)) {
    const parentSlug = getParentSlug(record.slug);
    const parentId = parentSlug ? idBySlug[parentSlug] : ROOT_CATEGORY_ID;
    const found = existing.get(`${parentId}::${record.name}`);
    if (found) {
      idBySlug[record.slug] = found;
      reused++;
      continue;
    }
    try {
      const res = await client.post("/V1/categories", buildCategoryPayload(record, parentId));
      idBySlug[record.slug] = res.id;
      existing.set(`${parentId}::${record.name}`, res.id);
      created++;
    } catch (err) {
      console.error(`  category '${record.slug}' failed: ${err.message}`);
    }
  }
  console.info(`Categories: ${created} created, ${reused} reused.`);
};

// ---- Products (import/json) -------------------------------------------------------------

const IMPORT_ERROR =
  /^\s*Row \d+:|invalid rows:\s*[1-9]|total errors:\s*[1-9]|exception|maximum error count|system error/i;

const importProducts = async (client, selected, ctx, label = "Products via import/json") => {
  printSection(`${label} (${selected.length})`);
  const rows = orderForImport(selected).map((p) => buildImportItem(p, ctx));
  // The importer derives one header from the items, so every item must carry the same
  // columns; fill whatever a given product omits (images, categories, price, …) with "".
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const items = rows.map((r) => Object.fromEntries(columns.map((c) => [c, r[c] ?? ""])));
  // skip-errors + a high allowed count makes the importer report EACH bad row with a reason
  // (and import the valid ones) instead of a generic "maximum error count reached" message.
  const log = await client.importJson(items, {
    validationStrategy: "validation-skip-errors",
    allowedErrorCount: items.length,
  });
  log.forEach((line) => console.info(`  ${line}`));
  if (log.some((line) => IMPORT_ERROR.test(line))) {
    throw new Error("Product import reported errors (see the rows above).");
  }
  console.info(`Imported ${items.length} product items.`);
};

// ---- Prices ----------------------------------------------------------------------------

const postPriceBatches = async (client, path, rows, label) => {
  if (!rows.length) return;
  let applied = 0;
  for (let i = 0; i < rows.length; i += PRICE_BATCH_SIZE) {
    const batch = rows.slice(i, i + PRICE_BATCH_SIZE);
    // These endpoints return a per-row failure array on validation errors, or throw
    // (e.g. 404 for a missing SKU); tolerate so one bad batch doesn't crash the run.
    const res = await client.post(path, { prices: batch }, { tolerate: [400, 404] });
    let failures = 0;
    if (Array.isArray(res)) {
      failures = res.length;
      res.slice(0, 5).forEach((f) =>
        console.error(`    ${f.sku ?? "?"}: ${f.message ?? JSON.stringify(f)}`),
      );
    } else if (res?.tolerated) {
      failures = batch.length;
      console.error(`    ${label} rejected (${res.status}): ${String(res.body).slice(0, 300)}`);
    }
    applied += batch.length - failures;
  }
  console.info(`${label}: ${applied}/${rows.length} rows applied.`);
};

const ingestPrices = async (client, sellable, prices, scopes) => {
  printSection("Prices");
  const bySku = indexPricesBySku(prices);
  const baseRows = [];
  const tierRows = [];
  for (const p of sellable) {
    const books = bySku.get(p.sku);
    if (!books) continue;
    baseRows.push(...buildBasePriceRows(p.sku, books, scopes));
    tierRows.push(...buildTierPriceRows(p.sku, books, scopes));
  }
  await postPriceBatches(client, "/V1/products/base-prices", baseRows, "base-prices");
  await postPriceBatches(client, "/V1/products/tier-prices", tierRows, "tier-prices");
};

// ---- Images ----------------------------------------------------------------------------
// import/json doesn't fetch remote URLs, and the media API writes a new file per upload — so
// attaching each product's image naively would duplicate our ~37 files across ~2,000 products.
// Instead: upload each unique image once, then reference its shared media path (link step below).
// Reference vehicles aren't shown, so they're skipped throughout.

const getImageBearingProducts = (products) =>
  products.filter((p) => (p.images ?? []).length && !isReferenceVehicle(p));

// Upload each distinct image once (keyed by URL) and return url -> media file path. Idempotent:
// if the owner product already has media, reuse its existing path instead of re-uploading.
const uploadUniqueImages = async (client, selected) => {
  const owners = new Map(); // url -> first product using it
  for (const p of getImageBearingProducts(selected)) {
    const url = p.images[0].url;
    if (!owners.has(url)) owners.set(url, p);
  }
  printSection(`Upload unique images (${owners.size})`);
  const paths = new Map();
  let uploaded = 0;
  let reused = 0;
  let failed = 0;
  for (const [url, owner] of owners) {
    try {
      const media = await client.get(`/V1/products/${encodeURIComponent(owner.sku)}/media`);
      const present = Array.isArray(media) && media.find((m) => m.file);
      if (present) {
        paths.set(url, present.file);
        reused++;
        continue;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
      const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
      const name = url.split("?")[0].split("/").pop();
      await client.post(`/V1/products/${encodeURIComponent(owner.sku)}/media`, {
        entry: {
          media_type: "image",
          label: owner.images[0].label ?? owner.name,
          disabled: false,
          types: ["image", "small_image", "thumbnail"],
          content: { base64_encoded_data: base64, type: "image/png", name },
        },
      });
      // Read back the stored path (authoritative — handles any name collision); fall back to
      // the deterministic dispersion path if the readback is empty.
      const after = await client.get(`/V1/products/${encodeURIComponent(owner.sku)}/media`);
      const entry = (after ?? []).find((m) => m.file?.endsWith(name));
      paths.set(url, entry?.file ?? buildMediaPath(url));
      uploaded++;
    } catch (err) {
      failed++;
      console.error(`  ${owner.sku}: image failed — ${err.message}`);
    }
  }
  console.info(`Unique images: ${uploaded} uploaded, ${reused} reused, ${failed} failed.`);
  return paths;
};

// Fallback (--image-put): point each product's image roles at its shared media path via a
// product update. Guaranteed not to duplicate files, but one call per product.
const assignImageRoles = async (client, selected, imagePaths) => {
  const targets = getImageBearingProducts(selected);
  printSection(`Assign image roles (${targets.length})`);
  let set = 0;
  let failed = 0;
  await mapWithConcurrency(targets, PRODUCT_CONCURRENCY, async (p) => {
    const file = imagePaths.get(p.images[0].url);
    if (!file) {
      failed++;
      return;
    }
    try {
      await client.put(`/V1/products/${encodeURIComponent(p.sku)}`, {
        product: {
          sku: p.sku,
          custom_attributes: ["image", "small_image", "thumbnail"].map((attribute_code) => ({
            attribute_code,
            value: file,
          })),
        },
      });
      set++;
    } catch (err) {
      failed++;
      console.error(`  ${p.sku}: role assign failed — ${err.message}`);
    }
  });
  console.info(`Image roles: ${set} set, ${failed} failed.`);
};

// ---- Orchestration ---------------------------------------------------------------------

const main = async () => {
  const args = parseArgs(process.argv);
  const config = loadPaasConfig();
  const client = new PaasClient(config);

  printSection("Preflight");
  await client.authenticate();
  console.info(`Authenticated to ${config.baseUrl}`);
  const websites = await client.get("/V1/store/websites");
  const storeViews = await client.get("/V1/store/storeViews");
  const scopes = resolveScopes(websites, storeViews);
  const websiteCodes = [scopes.usd.code, ...(scopes.eur ? [scopes.eur.code] : [])];
  console.info(
    `USD website '${scopes.usd.code}' (id ${scopes.usd.websiteId}); ` +
      (scopes.eur ? `EUR website '${scopes.eur.code}' (id ${scopes.eur.websiteId}).` : "no EUR website (USD only)."),
  );

  const metadata = readData("product_metadata.json");
  const allProducts = readData("products.json");
  const categories = readData("categories.json");
  const prices = readData("prices.json");

  // Structure — always full (attribute options derive from ALL products).
  const spec = deriveAttributeSpec(metadata, allProducts);
  await ensureCustomerGroup(client);
  await ingestAttributes(client, spec);
  await ensureAttributeSet(client, spec);
  await ingestCategories(client, categories);

  // Products — --smoke limits which are imported.
  const selected = args.smoke ? selectSmoke(allProducts, SMOKE_SEED_SKUS) : allProducts;
  console.info(
    `\nProduct selection: ${selected.length} of ${allProducts.length}` +
      (args.smoke ? " (--smoke)" : " (full)"),
  );
  const baseCtx = buildImportContext(allProducts, categories, prices, {
    websiteCodes,
    stockWebsiteId: String(scopes.usd.websiteId),
  });

  // Images: (1) create the products without images, (2) upload each unique file once, (3) link
  // the shared media path onto every product — a second import by default (no extra per-product
  // calls), or per-product PUTs with --image-put.
  await importProducts(client, selected, { ...baseCtx, images: "none" });
  const imagePaths = await uploadUniqueImages(client, selected);
  if (args.imagePut) {
    await assignImageRoles(client, selected, imagePaths);
  } else {
    await importProducts(
      client,
      getImageBearingProducts(selected),
      { ...baseCtx, images: "media", imagePaths },
      "Link images via import/json",
    );
  }

  const sellable = selected.filter((p) => !isConfigurable(p) && !isReferenceVehicle(p));
  await ingestPrices(client, sellable, prices, scopes);

  printSection("Done");
  if (!scopes.eur) console.info(`\nNote: ${EUR_SETUP_HINT}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
