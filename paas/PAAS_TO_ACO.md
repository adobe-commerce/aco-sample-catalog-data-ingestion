# PaaS → Commerce Optimizer

This guide loads the Carvelo catalog into **Adobe Commerce (PaaS)** so that the **Adobe Commerce Optimizer (ACO) connector** re-exports it into Commerce Optimizer.

**Note:** By default, the `ingest` command loads data for just the `default` store view. To ingest other store view data (to Commerce Optimizer Catalog Sources), such as French, use the `-- --locales=fr-FR` option.

`npm run ingest:paas` ingests data over the Adobe Commerce Admin REST API:

1. **Structure**: VIP customer group, attributes + options, the `Carvelo` attribute set, and categories (with descriptions / url keys).
2. **Products** via **`POST /V1/import/json`**: creates simples, configurables (via `configurable_variations`), and assigns categories. Attribute values are passed as labels, so there's no option-ID bookkeeping.
3. **Images**: each unique file is uploaded once via the media API, then a second `import/json` links the shared media path onto every product that uses it (see [Images](#images-upload-once-reference-many)).
4. **Prices**: USD base + VIP + quantity tiers (and EUR if an EUR website exists).

## Prerequisites

1. **Admin REST credentials** in `.env` (see the README's environment setup and `.env.dist`): `AC_BASE_URL`, `AC_ADMIN_API_USER`, `AC_ADMIN_API_PASSWORD`.
2. **(Optional) an EUR website** for multi-currency. The REST API does not create Websites/store views. To ingest the `fr-FR` catalog data in this repo, create an EUR website + store + store view in **Admin > Stores > All Stores**, set its base currency to EUR (Stores > Configuration > General > Currency Setup). Override the expected website codes with `AC_USD_WEBSITE_CODE` / `AC_EUR_WEBSITE_CODE`.
3. **(Optional) a store view per non-default locale** for localized content. Language (store view) and currency (website) are orthogonal: the **Europe** website carries base currency EUR and hosts the localized store views (ie `fr_fr`). Like websites, store views are Admin-only. Create one under the Europe website (**Admin > Stores > All Stores > Create Store View**) and set its locale (Stores > Configuration > General > Locale Options). Override the code with `AC_FR_STORE_VIEW_CODE` (default `fr_fr`).

## Localization (store views)

The dataset is authored per locale in `data/<locale>/`; identifiers and prices are identical across locales, only display text differs. `npm run ingest:paas` loads the **default locale**,`en-US`, to the `default` store view in PaaS, then writes each other locale's product and category **text** to its store view (a slim `store_view_code`-scoped `import/json` pass for products + store-scoped category updates). Structure, prices, and images are locale-invariant and loaded once.

```shell
npm run ingest:paas                              # en-US, full load at admin scope
AC_FR_STORE_VIEW_CODE=fr_fr \
  npm run ingest:paas -- --locales=fr-FR         # French text overrides onto the fr_fr store view
npm run ingest:paas -- --all-locales             # base load + every locale overlay in one run
```

The connector then exports one catalog source per store view. In Commerce Optimizer, each store view code will become a separate Catalog Source.

## Run it

Validate on a small slice first (structure is always created in full; `--smoke` only limits how many products are imported), then load everything:

```shell
npm run ingest:paas -- --smoke   # one vehicle line + a fitting part (+ variants) — verify first
npm run ingest:paas              # the full catalog (~2,446 products)
npm run reset:paas               # undo (products, categories, attribute set, attributes, VIP group)
```

**Re-runs are idempotent** — running `--smoke` then the full `ingest:paas`, for example, does not duplicate any data.

## How the data maps: data files → PaaS → connector

### Products & variants

Products from `data/{locale}/products.json` are imported into the Adobe Commerce PaaS catalog.

### Attributes

Attributes from `data/{locale}/product_metadata.json` are imported into the Adobe Commerce PaaS catalog under the `Carvelo` attribute set, with appropriate visibility settings.

### Categories

Categories from `data/{locale}/categories.json` are imported into the Adobe Commerce PaaS catalog. Products reference categories by **name path** (`Default Category/Brakes/Brake Pads`), not IDs.

### Images

Images from `data/{locale}/products.json` are retrieved via jsDelivr URLs, uploaded once to Commerce media, then linked by shared path. The jsDelivr URL never reaches ACO.

### Prices & price books

Prices from `data/{locale}/prices.json` are imported into the Adobe Commerce PaaS catalog using the default Adobe Commerce customer groups. A new `VIP` customer group is created and prices from the `vip-usd` price book are assigned to it.

  | `data` price book | role | Commerce mechanism | customer group |
  |---|---|---|---|
  | `public-usd` | base | `base-prices` (store scope) | (all) |
  | `vip-usd` | group | tier-price **fixed** | VIP |
  | `base-usd` | tiers | tier-price **discount** | ALL GROUPS |

## Validate

**In Adobe Commerce** — spot-check a few entities:

```bash
BASE="https://your-commerce-host"
TOKEN=$(curl -sS -X POST "$BASE/rest/V1/integration/admin/token" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR-PASSWORD"}' | tr -d '"')
AUTH=(-H "Authorization: Bearer $TOKEN")

# a configurable + its variations/links, and a variant's fitment
curl -sS "${AUTH[@]}" "$BASE/rest/V1/products/pad-aur-flu-2021" | jq '{type_id, extension_attributes}'
# base + tier prices for a variant
curl -sS -X POST "$BASE/rest/V1/products/base-prices-information" "${AUTH[@]}" \
  -H "Content-Type: application/json" -d '{"skus":["pad-aur-flu-2021-eco"]}' | jq
curl -sS -X POST "$BASE/rest/V1/products/tier-prices-information" "${AUTH[@]}" \
  -H "Content-Type: application/json" -d '{"skus":["pad-aur-flu-2021-eco"]}' | jq
# store scopes (note the EUR store id if you added an EUR website)
curl -sS "${AUTH[@]}" "$BASE/rest/V1/store/websites" | jq '.[] | {id, code}'
```

## CSV fallback (Admin import)

To import products through the Admin UI instead, the committed files in `paas/uploads/` are ready: **import attributes first, then products** (Admin > System > Data Transfer > Import, entity "Products"):

1. `paas/uploads/carvelo_attributes.json` — the attributes to create before importing.
2. `paas/uploads/carvelo_products.csv` — products (attribute set `Carvelo`, categories, configurable variations, image URLs).
