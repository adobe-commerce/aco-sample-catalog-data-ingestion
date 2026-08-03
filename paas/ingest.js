// Load the Carvelo dataset into Adobe Commerce (PaaS) over the Admin REST API:
// structure (customer group, attributes, attribute set, categories) via REST, products via
// POST /V1/import/json, then prices via REST. USD loads on any instance; EUR is added if an
// EUR website exists. --smoke loads a small product slice. See PAAS_TO_ACO.md.

import { loadPaasConfig } from "../lib/env.js";
import { readData } from "../lib/data.js";
import { PaasClient } from "./client.js";
import {
  ATTRIBUTE_SET_NAME,
  ATTRIBUTE_GROUP_NAME,
  SKELETON_ATTRIBUTE_SET_ID,
  ROOT_CATEGORY_ID,
  VIP_GROUP_CODE,
  VIP_TAX_CLASS_ID,
  PRICE_BATCH_SIZE,
  SMOKE_SEED_SKUS,
  resolveScopes,
  EUR_SETUP_HINT,
} from "./config.js";
import {
  isConfigurable,
  isReferenceVehicle,
  selectSmoke,
  deriveAttributeSpec,
  attributeCreateBody,
  orderCategoriesTopDown,
  parentSlugOf,
  categoryPayload,
  buildImportContext,
  toImportItem,
  orderForImport,
  indexPricesBySku,
  basePriceRowsForSku,
  tierPriceRowsForSku,
} from "./dto.js";

const section = (title) => console.info(`\n=== ${title} ===`);

const USAGE = `Usage: npm run ingest:paas [-- <options>]

Load the Carvelo catalog into Adobe Commerce (PaaS). With no options, loads the full catalog.
Structure (customer group, attributes, categories) is always created in full.

  --smoke        load a small product slice (one vehicle line + a fitting part) — run this first
  --help         show this help

See PAAS_TO_ACO.md.`;

const parseArgs = (argv) => {
  const args = { smoke: false };
  for (const a of argv.slice(2)) {
    if (a === "--help" || a === "-h") {
      console.log(USAGE);
      process.exit(0);
    } else if (a === "--smoke") args.smoke = true;
    else {
      console.error(`Unknown option: ${a}\n\n${USAGE}`);
      process.exit(1);
    }
  }
  return args;
};

// ---- Structure -------------------------------------------------------------------------

const ensureCustomerGroup = async (client) => {
  section("Customer group");
  const res = await client.post(
    "/V1/customerGroups",
    { group: { code: VIP_GROUP_CODE, tax_class_id: VIP_TAX_CLASS_ID } },
    { tolerate: [400] },
  );
  console.info(
    res?.tolerated
      ? `Customer group '${VIP_GROUP_CODE}' already exists.`
      : `Created customer group '${VIP_GROUP_CODE}'.`,
  );
};

const ingestAttributes = async (client, spec) => {
  section(`Attributes (${spec.length})`);
  for (const entry of spec) {
    await client.post("/V1/products/attributes", attributeCreateBody(entry), {
      tolerate: [400],
    });
  }
  console.info(`Created/verified ${spec.length} attributes (+ options).`);
};

const ensureAttributeSet = async (client, spec) => {
  section("Attribute set + group");
  const created = await client.post(
    "/V1/products/attribute-sets",
    {
      attributeSet: { attribute_set_name: ATTRIBUTE_SET_NAME, sort_order: 200 },
      skeletonId: SKELETON_ATTRIBUTE_SET_ID,
    },
    { tolerate: [400] },
  );

  let setId = created?.attribute_set_id;
  if (!setId) {
    const params = new URLSearchParams({
      "searchCriteria[filterGroups][0][filters][0][field]": "attribute_set_name",
      "searchCriteria[filterGroups][0][filters][0][value]": ATTRIBUTE_SET_NAME,
    });
    const list = await client.get(`/V1/products/attribute-sets/sets/list?${params}`);
    setId = list?.items?.[0]?.attribute_set_id;
  }
  if (!setId) throw new Error(`Could not create or find attribute set '${ATTRIBUTE_SET_NAME}'.`);

  const groups = await client.get(`/V1/products/attribute-sets/${setId}/groups`);
  const groupList = groups?.items ?? groups ?? [];
  let groupId = groupList.find(
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
  section(`Categories (${categories.length})`);
  const idBySlug = {};
  for (const record of orderCategoriesTopDown(categories)) {
    const parentSlug = parentSlugOf(record.slug);
    const parentId = parentSlug ? idBySlug[parentSlug] : ROOT_CATEGORY_ID;
    try {
      const res = await client.post("/V1/categories", categoryPayload(record, parentId));
      idBySlug[record.slug] = res.id;
    } catch (err) {
      console.error(`  category '${record.slug}' failed: ${err.message}`);
    }
  }
  console.info(`Created ${Object.keys(idBySlug).length} categories.`);
};

// ---- Products (import/json) -------------------------------------------------------------

const IMPORT_ERROR = /invalid rows:\s*[1-9]|total errors:\s*[1-9]|exception|\bfailed\b/i;

const importProducts = async (client, selected, ctx) => {
  section(`Products via import/json (${selected.length})`);
  const items = orderForImport(selected).map((p) => toImportItem(p, ctx));
  const log = await client.importJson(items);
  log.forEach((line) => console.info(`  ${line}`));
  if (log.some((line) => IMPORT_ERROR.test(line))) {
    throw new Error("Product import reported errors (see the import log above).");
  }
  console.info(`Submitted ${items.length} product items.`);
};

// ---- Prices ----------------------------------------------------------------------------

const postPriceBatches = async (client, path, rows, label) => {
  if (!rows.length) return;
  let applied = 0;
  for (let i = 0; i < rows.length; i += PRICE_BATCH_SIZE) {
    const batch = rows.slice(i, i + PRICE_BATCH_SIZE);
    const res = await client.post(path, { prices: batch });
    const failures = Array.isArray(res) ? res.length : 0;
    applied += batch.length - failures;
    if (failures) console.error(`  ${label}: ${failures} rows failed in a batch.`);
  }
  console.info(`${label}: ${applied}/${rows.length} rows applied.`);
};

const ingestPrices = async (client, sellable, prices, scopes) => {
  section("Prices");
  const bySku = indexPricesBySku(prices);
  const baseRows = [];
  const tierRows = [];
  for (const p of sellable) {
    const books = bySku.get(p.sku);
    if (!books) continue;
    baseRows.push(...basePriceRowsForSku(p.sku, books, scopes));
    tierRows.push(...tierPriceRowsForSku(p.sku, books, scopes));
  }
  await postPriceBatches(client, "/V1/products/base-prices", baseRows, "base-prices");
  await postPriceBatches(client, "/V1/products/tier-prices", tierRows, "tier-prices");
};

// ---- Orchestration ---------------------------------------------------------------------

const main = async () => {
  const args = parseArgs(process.argv);
  const config = loadPaasConfig();
  const client = new PaasClient(config);

  section("Preflight");
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
  const ctx = buildImportContext(allProducts, categories, prices, {
    websiteCodes,
    stockWebsiteId: String(scopes.usd.websiteId),
  });
  await importProducts(client, selected, ctx);

  const sellable = selected.filter((p) => !isConfigurable(p) && !isReferenceVehicle(p));
  await ingestPrices(client, sellable, prices, scopes);

  section("Done");
  if (!scopes.eur) console.info(`\nNote: ${EUR_SETUP_HINT}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
