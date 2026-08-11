export const NATIVE_ATTRIBUTES = new Set(['sku', 'name', 'description', 'shortDescription', 'price']);

// frontend_input overrides; everything else custom -> "select" (Dropdown).
export const ATTRIBUTE_INPUT_OVERRIDES = {
  fitment: 'multiselect',
  make_fitment: 'multiselect',
  make_model_fitment: 'multiselect',
  sold_by_third_party: 'boolean',
};
export const DEFAULT_ATTRIBUTE_INPUT = 'select';

// ---- Attribute set / group -------------------------------------------------------------

export const ATTRIBUTE_SET_NAME = 'Carvelo';
export const ATTRIBUTE_GROUP_NAME = 'Carvelo Attributes';
export const SKELETON_ATTRIBUTE_SET_ID = 4; // clone from Default
export const ROOT_CATEGORY_ID = 2; // "Default Category"

// ---- Product defaults ------------------------------------------------------------------

export const DEFAULT_QTY = 100; // sellable simples (we have no per-SKU inventory data)

// ---- Customer groups -------------------------------------------------------------------

export const VIP_GROUP_CODE = 'VIP';
export const VIP_TAX_CLASS_ID = 3;
export const ALL_GROUPS = 'ALL GROUPS';

// ---- Websites / currencies -------------------------------------------------------------

export const USD_WEBSITE_CODE = process.env.AC_USD_WEBSITE_CODE || 'base';
export const EUR_WEBSITE_CODE = process.env.AC_EUR_WEBSITE_CODE || 'europe';

// ---- Price book -> Commerce scope roles ------------------------------------------------

export const PRICE_BOOK_ROLES = {
  'public-usd': { role: 'base', currency: 'USD' },
  'public-eur': { role: 'base', currency: 'EUR' },
  'vip-usd': { role: 'group', currency: 'USD', customerGroup: VIP_GROUP_CODE },
  'vip-eur': { role: 'group', currency: 'EUR', customerGroup: VIP_GROUP_CODE },
  'base-usd': { role: 'tiers', currency: 'USD' },
  'base-eur': { role: 'tiers', currency: 'EUR' },
};

// ---- Batch sizes -----------------------------------------------------------------------

export const PRICE_BATCH_SIZE = 500; // base-prices / tier-prices array endpoints
export const PRODUCT_CONCURRENCY = 8; // parallel deletes in reset.js
export const PRODUCT_IMPORT_BATCH_SIZE = 200;

// ---- Smoke slice -----------------------------------------------------------------------

export const SMOKE_SEED_SKUS = [
  'veh-aurora-flux', // configurable vehicle, reference-only, 2 axes (trim, year)
  'pad-aur-flu-2021', // configurable part, 1 axis (grade), fits the 2021 Aurora Flux
  'ctl-aur-flu-2021', // simple part, fits the 2021 Aurora Flux
];

export const resolveScopes = (websites, storeViews) => {
  const byCode = Object.fromEntries(websites.map(w => [w.code, w]));
  const usdWebsite = byCode[USD_WEBSITE_CODE];
  if (!usdWebsite) {
    throw new Error(
      `USD website '${USD_WEBSITE_CODE}' not found. Set AC_USD_WEBSITE_CODE or create it in Admin (Stores > All Stores).`,
    );
  }

  const eurWebsite = byCode[EUR_WEBSITE_CODE];
  const eurStore = eurWebsite && storeViews.find(s => Number(s.website_id) === Number(eurWebsite.id));

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

export const EUR_SETUP_HINT = [
  `Europe (EUR) website '${EUR_WEBSITE_CODE}' not found — loaded USD prices only.`,
  'To add EUR pricing: create a Europe website + store + store view in Admin',
  '(Stores > All Stores), set its base currency to EUR',
  '(Stores > Configuration > General > Currency Setup), then re-run `npm run ingest:paas`',
  '— it adds EUR prices without duplicating anything.',
].join(' ');

// ---- Locale -> store view (language scope) ---------------------------------------------

export const DEFAULT_LOCALE = 'en-US';

export const LOCALE_STORE_VIEWS = {
  'fr-FR': process.env.AC_FR_STORE_VIEW_CODE || 'fr_fr',
};

export const resolveStoreView = (locale, storeViews) => {
  if (locale === DEFAULT_LOCALE) return null;
  const code = LOCALE_STORE_VIEWS[locale];
  if (!code) return { missing: true, code: null };
  const found = (storeViews ?? []).some(s => s.code === code);
  return found ? { code } : { missing: true, code };
};

export const storeViewHint = (locale, code) =>
  [
    `Store view '${code ?? locale}' for locale '${locale}' not found -- skipped.`,
    'Create it in Admin (Stores > All Stores > Create Store View) under the Europe website,',
    'set its locale (Stores > Configuration > General > Locale Options) to the target language,',
    `then re-run with --locales=${locale}` + (code ? ` (or set the store-view env var to match its code).` : '.'),
  ].join(' ');
