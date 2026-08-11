// Tear down the Carvelo catalog in Adobe Commerce (PaaS): products -> categories ->
// attribute set -> attributes -> VIP group. Websites/store-views are left in place.
// --smoke deletes only the smoke slice's products. See PAAS_TO_ACO.md.

import { loadPaasConfig } from '../lib/env.js';
import { readData } from '../lib/data.js';
import { PaasClient, mapWithConcurrency } from './client.js';
import { ATTRIBUTE_SET_NAME, VIP_GROUP_CODE, PRODUCT_CONCURRENCY, SMOKE_SEED_SKUS, DEFAULT_LOCALE } from './config.js';
import { isConfigurable, selectSmoke, deriveAttributeSpec } from './dto.js';

const printSection = title => console.info(`\n=== ${title} ===`);

const USAGE = `Usage: npm run reset:paas [-- <options>]

Delete the Carvelo catalog from Adobe Commerce (PaaS). With no options, deletes products,
categories, the attribute set, attributes, and the VIP group. Websites/store views are left
in place.

  --smoke        delete only the smoke slice's products (structure kept)
  --help         show this help

Note: deletion is whole-catalog (a SKU carries all its store-view scopes), so --locales /
--all-locales are accepted but have no effect here.`;

const parseArgs = argv => {
  const args = { smoke: false };
  for (const a of argv.slice(2)) {
    if (a === '--help' || a === '-h') {
      console.log(USAGE);
      process.exit(0);
    } else if (a === '--smoke') args.smoke = true;
    else if (a === '--all-locales' || a.startsWith('--locales=')) {
      // Accepted for symmetry with ingest; deletion is locale-invariant (see note above).
    } else {
      console.error(`Unknown option: ${a}\n\n${USAGE}`);
      process.exit(1);
    }
  }
  return args;
};

const deleteProducts = async (client, products) => {
  printSection(`Delete products (${products.length})`);
  let ok = 0;
  let failed = 0;
  const delOne = async p => {
    try {
      await client.del(`/V1/products/${encodeURIComponent(p.sku)}`, {
        tolerate: [404],
      });
      ok++;
    } catch (err) {
      failed++;
      console.error(`  ${p.sku}: ${err.message}`);
    }
  };
  await mapWithConcurrency(products.filter(isConfigurable), PRODUCT_CONCURRENCY, delOne);
  await mapWithConcurrency(
    products.filter(p => !isConfigurable(p)),
    PRODUCT_CONCURRENCY,
    delOne,
  );
  console.info(`Products: ${ok} deleted (or already gone), ${failed} failed.`);
};

// Delete our top-level categories by id; Commerce cascades the subtree.
const deleteCategories = async (client, categories) => {
  printSection('Delete categories');
  try {
    const topSlugs = new Set(categories.map(c => c.slug).filter(s => !s.includes('/')));
    const tree = await client.get('/V1/categories'); // full tree from the default root
    const rootChildren = tree?.children_data ?? [];
    // Match top-level Carvelo categories by name.
    const namesBySlug = new Map(categories.filter(c => !c.slug.includes('/')).map(c => [c.name, c.slug]));
    let deleted = 0;
    for (const child of rootChildren) {
      if (namesBySlug.has(child.name) && topSlugs.has(namesBySlug.get(child.name))) {
        await client.del(`/V1/categories/${child.id}`, { tolerate: [404] });
        deleted++;
      }
    }
    console.info(`Deleted ${deleted} top-level categories (subtrees cascaded).`);
  } catch (err) {
    console.error(`Category deletion failed: ${err.message}`);
  }
};

const deleteAttributeSet = async client => {
  printSection('Delete attribute set');
  try {
    const params = new URLSearchParams({
      'searchCriteria[filterGroups][0][filters][0][field]': 'attribute_set_name',
      'searchCriteria[filterGroups][0][filters][0][value]': ATTRIBUTE_SET_NAME,
    });
    const list = await client.get(`/V1/products/attribute-sets/sets/list?${params}`);
    const setId = list?.items?.[0]?.attribute_set_id;
    if (!setId) {
      console.info(`Attribute set '${ATTRIBUTE_SET_NAME}' not found.`);
      return;
    }
    await client.del(`/V1/products/attribute-sets/${setId}`, {
      tolerate: [404],
    });
    console.info(`Deleted attribute set '${ATTRIBUTE_SET_NAME}' (id=${setId}).`);
  } catch (err) {
    console.error(`Attribute set deletion failed: ${err.message}`);
  }
};

const deleteAttributes = async (client, spec) => {
  printSection(`Delete attributes (${spec.length})`);
  let ok = 0;
  for (const entry of spec) {
    try {
      await client.del(`/V1/products/attributes/${encodeURIComponent(entry.attribute_code)}`, { tolerate: [400, 404] });
      ok++;
    } catch (err) {
      console.error(`  ${entry.attribute_code}: ${err.message}`);
    }
  }
  console.info(`Attributes: ${ok} deleted (or already gone).`);
};

const deleteCustomerGroup = async client => {
  printSection('Delete customer group');
  try {
    const params = new URLSearchParams({
      'searchCriteria[filterGroups][0][filters][0][field]': 'code',
      'searchCriteria[filterGroups][0][filters][0][value]': VIP_GROUP_CODE,
    });
    const list = await client.get(`/V1/customerGroups/search?${params}`);
    const id = list?.items?.[0]?.id;
    if (id === undefined) {
      console.info(`Customer group '${VIP_GROUP_CODE}' not found.`);
      return;
    }
    await client.del(`/V1/customerGroups/${id}`, { tolerate: [404] });
    console.info(`Deleted customer group '${VIP_GROUP_CODE}' (id=${id}).`);
  } catch (err) {
    console.error(`Customer group deletion failed: ${err.message}`);
  }
};

const main = async () => {
  const args = parseArgs(process.argv);
  const config = loadPaasConfig();
  const client = new PaasClient(config);

  printSection('Preflight');
  await client.authenticate();
  console.info(`Authenticated to ${config.baseUrl}`);

  // SKUs/slugs are locale-invariant, so reset always reads the default-locale feed.
  const metadata = readData('product_metadata.json', DEFAULT_LOCALE);
  const allProducts = readData('products.json', DEFAULT_LOCALE);
  const categories = readData('categories.json', DEFAULT_LOCALE);

  const products = args.smoke ? selectSmoke(allProducts, SMOKE_SEED_SKUS) : allProducts;
  await deleteProducts(client, products);

  // --smoke leaves the structural entities in place (they are shared / cheap to recreate).
  if (!args.smoke) {
    const spec = deriveAttributeSpec(metadata, allProducts);
    await deleteCategories(client, categories);
    await deleteAttributeSet(client);
    await deleteAttributes(client, spec);
    await deleteCustomerGroup(client);
  }

  printSection('Done');
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
