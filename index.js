import { createClient } from "@adobe-commerce/aco-ts-sdk";
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

config();

const BATCH_SIZE = 100;

const requiredEnvVars = [
  "CLIENT_ID",
  "CLIENT_SECRET",
  "TENANT_ID",
  "REGION",
  "ENVIRONMENT",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const readFile = (dirName) => {
  const filePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "data",
    dirName
  );
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const getBatchNumber = (index) => Math.floor(index / BATCH_SIZE) + 1;

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
      console.log(
        `Ingesting products batch ${batchNumber} containing ${batch.length} products`
      );

      const response = await client.createProducts(batch);
      totalAccepted += response.data.acceptedCount || 0;

      console.log(`Products batch ${batchNumber} response:`, response.data);
    }

    console.log(
      `Successfully ingested ${totalAccepted} out of ${totalProducts} products`
    );
  } catch (error) {
    console.error("Error ingesting products:", error);
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
      console.log(
        `Ingesting prices batch ${batchNumber} containing ${batch.length} prices`
      );

      const response = await client.createPrices(batch);
      totalAccepted += response.data.acceptedCount || 0;

      console.log(`Prices batch ${batchNumber} response:`, response.data);
    }

    console.log(
      `Successfully ingested ${totalAccepted} out of ${totalPrices} prices`
    );
  } catch (error) {
    console.error("Error ingesting prices:", error);
  }
};

const main = async () => {
  const config = {
    credentials: {
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
    },
    tenantId: process.env.TENANT_ID,
    region: process.env.REGION,
    environment: process.env.ENVIRONMENT,
  };

  const client = createClient(config);

  await ingestProducts(client);
  await ingestPrices(client);
};

main().catch(console.error);
