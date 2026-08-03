// ACO dataset (data/*.json) -> Adobe Commerce representations. Pure mappers, no I/O.
// The core is toImportItem(): one canonical import record, sent as a /V1/import/json item
// (paas/ingest.js) or flattened to CSV columns (paas/build-uploads.js).

import {
  NATIVE_ATTRIBUTES,
  ATTRIBUTE_INPUT_OVERRIDES,
  DEFAULT_ATTRIBUTE_INPUT,
  ATTRIBUTE_SET_NAME,
  ROOT_CATEGORY_ID,
  ALL_GROUPS,
  VIP_GROUP_CODE,
  DEFAULT_QTY,
  PRICE_BOOK_ROLES,
} from "./config.js";

// ---- Product classification ------------------------------------------------------------

export const isConfigurable = (p) =>
  Array.isArray(p.configurations) && p.configurations.length > 0;

const parentSkuOf = (p) =>
  (p.links || []).find((l) => l.type === "VARIANT_OF")?.sku;

export const isReferenceVehicle = (p) =>
  p.sku.startsWith("veh-") && (p.visibleIn || []).length === 0;

const inputTypeFor = (code) =>
  ATTRIBUTE_INPUT_OVERRIDES[code] || DEFAULT_ATTRIBUTE_INPUT;

const hasOptions = (input) => input === "select" || input === "multiselect";

// ---- Smoke selection -------------------------------------------------------------------

export const selectSmoke = (products, seedSkus) => {
  const seeds = new Set(seedSkus);
  return products.filter((p) => seeds.has(p.sku) || seeds.has(parentSkuOf(p)));
};

// ---- Attributes (REST create) ----------------------------------------------------------
// Metadata order minus NATIVE. Options are the order-preserving union of actual product
// values (select/multiselect) — this is where fitment's ~376 vehicle-SKU options come from.
export const deriveAttributeSpec = (metadata, products) => {
  const valuesByCode = new Map();
  for (const p of products) {
    for (const attr of p.attributes || []) {
      if (!valuesByCode.has(attr.code)) valuesByCode.set(attr.code, []);
      const seen = valuesByCode.get(attr.code);
      for (const v of attr.values || []) if (!seen.includes(v)) seen.push(v);
    }
  }

  const spec = [];
  for (const meta of metadata) {
    if (NATIVE_ATTRIBUTES.has(meta.code)) continue;
    const input = inputTypeFor(meta.code);
    const entry = {
      attribute_code: meta.code,
      default_frontend_label: meta.label || meta.code,
      frontend_input: input,
      scope: "global",
      is_required: false,
    };
    if (hasOptions(input)) {
      entry.options = (valuesByCode.get(meta.code) || []).map((label) => ({
        label: String(label),
      }));
    }
    spec.push(entry);
  }
  return spec;
};

export const attributeCreateBody = (specEntry) => ({ attribute: specEntry });

// ---- Categories (REST create) ----------------------------------------------------------

const slugDepth = (slug) => slug.split("/").length - 1;
export const parentSlugOf = (slug) => {
  const i = slug.lastIndexOf("/");
  return i === -1 ? null : slug.slice(0, i);
};
const leafOf = (slug) => slug.slice(slug.lastIndexOf("/") + 1);

export const orderCategoriesTopDown = (categories) =>
  [...categories].sort(
    (a, b) =>
      slugDepth(a.slug) - slugDepth(b.slug) || (a.position ?? 0) - (b.position ?? 0),
  );

export const categoryPayload = (record, parentId) => {
  const custom = [{ attribute_code: "url_key", value: leafOf(record.slug) }];
  if (record.description) {
    custom.push({ attribute_code: "description", value: record.description });
  }
  if (record.metaTags?.title) {
    custom.push({ attribute_code: "meta_title", value: record.metaTags.title });
  }
  if (record.metaTags?.description) {
    custom.push({ attribute_code: "meta_description", value: record.metaTags.description });
  }
  return {
    category: {
      parent_id: parentId ?? ROOT_CATEGORY_ID,
      name: record.name,
      is_active: true,
      include_in_menu: true,
      position: record.position ?? 0,
      custom_attributes: custom,
    },
  };
};

// ---- Product import item (the canonical DTO) -------------------------------------------

const IMPORT_DEFAULTS = {
  rootCategory: "Default Category",
  taxClass: "Taxable Goods",
  imageSizes: { base: "700x700", small: "300x300", thumbnail: "100x100" },
  websiteCodes: ["base"],
  stockWebsiteId: "1",
  referencePrice: "0",
  multiselectSep: "|",
};

// Full stock block (matches the sample import); we have no per-SKU inventory data.
const STOCK_SIMPLE = {
  out_of_stock_qty: "0", use_config_min_qty: "1", is_qty_decimal: "0",
  allow_backorders: "0", use_config_backorders: "1", min_cart_qty: "1",
  use_config_min_sale_qty: "1", max_cart_qty: "10000", use_config_max_sale_qty: "1",
  is_in_stock: "1", use_config_notify_stock_qty: "1", manage_stock: "1",
  use_config_manage_stock: "1", use_config_qty_increments: "1", qty_increments: "1",
  use_config_enable_qty_inc: "1", enable_qty_increments: "0", is_decimal_divided: "0",
  deferred_stock_update: "1", use_config_deferred_stock_update: "1",
};

const VISIBILITY_LABELS = new Map([
  ["", "Not Visible Individually"],
  ["SEARCH", "Search"],
  ["CATALOG", "Catalog"],
  ["CATALOG,SEARCH", "Catalog, Search"],
]);
const BOOL_MAP = { true: "Yes", false: "No" };

const visibilityLabel = (visibleIn) =>
  VISIBILITY_LABELS.get([...(visibleIn ?? [])].sort().join(",")) ??
  "Not Visible Individually";

const PLACEHOLD_SIZE = /(placehold\.co\/)\d+(?:x\d+)?/;
const sizedUrl = (url, size) => (url ? url.replace(PLACEHOLD_SIZE, `$1${size}`) : "");

const imageForRole = (images, role) =>
  images.find((img) => (img.roles ?? []).includes(role)) ?? images[0] ?? null;

// base/small/thumbnail (+ labels) sized per role, plus extras as additional_images.
const imageColumns = (product, sizes) => {
  const images = product.images ?? [];
  if (!images.length) return {};
  const defaultLabel = product.name ?? "";
  const cols = {};
  const used = [];
  for (const [roleName, key] of [
    ["BASE", "base"],
    ["SMALL", "small"],
    ["THUMBNAIL", "thumbnail"],
  ]) {
    const img = imageForRole(images, roleName);
    if (!img) continue;
    used.push(img);
    const col = key === "thumbnail" ? "thumbnail_image" : `${key}_image`;
    cols[col] = sizedUrl(img.url, sizes[key]);
    cols[`${col}_label`] = img.label ?? defaultLabel;
  }
  const extra = images.filter((i) => !used.includes(i));
  if (extra.length) {
    cols.additional_images = extra.map((i) => sizedUrl(i.url, sizes.base)).join(",");
    cols.additional_images_labels = extra.map((i) => i.label ?? defaultLabel).join(",");
  }
  return cols;
};

// slug 'brakes/pads' -> 'Default Category/Brakes/Brake Pads'.
const buildCategoryPaths = (categories, root) => {
  const nameOf = Object.fromEntries(categories.map((c) => [c.slug, c.name]));
  const paths = {};
  for (const c of categories) {
    const acc = [];
    const names = c.slug.split("/").map((seg) => {
      acc.push(seg);
      return nameOf[acc.join("/")] ?? seg;
    });
    paths[c.slug] = [root, ...names].join("/");
  }
  return paths;
};

// Domain attributes as `code=label|label,code2=label` — labels, not option ids.
const additionalAttributes = (product, sep) =>
  (product.attributes ?? [])
    .map((a) => {
      const vals =
        a.code === "sold_by_third_party" ? a.values.map((v) => BOOL_MAP[v] ?? v) : a.values;
      return `${a.code}=${vals.join(sep)}`;
    })
    .join(",");

const relatedSkus = (product) =>
  (product.links ?? [])
    .filter((l) => l.type === "related")
    .map((l) => l.sku)
    .join(",");

const childrenByParentMap = (products) => {
  const map = {};
  for (const p of products) {
    const parent = parentSkuOf(p);
    if (parent) (map[parent] ??= []).push(p);
  }
  return map;
};

const configurableVariations = (parent, childrenByParent) => {
  const axes = parent.configurations.map((c) => c.attributeCode);
  const parts = (childrenByParent[parent.sku] ?? []).map((child) => {
    const cattrs = Object.fromEntries((child.attributes ?? []).map((a) => [a.code, a.values]));
    const seg = [`sku=${child.sku}`];
    for (const ax of axes) if (cattrs[ax]?.length) seg.push(`${ax}=${cattrs[ax][0]}`);
    return seg.join(",");
  });
  const labels = parent.configurations
    .map((c) => `${c.attributeCode}=${c.label ?? c.attributeCode}`)
    .join(",");
  return [parts.join("|"), labels];
};

// Build the shared context toImportItem() needs. `overrides` (e.g. websiteCodes discovered
// at runtime) merge over IMPORT_DEFAULTS.
export const buildImportContext = (products, categories, prices, overrides = {}) => {
  const cfg = { ...IMPORT_DEFAULTS, ...overrides };
  const priceUsd = new Map();
  for (const row of prices) {
    if (row.priceBookId === "public-usd") priceUsd.set(row.sku, row.regular);
  }
  return {
    ...cfg,
    attributeSetName: ATTRIBUTE_SET_NAME,
    categoryPaths: buildCategoryPaths(categories, cfg.rootCategory),
    childrenByParent: childrenByParentMap(products),
    priceUsd,
  };
};

// The canonical Adobe Commerce import record for one product (string-valued, CSV-compatible).
export const toImportItem = (product, ctx) => {
  const config = isConfigurable(product);
  const reference = isReferenceVehicle(product);

  const item = {
    sku: product.sku,
    attribute_set_code: ctx.attributeSetName,
    product_type: config ? "configurable" : "simple",
    product_websites: ctx.websiteCodes.join(","),
    name: product.name,
    description: product.description ?? "",
    short_description: product.shortDescription ?? "",
    product_online: product.status === "ENABLED" ? "1" : "0",
    tax_class_name: ctx.taxClass,
    visibility: visibilityLabel(product.visibleIn),
    url_key: product.slug ?? "",
    save_rewrites_history: "1",
    meta_title: product.name,
    meta_description: product.shortDescription ?? "",
    msrp_display_actual_price_type: "Use config",
    additional_attributes: additionalAttributes(product, ctx.multiselectSep),
    website_id: ctx.stockWebsiteId,
    related_skus: relatedSkus(product),
    categories: (product.routes ?? [])
      .filter((r) => r.path in ctx.categoryPaths)
      .map((r) => ctx.categoryPaths[r.path])
      .join(","),
    ...imageColumns(product, ctx.imageSizes),
  };

  if (config) {
    item.is_in_stock = "1";
    item.manage_stock = "0";
    item.use_config_manage_stock = "1";
    const [variations, labels] = configurableVariations(product, ctx.childrenByParent);
    item.configurable_variations = variations;
    item.configurable_variation_labels = labels;
  } else {
    Object.assign(item, STOCK_SIMPLE);
    if (reference) {
      item.price = ctx.referencePrice;
      item.qty = "0";
      item.is_in_stock = "0";
    } else {
      item.price = `${ctx.priceUsd.get(product.sku) ?? ""}`;
      item.qty = String(DEFAULT_QTY);
    }
  }
  return item;
};

// Order simples/variants before configurable parents (safest import order).
export const orderForImport = (products) => [
  ...products.filter((p) => !isConfigurable(p)),
  ...products.filter(isConfigurable),
];

// ---- Prices (REST, after products exist) -----------------------------------------------

export const indexPricesBySku = (prices) => {
  const map = new Map();
  for (const row of prices) {
    if (!map.has(row.sku)) map.set(row.sku, {});
    map.get(row.sku)[row.priceBookId] = row;
  }
  return map;
};

const currencyScope = (currency, scopes) =>
  currency === "EUR" ? scopes.eur : scopes.usd;

// base-prices rows for one sku. Skips a currency whose scope is absent (e.g. no EUR website).
export const basePriceRowsForSku = (sku, booksForSku, scopes) => {
  const rows = [];
  for (const [bookId, meta] of Object.entries(PRICE_BOOK_ROLES)) {
    if (meta.role !== "base") continue;
    const record = booksForSku[bookId];
    const scope = currencyScope(meta.currency, scopes);
    if (!record || !scope) continue;
    rows.push({ sku, price: record.regular, store_id: scope.storeId });
  }
  return rows;
};

// tier-prices rows: VIP fixed (per website) + ALL GROUPS qty-tier discounts.
export const tierPriceRowsForSku = (sku, booksForSku, scopes) => {
  const rows = [];
  for (const [bookId, meta] of Object.entries(PRICE_BOOK_ROLES)) {
    const record = booksForSku[bookId];
    const scope = currencyScope(meta.currency, scopes);
    if (!record || !scope) continue;

    if (meta.role === "group") {
      rows.push({
        sku,
        price: record.regular,
        price_type: "fixed",
        website_id: scope.websiteId,
        customer_group: meta.customerGroup || VIP_GROUP_CODE,
        quantity: 1,
      });
    } else if (meta.role === "tiers") {
      for (const tier of record.tierPrices || []) {
        rows.push({
          sku,
          price: tier.percentage,
          price_type: "discount",
          website_id: scope.websiteId,
          customer_group: ALL_GROUPS,
          quantity: tier.qty,
        });
      }
    }
  }
  return rows;
};
