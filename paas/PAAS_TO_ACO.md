# PaaS → Commerce Optimizer

Load the Carvelo catalog into **Adobe Commerce (PaaS)** so the **Adobe Commerce Optimizer (ACO)
connector** re-exports it into Commerce Optimizer. Use this to demo the full
PaaS → connector → ACO pipeline. (To load straight into ACO instead, see
[`aco/ACO_DIRECT.md`](../aco/ACO_DIRECT.md).)

`npm run ingest:paas` does everything over REST — no Admin UI round-trip:

1. **Structure** via REST — VIP customer group, attributes + options, the `Carvelo` attribute
   set, and categories (with descriptions / url keys).
2. **Products** via **`POST /V1/import/json`** — creates simples, configurables (via
   `configurable_variations`), and assigns categories. Attribute values are passed as labels, so
   there's no option-ID bookkeeping.
3. **Images** — each unique file is uploaded once via the media API, then a second `import/json`
   links the shared media path onto every product that uses it (see
   [Images](#images-upload-once-reference-many)).
4. **Prices** via REST — USD base + VIP + quantity tiers (and EUR if an EUR website exists).

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

**Re-runs are idempotent** — running `--smoke` then the full load (or the same command twice) does
not duplicate anything: products upsert by SKU (`behavior: append`), prices upsert by SKU + scope,
and attributes / attribute set / categories are reused if they already exist. So `--smoke` → full
is safe, and re-running after adding an EUR website just adds the EUR prices.

## How the data maps: data files → PaaS → connector

Three layers, and they deliberately **don't share names**. What you author in `data/*.json` is the
**ACO model**; the PaaS ingest translates it into **Adobe Commerce** primitives; the connector then
re-derives an **ACO feed** from those primitives on its own terms. The connector never sees
`data/*.json` — only what landed in Commerce. (The direct path in
[`aco/ACO_DIRECT.md`](../aco/ACO_DIRECT.md) skips the middle layer and loads the ACO model as-is,
which is why some names match there but not here.)

### Products & variants
- **Data:** products with optional `configurations` (configurable axes) and `links` of type
  `VARIANT_OF`; `visibleIn` controls visibility.
- **PaaS:** `buildImportItem` emits `product_type` `simple`/`configurable`, wires variants via
  `configurable_variations` (labels, not option IDs), and maps `visibleIn` → Commerce `visibility`.
- **Connector → ACO:** exports each individually-visible product; variants resolve through their
  parent. Reference vehicles are marked `object_type=vehicle` and are visible/indexed (so the
  vehicle-picker view can query them), but `buildImportItem` imports them out-of-stock with a `0`
  price — never purchasable — and an ACO `object_type EQUALS part` policy keeps them out of the
  shopper storefront (no PDP). See the README's shop-by-vehicle policies/views.

### Attributes
- **Data:** custom attribute codes in snake_case (`fitment`, `part_category`, `object_type`, …)
  with values.
- **PaaS:** `deriveAttributeSpec` creates the attributes + inline options (as **labels**) and the
  `Carvelo` attribute set, mirroring the ACO metadata's filterable/searchable flags onto the
  Commerce attributes (so they work as ACO facets and policy attributes); import items carry values
  as labels in `additional_attributes`. Re-runs `PUT` those flags onto already-created attributes.
- **Connector → ACO:** Product Attributes feed. Native/system attributes aren't exported — that's
  why the feed shows e.g. **93 of ~100**, not a failure.

### Categories
- **Data:** `categories.json` slugs + names; products reference them via `routes`.
- **PaaS:** created top-down by name path; import items reference categories by **name path**
  (`Default Category/Brakes/Brake Pads`), not IDs.
- **Connector → ACO:** Category feed (root/default aren't exported, so 34 of 36 is expected).

### Images
- **Data:** jsDelivr URLs on each product's `images`.
- **PaaS:** uploaded once to Commerce media, then linked by shared path — see
  [Images](#images-upload-once-reference-many). The jsDelivr URL never reaches ACO.
- **Connector → ACO:** exports the **Commerce media URL** (`base_media_url` + dispersion path).

### Prices & price books — *the one that surprises people*
- **Data:** `prices.json` rows keyed by **your** `priceBookId` — `public-usd`, `vip-usd`,
  `base-usd`.
- **PaaS:** `PRICE_BOOK_ROLES` maps each to a Commerce price mechanism (not to a named book):

  | `data` price book | role | Commerce mechanism | customer group |
  |---|---|---|---|
  | `public-usd` | base | `base-prices` (store scope) | (all) |
  | `vip-usd` | group | tier-price **fixed** | VIP |
  | `base-usd` | tiers | tier-price **discount** | ALL GROUPS |

  (Under a **Global** catalog price scope, tier prices use `website_id: 0`; the ingest handles this
  via `scope.tierWebsiteId`.)
- **Connector → ACO:** the connector **ignores your price-book IDs** and manufactures one price book
  per **(website × customer group)**, named **`<website_code>::<SHA1(customer_group_id)>`** and
  displayed as *`<Group Name> (<Website>)`*, plus a website-level `<website_code>` book. So a
  USD-only instance shows **6 books** — `base` plus one per customer group: NOT LOGGED IN (`SHA1("0")`),
  General (`SHA1("1")`), Wholesale (`SHA1("2")`), Retailer (`SHA1("3")`), VIP (`SHA1("4")`). The four
  built-ins ship with Commerce; only **VIP** is created by our ingest. Your `public-usd` / `vip-usd`
  / `base-usd` names live **only on the [ACO-direct path](../aco/ACO_DIRECT.md)** — they never appear
  here. In ACO, allow the books you want (typically `base` + VIP) and map them to policies.

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

Also confirm images are attached — a product's *Images and Videos* tab in Admin, or
`GET /V1/products/{sku}/media`.

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

## Images: upload once, reference many

**`POST /V1/import/json` does not download remote URLs** — verified on a live instance: passing
jsDelivr URLs in the image columns leaves the media gallery empty (no error, no image). So images
are a dedicated step (`attachImages` in `paas/ingest.js`):

1. **Upload each unique file once** via `POST /V1/products/{sku}/media` (base64). The ingest script
   `fetch`es each jsDelivr URL to get the bytes, so the repo must be pushed and the URLs must
   resolve (`curl -sSI <url> | head -1` → `HTTP/2 200`). The catalog has ~2,000 products but only
   ~37 distinct images → ~37 uploads, not 2,000.
2. **Link the shared media path** onto every other product. Commerce stores a file at a
   deterministic dispersion path (`brake-pads-eco.png` → `/b/r/brake-pads-eco.png`); a second
   `import/json` pass sets `base_image` / `small_image` / `thumbnail_image` to that path, so
   products **share one file** rather than each storing a copy. Verify after `--smoke`:
   `find pub/media/catalog/product -type f | grep -v /cache/` should list ~37 originals with **no
   `_1` suffixes**.

`--image-put` switches step 2 to per-product `PUT`s of the image roles instead of the second import
— guaranteed no duplicate files, but one call per product. Use it only if your instance's importer
*copies* an existing media path instead of *linking* it. Reference vehicles have no images and are
skipped.

**Serving (`base_media_url`) — a separate concern, and NOT jsDelivr.** Once uploaded, the images
live in Commerce media, and the connector exports the **Commerce media URL** to ACO. That URL comes
from Commerce's *Base URL for User Media Files*, which must front `pub/media` — so it **cannot** be
the jsDelivr base (jsDelivr serves `…/data/images/…`, not `…/media/catalog/product/…`; pointing it
there would produce broken URLs). Leave it default, or set it to a CDN that fronts your `pub/media`:

- **Admin:** Stores > Configuration > General > Web > **Base URLs (Secure)** → *Base URL for User
  Media Files*.
- **CLI:** `bin/magento config:set web/{unsecure,secure}/base_media_url "https://<your-media-cdn>/media/"`
  then `bin/magento cache:flush`.

On **Adobe Commerce Cloud**, Fastly already fronts media — no change needed. After changing the
media base URL, **re-sync** the connector so ACO picks up the new URLs.

## Reference

Endpoints/payloads follow the Adobe Commerce 2.4.x
[Admin REST API](https://developer.adobe.com/commerce/webapi/reference/rest/paas). Products use
[`POST /V1/import/json`](https://developer.adobe.com/commerce/webapi/rest/modules/import/) — the
request shape is in `paas/client.js` (`importJson`) and the item mapping in `paas/dto.js`
(`buildImportItem`).
