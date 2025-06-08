import {
  createClient,
  consoleLogger,
  LogLevel,
} from "@adobe-commerce/aco-ts-sdk";
import { loadConfig, readFile } from "./utils.js";

const BATCH_SIZE = 100;

const getBatchNumber = (index) => Math.floor(index / BATCH_SIZE) + 1;

const ingestMetadata = async (client) => {
  try {
    // Load product metadata from data/metadata.json file
    const metadata = readFile("metadata.json");
    const totalMetadata = metadata.length;
    let totalAccepted = 0;

    // Ingest product metadata in batches of 100
    for (let i = 0; i < totalMetadata; i += BATCH_SIZE) {
      const batch = metadata.slice(i, i + BATCH_SIZE);
      const batchNumber = getBatchNumber(i);
      console.info(
        `Ingesting metadata batch ${batchNumber} containing ${batch.length} items`
      );

      const response = await client.createProductMetadata(batch);
      totalAccepted += response.data.acceptedCount || 0;

      console.info(`Metadata batch ${batchNumber} response:`, response.data);
    }

    console.info(
      `Successfully ingested ${totalAccepted} out of ${totalMetadata} items`
    );
  } catch (error) {
    console.error("Error ingesting metadata:", error);
  }
};

const ingestProducts = async (client) => {
  try {
    // Load products from data/products.json file
    const products = readFile("products.json");
    const totalProducts = products.length;
    let totalAccepted = 0;

    // Ingest products in batches of 100
    for (let i = 0; i < totalProducts; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      const batchNumber = getBatchNumber(i);
      console.info(
        `Ingesting products batch ${batchNumber} containing ${batch.length} products`
      );

      const response = await client.createProducts(batch);
      totalAccepted += response.data.acceptedCount || 0;

      console.info(`Products batch ${batchNumber} response:`, response.data);
    }

    console.info(
      `Successfully ingested ${totalAccepted} out of ${totalProducts} products`
    );
  } catch (error) {
    console.error("Error ingesting products:", error);
  }
};

const ingestPriceBooks = async (client) => {
  try {
    // Load price books from data/pricebooks.json file
    const priceBooks = readFile("pricebooks.json");
    const totalPriceBooks = priceBooks.length;
    let totalAccepted = 0;

    // Ingest price books in batches of 100
    for (let i = 0; i < totalPriceBooks; i += BATCH_SIZE) {
      const batch = priceBooks.slice(i, i + BATCH_SIZE);
      const batchNumber = getBatchNumber(i);
      console.info(
        `Ingesting price books batch ${batchNumber} containing ${batch.length} price books`
      );

      const response = await client.createPriceBooks(batch);
      totalAccepted += response.data.acceptedCount || 0;

      console.info(`Price books batch ${batchNumber} response:`, response.data);
    }

    console.info(
      `Successfully ingested ${totalAccepted} out of ${totalPriceBooks} price books`
    );
  } catch (error) {
    console.error("Error ingesting price books:", error);
  }
};

const ingestPrices = async (client) => {
  try {
    // Load prices from data/prices.json file
    const prices = readFile("prices.json");
    const totalPrices = prices.length;
    let totalAccepted = 0;

    // Ingest prices in batches of 100
    for (let i = 0; i < totalPrices; i += BATCH_SIZE) {
      const batch = prices.slice(i, i + BATCH_SIZE);
      const batchNumber = getBatchNumber(i);
      console.info(
        `Ingesting prices batch ${batchNumber} containing ${batch.length} prices`
      );

      const response = await client.createPrices(batch);
      totalAccepted += response.data.acceptedCount || 0;

      console.info(`Prices batch ${batchNumber} response:`, response.data);
    }

    console.info(
      `Successfully ingested ${totalAccepted} out of ${totalPrices} prices`
    );
  } catch (error) {
    console.error("Error ingesting prices:", error);
  }
};

const main = async () => {
  const envConfig = loadConfig();
  const clientConfig = {
    credentials: {
      clientId: envConfig.clientId,
      clientSecret: envConfig.clientSecret,
    },
    tenantId: envConfig.tenantId,
    region: envConfig.region,
    environment: envConfig.environment,
    logger: consoleLogger(LogLevel.INFO),
  };

  const client = createClient(clientConfig);

  await ingestMetadata(client);
  await ingestProducts(client);
  await ingestPriceBooks(client);
  await ingestPrices(client);
};

main().catch(console.error);
