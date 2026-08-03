# PaaS → Commerce Optimizer

Load the Carvelo catalog into **Adobe Commerce (PaaS)** so the **Adobe Commerce Optimizer (ACO)
connector** re-exports it into Commerce Optimizer. Use this to demo the full
PaaS → connector → ACO pipeline. (To load straight into ACO instead, see
[`aco/ACO_DIRECT.md`](../aco/ACO_DIRECT.md).)

`npm run ingest:paas` does everything in one synchronous pass — no Admin UI round-trip:

1. **Structure** via REST — VIP customer group, attributes + options, the `Carvelo` attribute
   set, and categories (with descriptions / url keys).
2. **Products** via **`POST /V1/import/json`** — one request; the importer creates simples,
   configurables (via `configurable_variations`), assigns categories, and **downloads the image
   URLs**. Attribute values are passed as labels, so there's no option-ID bookkeeping.
3. **Prices** via REST — USD base + VIP + quantity tiers (and EUR if an EUR website exists).

## Prerequisites

1. **Admin REST credentials** in `.env` (see the README's environment setup and `.env.dist`):
   `AC_BASE_URL`, `AC_ADMIN_API_USER`, `AC_ADMIN_API_PASSWORD`.
2. **(Optional) an EUR website** for multi-currency. Websites/store views are the one thing the
   REST API can't create (the Store API is read-only), so the tool **doesn't require it** — on a
   fresh instance it loads USD (the default `base` website always exists) + VIP + tiers, then
   prints how to add EUR. To enable it: create an EUR website + store + store view in **Admin >
   Stores > All Stores**, set its base currency to EUR (Stores > Configuration > General >
   Currency Setup), then re-run — it adds EUR prices without duplicating anything. Override the
   expected website codes with `AC_USD_WEBSITE_CODE` / `AC_EUR_WEBSITE_CODE`.

No message-queue consumers are needed — the import is synchronous.

## Run it

Validate on a small slice first (structure is always created in full; `--smoke` only limits how
many products are imported), then load everything:

```shell
npm run ingest:paas -- --smoke   # one vehicle line + a fitting part (+ variants) — verify first
npm run ingest:paas              # the full catalog (~2,446 products)
npm run reset:paas               # undo (products, categories, attribute set, attributes, VIP group)
```

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

Also confirm the product images downloaded (check a product's media in Admin).

**In Commerce Optimizer (connector output)** — after the connector syncs: one **catalog source
per store view**, and price books named `<website>::<SHA1 of customer group id>`. Confirm a chosen
vehicle filters parts by `fitment`. Connector setup: Experience League —
[get started](https://experienceleague.adobe.com/en/docs/commerce/aco-optimizer-connector/get-started),
[sync pipeline](https://experienceleague.adobe.com/en/docs/commerce/aco-optimizer-connector/connector-sync-pipeline).

Then configure catalog views and policies in ACO — see the README's
["Configure Commerce Optimizer"](../README.md#configure-commerce-optimizer) section.

## CSV fallback (Admin import)

To import products through the Admin UI instead, the committed files in `paas/uploads/` are ready —
**import attributes first, then products** (Admin > System > Data Transfer > Import, entity
"Products"):

1. `paas/uploads/carvelo_attributes.json` — the attributes to create before importing.
2. `paas/uploads/carvelo_products.csv` — products (attribute set `Carvelo`, categories,
   configurable variations, image URLs).

Regenerate both after changing the catalog with `npm run generate:paas:uploads`. VIP / EUR /
quantity-tier prices still come from `npm run ingest:paas`.

## Serving images through a CDN (image base URL)

The dataset's image URLs point at jsDelivr for the ACO-direct path. On the PaaS path the import
**downloads** images into Adobe Commerce media, and the connector then exports the **Adobe
Commerce media URL** to ACO. To control that URL:

- **Admin:** Stores > Configuration > General > Web > **Base URLs (Secure)** → *Base URL for User
  Media Files*.
- **CLI:** `bin/magento config:set web/{unsecure,secure}/base_media_url "https://cdn.example.com/media/"`
  then `bin/magento cache:flush`.

The CDN at that base must front Adobe Commerce's `pub/media`. On **Adobe Commerce Cloud**, Fastly
already does this. After changing the media base URL, **re-sync** the connector so ACO picks up the
new URLs.

> **Verify once:** confirm the REST import downloads remote image URLs on your instance (it uses
> the same engine as the Admin import, so it should) by checking a product's media after the
> `--smoke` run. If it doesn't, stage the images under `var/import/images` and set
> `import_images_file_dir`.

## Reference

Endpoints/payloads follow the Adobe Commerce 2.4.x
[Admin REST API](https://developer.adobe.com/commerce/webapi/reference/rest/paas). Products use
[`POST /V1/import/json`](https://developer.adobe.com/commerce/webapi/rest/modules/import/) — the
request shape is in `paas/client.js` (`importJson`) and the item mapping in `paas/dto.js`
(`toImportItem`).
