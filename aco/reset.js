import {
  createClient,
  consoleLogger,
  LogLevel,
} from "@adobe-commerce/aco-ts-sdk";
import { loadAcoConfig } from "../lib/env.js";
import { readData } from "../lib/data.js";

const BATCH_SIZE = 100;

const deletePrices = async (client) => {
  try {
    const keys = readData("prices.json").map(({ sku, priceBookId }) => ({
      sku,
      priceBookId,
    }));
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

const deletePriceBooks = async (client) => {
  try {
    const keys = readData("pricebooks.json").map(({ priceBookId }) => ({
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

const deleteProducts = async (client) => {
  try {
    const keys = readData("products.json").map(({ sku, source }) => ({
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

const deleteProductMetadata = async (client) => {
  try {
    const keys = readData("product_metadata.json").map(({ code, source }) => ({
      code,
      source,
    }));
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

const deleteCategories = async (client) => {
  try {
    const keys = readData("categories.json").map(({ slug, source }) => ({
      slug,
      source,
    }));
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

const deleteCategoryMetadata = async (client) => {
  try {
    const keys = readData("category_metadata.json").map(({ code, source }) => ({
      code,
      source,
    }));
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

  await deletePrices(client);
  await deletePriceBooks(client);
  await deleteProducts(client);
  await deleteProductMetadata(client);
  await deleteCategories(client);
  await deleteCategoryMetadata(client);
};

const extra = process.argv.slice(2);
if (extra.length) {
  const help = extra.includes("--help") || extra.includes("-h");
  (help ? console.log : console.error)(
    "Usage: npm run reset   (no options) — delete the ingested Carvelo data from ACO",
  );
  process.exit(help ? 0 : 1);
}

main().catch(console.error);
