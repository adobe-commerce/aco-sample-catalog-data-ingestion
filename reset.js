import {
  createClient,
  consoleLogger,
  LogLevel,
} from "@adobe-commerce/aco-ts-sdk";
import { loadConfig, readFile } from "./utils.js";

const BATCH_SIZE = 100;

const getBatchNumber = (index) => Math.floor(index / BATCH_SIZE) + 1;

const deletePrices = async (client) => {
  try {
    // Delete prices loaded from data/prices.json file
    const prices = readFile("prices.json");
    const priceKeys = prices.map(({ sku, priceBookId }) => ({
      sku,
      priceBookId,
    }));
    const totalPrices = priceKeys.length;
    let totalAccepted = 0;

    // Delete prices in batches of 100
    for (let i = 0; i < totalPrices; i += BATCH_SIZE) {
      const batch = priceKeys.slice(i, i + BATCH_SIZE);
      const batchNumber = getBatchNumber(i);
      console.info(
        `Deleting prices batch ${batchNumber} containing ${batch.length} prices`
      );

      const response = await client.deletePrices(batch);
      totalAccepted += response.data.acceptedCount || 0;

      console.info(`Prices batch ${batchNumber} response:`, response.data);
    }

    console.info(
      `Successfully deleted ${totalAccepted} out of ${totalPrices} prices`
    );
  } catch (error) {
    console.error("Error deleting prices:", error);
  }
};

const deletePriceBooks = async (client) => {
  try {
    // Delete price books loaded from data/pricebooks.json file
    const priceBooks = readFile("pricebooks.json");
    const priceBookKeys = priceBooks.map(({ priceBookId }) => ({
      priceBookId,
    }));
    const totalPriceBooks = priceBookKeys.length;
    let totalAccepted = 0;

    // Delete price books in batches of 100
    for (let i = 0; i < totalPriceBooks; i += BATCH_SIZE) {
      const batch = priceBookKeys.slice(i, i + BATCH_SIZE);
      const batchNumber = getBatchNumber(i);
      console.info(
        `Deleting price books batch ${batchNumber} containing ${batch.length} price books`
      );

      const response = await client.deletePriceBooks(batch);
      totalAccepted += response.data.acceptedCount || 0;

      console.info(`Price books batch ${batchNumber} response:`, response.data);
    }

    console.info(
      `Successfully deleted ${totalAccepted} out of ${totalPriceBooks} price books`
    );
  } catch (error) {
    console.error("Error deleting price books:", error);
  }
};

const deleteProducts = async (client) => {
  try {
    // Delete products loaded from data/products.json file
    const products = readFile("products.json");
    const productKeys = products.map(({ sku, source }) => ({ sku, source }));
    const totalProducts = productKeys.length;
    let totalAccepted = 0;

    // Delete products in batches of 100
    for (let i = 0; i < totalProducts; i += BATCH_SIZE) {
      const batch = productKeys.slice(i, i + BATCH_SIZE);
      const batchNumber = getBatchNumber(i);
      console.info(
        `Deleting products batch ${batchNumber} containing ${batch.length} products`
      );

      const response = await client.deleteProducts(batch);
      totalAccepted += response.data.acceptedCount || 0;

      console.info(`Products batch ${batchNumber} response:`, response.data);
    }

    console.info(
      `Successfully deleted ${totalAccepted} out of ${totalProducts} products`
    );
  } catch (error) {
    console.error("Error deleting products:", error);
  }
};

const deleteMetadata = async (client) => {
  try {
    // Delete product metadata loaded from data/metadata.json file
    const metadata = readFile("metadata.json");
    const metadataKeys = metadata.map(({ code, source }) => ({ code, source }));
    const totalMetadata = metadataKeys.length;
    let totalAccepted = 0;

    // Delete product metadata in batches of 100
    for (let i = 0; i < totalMetadata; i += BATCH_SIZE) {
      const batch = metadataKeys.slice(i, i + BATCH_SIZE);
      const batchNumber = getBatchNumber(i);
      console.info(
        `Deleting metadata batch ${batchNumber} containing ${batch.length} items`
      );

      const response = await client.deleteProductMetadata(batch);
      totalAccepted += response.data.acceptedCount || 0;

      console.info(`Metadata batch ${batchNumber} response:`, response.data);
    }

    console.info(
      `Successfully deleted ${totalAccepted} out of ${totalMetadata} metadata items`
    );
  } catch (error) {
    console.error("Error deleting metadata:", error);
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

  await deletePrices(client);
  await deletePriceBooks(client);
  await deleteProducts(client);
  await deleteMetadata(client);
};

main().catch(console.error);
