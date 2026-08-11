// Generate the committed Adobe Commerce upload files

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readData } from '../lib/data.js';
import { parseLocaleArgs, DEFAULT_LOCALE } from '../lib/locales.js';
import { deriveAttributeSpec, buildImportContext, buildImportItem, orderForImport, isConfigurable } from './dto.js';

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'uploads');

// Full Adobe Commerce product-import column set + the configurable/image columns.
const HEADER = [
  'sku',
  'store_view_code',
  'attribute_set_code',
  'product_type',
  'categories',
  'product_websites',
  'name',
  'description',
  'short_description',
  'weight',
  'product_online',
  'tax_class_name',
  'visibility',
  'price',
  'special_price',
  'special_price_from_date',
  'special_price_to_date',
  'url_key',
  'save_rewrites_history',
  'meta_title',
  'meta_keywords',
  'meta_description',
  'created_at',
  'updated_at',
  'new_from_date',
  'new_to_date',
  'display_product_options_in',
  'map_price',
  'msrp_price',
  'map_enabled',
  'gift_message_available',
  'custom_design',
  'custom_design_from',
  'custom_design_to',
  'custom_layout_update',
  'page_layout',
  'product_options_container',
  'msrp_display_actual_price_type',
  'country_of_manufacture',
  'additional_attributes',
  'qty',
  'out_of_stock_qty',
  'use_config_min_qty',
  'is_qty_decimal',
  'allow_backorders',
  'use_config_backorders',
  'min_cart_qty',
  'use_config_min_sale_qty',
  'max_cart_qty',
  'use_config_max_sale_qty',
  'is_in_stock',
  'notify_on_stock_below',
  'use_config_notify_stock_qty',
  'manage_stock',
  'use_config_manage_stock',
  'use_config_qty_increments',
  'qty_increments',
  'use_config_enable_qty_inc',
  'enable_qty_increments',
  'is_decimal_divided',
  'website_id',
  'deferred_stock_update',
  'use_config_deferred_stock_update',
  'related_skus',
  'crosssell_skus',
  'upsell_skus',
  'hide_from_product_page',
  'custom_options',
  'bundle_price_type',
  'bundle_sku_type',
  'bundle_price_view',
  'bundle_weight_type',
  'bundle_values',
  'associated_skus',
  'configurable_variations',
  'configurable_variation_labels',
  'base_image',
  'base_image_label',
  'small_image',
  'small_image_label',
  'thumbnail_image',
  'thumbnail_image_label',
  'additional_images',
  'additional_images_labels',
];

const escapeCsvField = value => {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const writeCsv = (outPath, rows) => {
  const lines = [HEADER.join(',')];
  for (const row of rows) lines.push(HEADER.map(h => escapeCsvField(row[h])).join(','));
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');
};

// Default locale keeps the historical filenames; other locales get a locale suffix.
const suffixed = (name, locale) => (locale === DEFAULT_LOCALE ? name : name.replace(/(\.[^.]+)$/, `.${locale}$1`));

const buildLocale = locale => {
  const metadata = readData('product_metadata.json', locale);
  const products = readData('products.json', locale);
  const categories = readData('categories.json', locale);
  const prices = readData('prices.json', locale);

  const spec = deriveAttributeSpec(metadata, products);
  const attrsPath = path.join(outDir, suffixed('carvelo_attributes.json', locale));
  fs.writeFileSync(attrsPath, JSON.stringify(spec, null, 2) + '\n', 'utf-8');

  const ctx = buildImportContext(products, categories, prices);
  const rows = orderForImport(products).map(p => buildImportItem(p, ctx));
  const csvPath = path.join(outDir, suffixed('carvelo_products.csv', locale));
  writeCsv(csvPath, rows);

  const configurable = products.filter(isConfigurable).length;
  console.log(`[${locale}] Wrote ${attrsPath} (${spec.length} attributes).`);
  console.log(
    `[${locale}] Wrote ${csvPath} (${rows.length} rows: ${configurable} configurable + ` +
      `${rows.length - configurable} simple).`,
  );
};

const main = () => {
  fs.mkdirSync(outDir, { recursive: true });
  for (const locale of parseLocaleArgs()) buildLocale(locale);
  console.log(
    "\nNote: products use attribute_set_code 'Carvelo' and reference category NAME paths; the image " +
      'columns are jsDelivr URLs (the Admin CSV import downloads them; the API path attaches images ' +
      'via the media API instead — see paas/PAAS_TO_ACO.md). VIP / EUR / quantity-tier prices are ' +
      'set via REST (npm run ingest:paas), not this CSV. For a non-default locale, set the ' +
      'store_view_code column to your store view before importing so text lands at that scope.',
  );
};

main();
