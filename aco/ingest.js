import { createClient, consoleLogger, LogLevel } from '@adobe-commerce/aco-ts-sdk';
import { loadAcoConfig } from '../lib/env.js';
import { readData } from '../lib/data.js';
import { parseLocaleArgs } from '../lib/locales.js';

const BATCH_SIZE = 100;

const getBatchNumber = index => Math.floor(index / BATCH_SIZE) + 1;

const ingestProductMetadata = async (client, locale) => {
  try {
    const metadata = readData('product_metadata.json', locale);
    let accepted = 0;
    for (let i = 0; i < metadata.length; i += BATCH_SIZE) {
      const batch = metadata.slice(i, i + BATCH_SIZE);
      const batchNumber = getBatchNumber(i);
      console.info(`Ingesting product metadata batch ${batchNumber} containing ${batch.length} items`);
      const response = await client.createProductMetadata(batch);
      accepted += response.data.acceptedCount || 0;
      console.info(`Product metadata batch ${batchNumber} response:`, response.data);
    }
    console.info(`Product metadata: ingested ${accepted} of ${metadata.length}`);
  } catch (error) {
    console.error('Error ingesting product metadata:', error);
  }
};

const ingestCategoryMetadata = async (client, locale) => {
  try {
    const metadata = readData('category_metadata.json', locale);
    let accepted = 0;
    for (let i = 0; i < metadata.length; i += BATCH_SIZE) {
      const batch = metadata.slice(i, i + BATCH_SIZE);
      const batchNumber = getBatchNumber(i);
      console.info(`Ingesting category metadata batch ${batchNumber} containing ${batch.length} items`);
      const response = await client.createCategoryMetadata(batch);
      accepted += response.data.acceptedCount || 0;
      console.info(`Category metadata batch ${batchNumber} response:`, response.data);
    }
    console.info(`Category metadata: ingested ${accepted} of ${metadata.length}`);
  } catch (error) {
    console.error('Error ingesting category metadata:', error);
  }
};

const ingestProducts = async (client, locale) => {
  try {
    const products = readData('products.json', locale);
    let accepted = 0;
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      const batchNumber = getBatchNumber(i);
      console.info(`Ingesting products batch ${batchNumber} containing ${batch.length} products`);
      const response = await client.createProducts(batch);
      accepted += response.data.acceptedCount || 0;
      console.info(`Products batch ${batchNumber} response:`, response.data);
    }
    console.info(`Products: ingested ${accepted} of ${products.length}`);
  } catch (error) {
    console.error('Error ingesting products:', error);
  }
};

const ingestPriceBooks = async (client, locale) => {
  try {
    const priceBooks = readData('pricebooks.json', locale);
    let accepted = 0;
    for (let i = 0; i < priceBooks.length; i += BATCH_SIZE) {
      const batch = priceBooks.slice(i, i + BATCH_SIZE);
      const batchNumber = getBatchNumber(i);
      console.info(`Ingesting price books batch ${batchNumber} containing ${batch.length} items`);
      const response = await client.createPriceBooks(batch);
      accepted += response.data.acceptedCount || 0;
      console.info(`Price books batch ${batchNumber} response:`, response.data);
    }
    console.info(`Price books: ingested ${accepted} of ${priceBooks.length}`);
  } catch (error) {
    console.error('Error ingesting price books:', error);
  }
};

const ingestPrices = async (client, locale) => {
  try {
    const prices = readData('prices.json', locale);
    let accepted = 0;
    for (let i = 0; i < prices.length; i += BATCH_SIZE) {
      const batch = prices.slice(i, i + BATCH_SIZE);
      const batchNumber = getBatchNumber(i);
      console.info(`Ingesting prices batch ${batchNumber} containing ${batch.length} items`);
      const response = await client.createPrices(batch);
      accepted += response.data.acceptedCount || 0;
      console.info(`Prices batch ${batchNumber} response:`, response.data);
    }
    console.info(`Prices: ingested ${accepted} of ${prices.length}`);
  } catch (error) {
    console.error('Error ingesting prices:', error);
  }
};

const ingestCategories = async (client, locale) => {
  try {
    const categories = readData('categories.json', locale);
    let accepted = 0;
    for (let i = 0; i < categories.length; i += BATCH_SIZE) {
      const batch = categories.slice(i, i + BATCH_SIZE);
      const batchNumber = getBatchNumber(i);
      console.info(`Ingesting categories batch ${batchNumber} containing ${batch.length} items`);
      const response = await client.createCategories(batch);
      accepted += response.data.acceptedCount || 0;
      console.info(`Categories batch ${batchNumber} response:`, response.data);
    }
    console.info(`Categories: ingested ${accepted} of ${categories.length}`);
  } catch (error) {
    console.error('Error ingesting categories:', error);
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
    // Categories before products: a product's routes must reference categories that
    // already exist (ACO does not create them from routes).
    await ingestProductMetadata(client, locale);
    await ingestCategoryMetadata(client, locale);
    await ingestCategories(client, locale);
    await ingestProducts(client, locale);
    await ingestPriceBooks(client, locale);
    await ingestPrices(client, locale);
  }
};

const extra = process.argv.slice(2);
if (extra.includes('--help') || extra.includes('-h')) {
  console.log(
    'Usage: npm run ingest [-- --locales=en-US,fr-FR | --all-locales]\n' +
      '  Loads data/<locale>/*.json into ACO via the SDK (default locale: en-US).',
  );
  process.exit(0);
}

main().catch(console.error);
