import {
  createClient,
  consoleLogger,
  LogLevel,
} from "@adobe-commerce/aco-ts-sdk";
import { loadAcoConfig } from "../lib/env.js";
import { readData } from "../lib/data.js";
import { parseLocaleArgs } from "../lib/locales.js";

const BATCH_SIZE = 100;

const deletePrices = async (client, locale) => {
  try {
    const keys = readData("prices.json", locale).map(
      ({ sku, priceBookId }) => ({
        sku,
        priceBookId,
      }),
    );
    let accepted = 0;
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const response = await client.deletePrices(keys.slice(i, i + BATCH_SIZE));
      accepted += response.data.acceptedCount || 0;
    }
    console.info(`Prices: deleted ${accepted} of ${keys.length}`);
  } catch (error) {
    console.error("Error deleting prices:", error);
  }
};

const deletePriceBooks = async (client, locale) => {
  try {
    const keys = readData("pricebooks.json", locale).map(({ priceBookId }) => ({
      priceBookId,
    }));
    let accepted = 0;
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const response = await client.deletePriceBooks(
        keys.slice(i, i + BATCH_SIZE),
      );
      accepted += response.data.acceptedCount || 0;
    }
    console.info(`Price books: deleted ${accepted} of ${keys.length}`);
  } catch (error) {
    console.error("Error deleting price books:", error);
  }
};

const deleteProducts = async (client, locale) => {
  try {
    const keys = readData("products.json", locale).map(({ sku, source }) => ({
      sku,
      source,
    }));
    let accepted = 0;
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const response = await client.deleteProducts(
        keys.slice(i, i + BATCH_SIZE),
      );
      accepted += response.data.acceptedCount || 0;
    }
    console.info(`Products: deleted ${accepted} of ${keys.length}`);
  } catch (error) {
    console.error("Error deleting products:", error);
  }
};

const deleteProductMetadata = async (client, locale) => {
  try {
    const keys = readData("product_metadata.json", locale).map(
      ({ code, source }) => ({
        code,
        source,
      }),
    );
    let accepted = 0;
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const response = await client.deleteProductMetadata(
        keys.slice(i, i + BATCH_SIZE),
      );
      accepted += response.data.acceptedCount || 0;
    }
    console.info(`Product metadata: deleted ${accepted} of ${keys.length}`);
  } catch (error) {
    console.error("Error deleting product metadata:", error);
  }
};

const deleteCategories = async (client, locale) => {
  try {
    const keys = readData("categories.json", locale).map(
      ({ slug, source }) => ({
        slug,
        source,
      }),
    );
    let accepted = 0;
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const response = await client.deleteCategories(
        keys.slice(i, i + BATCH_SIZE),
      );
      accepted += response.data.acceptedCount || 0;
    }
    console.info(`Categories: deleted ${accepted} of ${keys.length}`);
  } catch (error) {
    console.error("Error deleting categories:", error);
  }
};

const deleteCategoryMetadata = async (client, locale) => {
  try {
    const keys = readData("category_metadata.json", locale).map(
      ({ code, source }) => ({
        code,
        source,
      }),
    );
    let accepted = 0;
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const response = await client.deleteCategoryMetadata(
        keys.slice(i, i + BATCH_SIZE),
      );
      accepted += response.data.acceptedCount || 0;
    }
    console.info(`Category metadata: deleted ${accepted} of ${keys.length}`);
  } catch (error) {
    console.error("Error deleting category metadata:", error);
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

  for (const locale of parseLocaleArgs()) {
    console.info(`\n=== Resetting locale: ${locale} ===`);
    await deletePrices(client, locale);
    await deletePriceBooks(client, locale);
    await deleteProducts(client, locale);
    await deleteProductMetadata(client, locale);
    await deleteCategories(client, locale);
    await deleteCategoryMetadata(client, locale);
  }
};

const extra = process.argv.slice(2);
if (extra.includes("--help") || extra.includes("-h")) {
  console.log(
    "Usage: npm run reset [-- --locales=en-US,fr-FR | --all-locales]\n" +
      "  Deletes the ingested Carvelo data from ACO per locale (default: en-US).",
  );
  process.exit(0);
}

main().catch(console.error);
