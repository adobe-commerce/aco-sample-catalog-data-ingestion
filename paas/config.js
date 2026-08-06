// Static configuration and scope mapping for the Adobe Commerce (PaaS) ingestion path.
//
// This is the single place that encodes how the Carvelo ACO dataset maps onto Commerce
// concepts (attribute set, websites, customer groups, price books). Runtime-discovered
// values (website ids, store ids) are resolved by resolveScopes() below against the live
// GET /V1/store/websites + /V1/store/storeViews responses.

// ---- Attribute derivation (port of tmp/aco_to_magento_attributes.py) --------------------

// Fields the product import treats natively; never emitted as custom attributes.
export const NATIVE_ATTRIBUTES = new Set([
  "sku",
  "name",
  "description",
  "shortDescription",
  "price",
]);

// frontend_input overrides; everything else custom -> "select" (Dropdown).
export const ATTRIBUTE_INPUT_OVERRIDES = {
  fitment: "multiselect",
  sold_by_third_party: "boolean",
};
export const DEFAULT_ATTRIBUTE_INPUT = "select";

// ---- Attribute set / group -------------------------------------------------------------

export const ATTRIBUTE_SET_NAME = "Carvelo";
export const ATTRIBUTE_GROUP_NAME = "Carvelo Attributes";
export const SKELETON_ATTRIBUTE_SET_ID = 4; // clone from Default
export const ROOT_CATEGORY_ID = 2; // "Default Category"

// ---- Product defaults ------------------------------------------------------------------

export const DEFAULT_QTY = 100; // sellable simples (we have no per-SKU inventory data)

// ---- Customer groups -------------------------------------------------------------------

export const VIP_GROUP_CODE = "VIP";
export const VIP_TAX_CLASS_ID = 3;
export const ALL_GROUPS = "ALL GROUPS"; // Magento sentinel for qty tiers across all groups

// ---- Websites / currencies -------------------------------------------------------------
// Website *codes* are stable config; ids/store ids are resolved at runtime. Override the
// codes via env if the target instance names its websites differently.

export const USD_WEBSITE_CODE = process.env.AC_USD_WEBSITE_CODE || "base";
export const EUR_WEBSITE_CODE = process.env.AC_EUR_WEBSITE_CODE || "eur";

// ---- Price book -> Commerce scope roles ------------------------------------------------
// Each price book plays exactly one role so we never write a price twice:
//   public-* -> website base price       (POST /V1/products/base-prices)
//   vip-*    -> VIP customer-group price  (POST /V1/products/tier-prices, qty 1, fixed)
//   base-*   -> quantity-tier discounts   (POST /V1/products/tier-prices, ALL GROUPS, discount)
// (base-* and public-* carry identical `regular`; base-* is used only for its tierPrices.)
export const PRICE_BOOK_ROLES = {
  "public-usd": { role: "base", currency: "USD" },
  "public-eur": { role: "base", currency: "EUR" },
  "vip-usd": { role: "group", currency: "USD", customerGroup: VIP_GROUP_CODE },
  "vip-eur": { role: "group", currency: "EUR", customerGroup: VIP_GROUP_CODE },
  "base-usd": { role: "tiers", currency: "USD" },
  "base-eur": { role: "tiers", currency: "EUR" },
};

// ---- Batch sizes -----------------------------------------------------------------------

export const PRICE_BATCH_SIZE = 500; // base-prices / tier-prices array endpoints
export const PRODUCT_CONCURRENCY = 8; // parallel deletes in reset.js

// ---- Smoke slice -----------------------------------------------------------------------
// Seed SKUs for `--smoke`: one configurable vehicle line (trim x year), one configurable
// part (grade axis), one simple part. Selection expands to include each seed's VARIANT_OF
// children. Small but exercises every product shape + fitment + all price scopes.
export const SMOKE_SEED_SKUS = [
  "veh-aurora-flux", // configurable vehicle, reference-only, 2 axes (trim, year)
  "pad-aur-flu-2021", // configurable part, 1 axis (grade), fits the 2021 Aurora Flux
  "ctl-aur-flu-2021", // simple part, fits the 2021 Aurora Flux
];

// Resolve USD/EUR website+store ids from live store data. USD is required (the default
// `base` website always exists); EUR is optional — if its website (or a store view in it) is
// missing, `eur` is null and the caller loads USD-only and alerts the user. Returns
// { usd: {code, websiteId, storeId}, eur: {code, websiteId, storeId} | null }.
export const resolveScopes = (websites, storeViews) => {
  const byCode = Object.fromEntries(websites.map((w) => [w.code, w]));
  const usdWebsite = byCode[USD_WEBSITE_CODE];
  if (!usdWebsite) {
    throw new Error(
      `USD website '${USD_WEBSITE_CODE}' not found. Set AC_USD_WEBSITE_CODE or create it in Admin (Stores > All Stores).`,
    );
  }

  const eurWebsite = byCode[EUR_WEBSITE_CODE];
  const eurStore =
    eurWebsite &&
    storeViews.find((s) => Number(s.website_id) === Number(eurWebsite.id));

  // tierWebsiteId is the website scope for tier/customer-group prices. USD uses 0 ("all
  // websites"), which is valid under both Global and Website catalog price scope; EUR uses its
  // own website id (only meaningful under Website scope) so its currency-specific prices win.
  return {
    usd: {
      code: USD_WEBSITE_CODE,
      websiteId: Number(usdWebsite.id),
      storeId: 0,
      tierWebsiteId: 0,
    },
    eur: eurStore
      ? {
          code: EUR_WEBSITE_CODE,
          websiteId: Number(eurWebsite.id),
          storeId: Number(eurStore.id),
          tierWebsiteId: Number(eurWebsite.id),
        }
      : null,
  };
};

// Guidance printed when the EUR website is absent (USD-only load).
export const EUR_SETUP_HINT = [
  `EUR website '${EUR_WEBSITE_CODE}' not found — loaded USD prices only.`,
  "To add EUR pricing: create an EUR website + store + store view in Admin",
  "(Stores > All Stores), set its base currency to EUR",
  "(Stores > Configuration > General > Currency Setup), then re-run `npm run ingest:paas`",
  "— it adds EUR prices without duplicating anything.",
].join(" ");
