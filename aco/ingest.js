import {
  createClient,
  consoleLogger,
  LogLevel,
} from "@adobe-commerce/aco-ts-sdk";
import { loadAcoConfig } from "../lib/env.js";
import { readData } from "../lib/data.js";
import { parseLocaleArgs } from "../lib/locales.js";

const BATCH_SIZE = 100;

const ingestProductMetadata = async (client, locale) => {
  try {
    const metadata = readData("product_metadata.json", locale);
    let accepted = 0;
    for (let i = 0; i < metadata.length; i += BATCH_SIZE) {
      const response = await client.createProductMetadata(
        metadata.slice(i, i + BATCH_SIZE),
      );
      accepted += response.data.acceptedCount || 0;
    }
    console.info(
      `Product metadata: ingested ${accepted} of ${metadata.length}`,
    );
  } catch (error) {
    console.error("Error ingesting product metadata:", error);
  }
};

const ingestCategoryMetadata = async (client, locale) => {
  try {
    const metadata = readData("category_metadata.json", locale);
    let accepted = 0;
    for (let i = 0; i < metadata.length; i += BATCH_SIZE) {
      const response = await client.createCategoryMetadata(
        metadata.slice(i, i + BATCH_SIZE),
      );
      accepted += response.data.acceptedCount || 0;
    }
    console.info(
      `Category metadata: ingested ${accepted} of ${metadata.length}`,
    );
  } catch (error) {
    console.error("Error ingesting category metadata:", error);
  }
};

const ingestProducts = async (client, locale) => {
  try {
    const products = readData("products.json", locale);
    let accepted = 0;
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const response = await client.createProducts(
        products.slice(i, i + BATCH_SIZE),
      );
      accepted += response.data.acceptedCount || 0;
    }
    console.info(`Products: ingested ${accepted} of ${products.length}`);
  } catch (error) {
    console.error("Error ingesting products:", error);
  }
};

const ingestPriceBooks = async (client, locale) => {
  try {
    const priceBooks = readData("pricebooks.json", locale);
    let accepted = 0;
    for (let i = 0; i < priceBooks.length; i += BATCH_SIZE) {
      const response = await client.createPriceBooks(
        priceBooks.slice(i, i + BATCH_SIZE),
      );
      accepted += response.data.acceptedCount || 0;
    }
    console.info(`Price books: ingested ${accepted} of ${priceBooks.length}`);
  } catch (error) {
    console.error("Error ingesting price books:", error);
  }
};

const ingestPrices = async (client, locale) => {
  try {
    const prices = readData("prices.json", locale);
    let accepted = 0;
    for (let i = 0; i < prices.length; i += BATCH_SIZE) {
      const response = await client.createPrices(
        prices.slice(i, i + BATCH_SIZE),
      );
      accepted += response.data.acceptedCount || 0;
    }
    console.info(`Prices: ingested ${accepted} of ${prices.length}`);
  } catch (error) {
    console.error("Error ingesting prices:", error);
  }
};

const ingestCategories = async (client, locale) => {
  try {
    const categories = readData("categories.json", locale);
    let accepted = 0;
    for (let i = 0; i < categories.length; i += BATCH_SIZE) {
      const response = await client.createCategories(
        categories.slice(i, i + BATCH_SIZE),
      );
      accepted += response.data.acceptedCount || 0;
    }
    console.info(`Categories: ingested ${accepted} of ${categories.length}`);
  } catch (error) {
    console.error("Error ingesting categories:", error);
  }
};

const main = async () => {
  const env = loadAcoConfig();
  const client = createClient({
    credentials: { clientId: env.clientId, clientSecret: env.clientSecret },
    tenantId: env.tenantId,
    region: env.region,
    environment: env.environment,
    logger: consoleLogger(LogLevel.INFO),
  });

  // Each locale is a separate catalog source in ACO (its own index), so the full
  // feed is (re)sent per locale, each record stamped with its own source.locale.
  for (const locale of parseLocaleArgs()) {
    console.info(`\n=== Ingesting locale: ${locale} ===`);
    await ingestProductMetadata(client, locale);
    await ingestProducts(client, locale);
    await ingestPriceBooks(client, locale);
    await ingestPrices(client, locale);
    await ingestCategoryMetadata(client, locale);
    await ingestCategories(client, locale);
  }
};

const extra = process.argv.slice(2);
if (extra.includes("--help") || extra.includes("-h")) {
  console.log(
    "Usage: npm run ingest [-- --locales=en-US,fr-FR | --all-locales]\n" +
      "  Loads data/<locale>/*.json into ACO via the SDK (default locale: en-US).",
  );
  process.exit(0);
}

main().catch(console.error);
