import {
  createClient,
  consoleLogger,
  LogLevel,
} from "@adobe-commerce/aco-ts-sdk";
import { loadAcoConfig } from "../lib/env.js";
import { readData } from "../lib/data.js";

const BATCH_SIZE = 100;

const ingestProductMetadata = async (client) => {
  try {
    const metadata = readData("product_metadata.json");
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

const ingestCategoryMetadata = async (client) => {
  try {
    const metadata = readData("category_metadata.json");
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

const ingestProducts = async (client) => {
  try {
    const products = readData("products.json");
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

const ingestPriceBooks = async (client) => {
  try {
    const priceBooks = readData("pricebooks.json");
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

const ingestPrices = async (client) => {
  try {
    const prices = readData("prices.json");
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

const ingestCategories = async (client) => {
  try {
    const categories = readData("categories.json");
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

  await ingestProductMetadata(client);
  await ingestProducts(client);
  await ingestPriceBooks(client);
  await ingestPrices(client);
  await ingestCategoryMetadata(client);
  await ingestCategories(client);
};

const extra = process.argv.slice(2);
if (extra.length) {
  const help = extra.includes("--help") || extra.includes("-h");
  (help ? console.log : console.error)(
    "Usage: npm run ingest   (no options) — load data/*.json into ACO via the SDK",
  );
  process.exit(help ? 0 : 1);
}

main().catch(console.error);
