# ACO direct

Load the Carvelo catalog straight into **Adobe Commerce Optimizer (ACO)** via the
`@adobe-commerce/aco-ts-sdk`. This is the simplest path — no Adobe Commerce (PaaS) instance
involved. (To load through Adobe Commerce so the connector re-exports it, see
[`paas/PAAS_TO_ACO.md`](../paas/PAAS_TO_ACO.md).)

## Prerequisites

ACO IMS credentials + tenant in `.env` (`CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`, `REGION`,
`ENVIRONMENT`) — see the README's environment setup and `.env.dist`.

## Run it

```shell
npm run ingest      # load all data/*.json into the configured ACO instance
npm run reset       # delete the ingested data
```

`ingest` sends each entity in dependency order (product metadata → products → price books →
prices → category metadata → categories), batching 100 records per call and tallying
`acceptedCount`. Products are one feed containing both configurable parents and their
`VARIANT_OF` variants; ACO resolves the relationships from the `configurations` /
`variantReferenceId` data, so batch ordering doesn't matter.

Expected output:

```shell
> npm run ingest
Product metadata: ingested 22 of 22
Products: ingested 2446 of 2446
Price books: ingested 6 of 6
Prices: ingested 10158 of 10158
Category metadata: ingested 0 of 0
Categories: ingested 34 of 34
```

## Validate

- Every entity reports `ingested N of N` (no errors logged).
- In the ACO catalog, a configurable vehicle (e.g. `veh-aurora-flux`) resolves to its trim × year
  variants, and a configurable part (e.g. `pad-aur-flu-2021`) resolves to its grade variants.
- Filtering parts by the `fitment` attribute returns the parts that fit a chosen vehicle.
- Vehicles are marked `object_type: "vehicle"` and are visible/indexed so the vehicle-picker view
  can query them; parts are `object_type: "part"`. Policies separate the two (see below).

Then configure catalog views and policies in the ACO UI to filter the base catalog — including the
shop-by-vehicle `object_type` policies and the `AC-Policy-Vehicle` fitment trigger — see the
README's ["Create catalog views and policies"](../README.md#create-catalog-views-and-policies) section.

## Adapting with your own data

Replace the contents of `data/*.json`. The SDK entity types (`FeedProduct`, `FeedProductMetadata`,
`FeedPricebook`, `FeedPrices`, `FeedCategory`, …) and the `create*` / `delete*` client methods are
documented in the README's ["Explore the SDK"](../README.md#explore-the-sdk) section and the SDK's
[`types.ts`](https://github.com/adobe-commerce/aco-ts-sdk/blob/main/src/types.ts).
