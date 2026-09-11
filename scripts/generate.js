#!/usr/bin/env node
// Carvelo Parts 2.0 - Adobe Commerce Optimizer (ACO) catalog dataset generator.
//
// Emits six ingestion feed files into the repo `data/` folder:
//   product_metadata.json, category_metadata.json, categories.json,
//   products.json, pricebooks.json, prices.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parseLocaleArgs } from '../lib/locales.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cd;
let LOCALE = 'en-US';
let OUT = path.join(__dirname, '..', 'data', LOCALE);

const setLocale = async locale => {
  LOCALE = locale;
  OUT = path.join(__dirname, '..', 'data', locale);
  cd = await import(`./copy/${locale}.js`);
};

// Base URL for hosted product images.
const IMAGE_BASE_URL =
  'https://cdn.jsdelivr.net/gh/adobe-commerce/aco-sample-catalog-data-ingestion@carvelo-2.0/data/images';

// ----------------------------------------------------------------------------
// Vehicle universe
// ----------------------------------------------------------------------------
const MAKES = ['Aurora', 'Bolt', 'Cruz'];
const MODELS = {
  Aurora: ['Flux', 'Prism', 'Pulse', 'Nexus', 'Nova'],
  Bolt: ['Atlas', 'Mammoth', 'Ranger', 'Scout', 'Terrain'],
  Cruz: ['Breeze', 'Echo', 'Element', 'Harmony', 'Verde'],
};
const TRIMS = ['Base', 'Premium', 'Performance', 'Limited'];
const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];
const PERFORMANCE_TRIM = 'Performance';

function slugify(...parts) {
  const s = parts
    .filter(p => p != null)
    .map(p => String(p))
    .join('-');
  return s.toLowerCase().split(' ').join('-').split('"').join('').split('/').join('-');
}

function veh_parent_sku(make, model) {
  return 'veh-' + slugify(make, model);
}

function veh_variant_sku(make, model, trim, year) {
  return 'veh-' + slugify(make, model, trim, year);
}

function all_vehicle_parents() {
  const out = [];
  for (const mk of MAKES) for (const md of MODELS[mk]) out.push(veh_parent_sku(mk, md));
  return out;
}

function model_year_all_trims(make, model, year) {
  return TRIMS.map(t => veh_variant_sku(make, model, t, year));
}

function* model_years() {
  for (const mk of MAKES) for (const md of MODELS[mk]) for (const yr of YEARS) yield [mk, md, yr];
}

function all_vehicle_variants() {
  const out = [];
  for (const [mk, md, yr] of model_years()) out.push(...model_year_all_trims(mk, md, yr));
  return out;
}

// Physical-fit dimensions: which vehicles accept which hard-fit spec.
const BOLT_PATTERN_BY_MAKE = {
  Aurora: '5x114.3',
  Bolt: '5x120',
  Cruz: '5x114.3',
};
const BATTERY_GROUP_BY_MAKE = {
  Aurora: 'GRP-24',
  Bolt: 'GRP-65',
  Cruz: 'GRP-48',
};
const PLUG_THREAD_BY_MAKE = { Aurora: '14mm', Bolt: '16mm', Cruz: '14mm' };
const WHEEL_SIZES = ['17"', '18"', '19"', '20"'];
const WHEEL_SIZE_BY_MODEL = (() => {
  const m = {};
  let i = 0;
  for (const mk of MAKES) for (const md of MODELS[mk]) m[`${mk}/${md}`] = WHEEL_SIZES[i++ % WHEEL_SIZES.length];
  return m;
})();
const BATTERY_COVERAGE = {
  Economy: ['Aurora', 'Bolt'],
  Standard: MAKES,
  AGM: ['Bolt', 'Cruz'],
};

function vehicle_fit_value(dim, mk, md) {
  if (dim === 'bolt_pattern') return BOLT_PATTERN_BY_MAKE[mk];
  if (dim === 'battery_group') return BATTERY_GROUP_BY_MAKE[mk];
  if (dim === 'plug_thread') return PLUG_THREAD_BY_MAKE[mk];
  if (dim === 'wheel_size') return WHEEL_SIZE_BY_MODEL[`${mk}/${md}`];
  throw new Error('unknown fit dimension ' + dim);
}

// Vehicle variant SKUs whose fit-dimension value equals fitVal, optionally limited to makesFilter.
function vehicles_matching(dim, fitVal, makesFilter = null) {
  const out = [];
  for (const [mk, md, yr] of model_years()) {
    if (makesFilter && !makesFilter.includes(mk)) continue;
    if (vehicle_fit_value(dim, mk, md) !== fitVal) continue;
    for (const t of TRIMS) out.push(veh_variant_sku(mk, md, t, yr));
  }
  return out;
}

// The distinct makes (in canonical order) covered by a fitment SKU list, for accurate copy.
function makes_in_fitment(fitment) {
  const seen = new Set(fitment.filter(v => v.startsWith('veh-')).map(v => v.split('-')[1]));
  return MAKES.filter(m => seen.has(slugify(m)));
}

// Coarse fitment tokens for browse-by-make and browse-by-make+model, derived from a part's
// vehicle-variant fitment list. They share the vehicle-SKU vocabulary so all three grains nest as
// prefixes: make_fitment "veh-aurora" -> make_model_fitment "veh-aurora-flux" -> fitment
// "veh-aurora-flux-base-2021".
function coarse_fitment(fitment) {
  const makes = new Set();
  const models = new Set();
  for (const v of fitment) {
    if (!v.startsWith('veh-')) continue; // skip UNIVERSAL
    const seg = v.split('-');
    makes.add(seg.slice(0, 2).join('-')); // veh-<make>
    models.add(seg.slice(0, 3).join('-')); // veh-<make>-<model>
  }
  return {
    makeFitment: [...makes].sort(),
    makeModelFitment: [...models].sort(),
  };
}

function human_list(items) {
  if (items.length <= 1) return items[0] || '';
  const and = cd.PHRASES.listAnd;
  if (items.length === 2) return `${items[0]} ${and} ${items[1]}`;
  const head = items.slice(0, -1).join(', ');
  const last = items[items.length - 1];
  return cd.PHRASES.listOxford ? `${head}, ${and} ${last}` : `${head} ${and} ${last}`;
}

// Deterministic 32-bit FNV-1a string hash -> non-negative int, for stable pseudo-variety.
function h(...keys) {
  const s = keys.map(k => String(k)).join('::');
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function pick(seq, ...keys) {
  return seq[h(...keys) % seq.length];
}

// ----------------------------------------------------------------------------
// Category tree (functional). leaf=true means products attach here.
// ----------------------------------------------------------------------------
const SYS_COLOR = {
  braking: 'c62828',
  suspension: '6a1b9a',
  tires: '263238',
  wheels: '37474f',
  transmission: '00838f',
  charging: '2e7d32',
  electrical: 'f9a825',
  fluids: '1565c0',
  engine: 'ef6c00',
};

// [slug, name, system_group, icon, leaf]
const CATEGORY_TREE = [
  ['brakes', 'Brakes', 'braking', 'brakes', false],
  ['brakes/pads', 'Brake Pads', 'braking', 'brakes', true],
  ['brakes/rotors', 'Brake Rotors', 'braking', 'brakes', true],
  ['brakes/calipers', 'Brake Calipers', 'braking', 'brakes', true],
  ['brakes/fluid', 'Brake Fluid', 'braking', 'fluid', true],

  ['suspension', 'Suspension', 'suspension', 'suspension', false],
  ['suspension/shocks', 'Shocks', 'suspension', 'suspension', true],
  ['suspension/springs', 'Springs', 'suspension', 'suspension', true],
  ['suspension/control-arms', 'Control Arms', 'suspension', 'suspension', true],
  ['suspension/sway-bars', 'Sway Bars', 'suspension', 'suspension', true],

  ['tires', 'Tires', 'tires', 'tire', true],

  ['transmission', 'Transmission', 'transmission', 'transmission', false],
  ['transmission/fluid', 'Transmission Fluid', 'transmission', 'fluid', true],
  ['transmission/clutch', 'Clutch', 'transmission', 'clutch', true],
  ['transmission/flywheel', 'Flywheel', 'transmission', 'transmission', true],

  ['charging-system', 'Charging System', 'charging', 'charging', false],
  ['charging-system/charger', 'Charger', 'charging', 'charging', true],
  ['charging-system/batteries', 'Batteries', 'charging', 'battery', true],

  ['wheels', 'Wheels', 'wheels', 'wheel', true],

  ['electrical', 'Electrical', 'electrical', 'alternator', false],
  ['electrical/alternators', 'Alternators', 'electrical', 'alternator', true],
  ['electrical/starters', 'Starters', 'electrical', 'alternator', true],
  ['electrical/batteries', 'Batteries', 'electrical', 'battery', true],

  ['fluids', 'Fluids', 'fluids', 'fluid', false],
  ['fluids/oil', 'Oil', 'fluids', 'fluid', true],
  ['fluids/transmission', 'Transmission Fluid', 'fluids', 'fluid', true],
  ['fluids/brake-fluid', 'Brake Fluid', 'fluids', 'fluid', true],
  ['fluids/wiper-fluid', 'Wiper Fluid', 'fluids', 'fluid', true],

  ['engine', 'Engine', 'engine', 'engine', false],
  ['engine/timing', 'Timing', 'engine', 'engine', true],
  ['engine/fuel-pump', 'Fuel Pump', 'engine', 'engine', true],
  ['engine/fuel-filters', 'Fuel Filters', 'engine', 'filter', true],
  ['engine/air-filters', 'Air Filters', 'engine', 'filter', true],
  ['engine/oil-filters', 'Oil Filters', 'engine', 'filter', true],
  ['engine/spark-plugs', 'Spark Plugs', 'engine', 'sparkplug', true],
];
const CAT_BY_SLUG = new Map(CATEGORY_TREE.map(c => [c[0], c]));

function top_system(slug) {
  return CAT_BY_SLUG.get(slug)[2];
}

console.log(
  'config loaded:',
  all_vehicle_parents().length,
  'vehicle lines,',
  [...model_years()].length,
  'model-years,',
  CATEGORY_TREE.length,
  'categories',
);

// brand -> [manufacturer, sold_by_third_party default]
const BRANDS = {
  Halden: ['Meridian Components', false],
  'Torqa Performance': ['Apex Parts Group', true],
  RideWorks: ['Northwind Automotive', false],
  'Apex Dynamics': ['Apex Parts Group', true],
  Terravox: ['Helio Industries', false],
  Aeroline: ['Meridian Components', true],
  Forgecraft: ['Apex Parts Group', true],
  Voltaic: ['Northwind Automotive', false],
  AmpEdge: ['Helio Industries', true],
  PureFlow: ['Carvelo OE', false],
  'Vireo Lubricants': ['Helio Industries', true],
  Ignis: ['Meridian Components', false],
  Cleanstream: ['Northwind Automotive', false],
  FuelPro: ['Apex Parts Group', true],
  GearMark: ['Meridian Components', false],
  'Carvelo OE': ['Carvelo OE', false],
};
// candidate brands offered per system_group (deterministic pick per SKU)
const SYS_BRANDS = {
  braking: ['Halden', 'Torqa Performance', 'Carvelo OE'],
  suspension: ['RideWorks', 'Apex Dynamics', 'Carvelo OE'],
  tires: ['Terravox', 'Aeroline'],
  wheels: ['Forgecraft', 'Carvelo OE'],
  transmission: ['GearMark', 'Carvelo OE'],
  charging: ['Voltaic', 'AmpEdge', 'Carvelo OE'],
  electrical: ['Voltaic', 'AmpEdge', 'Carvelo OE'],
  fluids: ['PureFlow', 'Vireo Lubricants'],
  engine: ['Ignis', 'Cleanstream', 'FuelPro', 'Carvelo OE'],
};

// ----------------------------------------------------------------------------
// Part specifications. Each entry drives generation for one leaf part type.
// ----------------------------------------------------------------------------
const PART_SPECS = [
  // ---- Braking ----
  {
    key: 'brake-pads',
    name: 'Brake Pads',
    part_code: 'pad',
    category: 'brakes/pads',
    scope: 'per_model_year',
    type: 'configurable',
    axes: [['grade', ['Eco', 'Performance']]],
    fitment: 'mmy_all_trims',
    base_usd: { Eco: 49.99, Performance: 89.99 },
  },
  {
    key: 'brake-rotors',
    name: 'Brake Rotors',
    part_code: 'rot',
    category: 'brakes/rotors',
    scope: 'per_model_year',
    type: 'configurable',
    axes: [['grade', ['Eco', 'Performance']]],
    fitment: 'mmy_all_trims',
    base_usd: { Eco: 79.99, Performance: 129.99 },
  },
  {
    key: 'brake-calipers',
    name: 'Brake Caliper',
    part_code: 'cal',
    category: 'brakes/calipers',
    scope: 'per_model_year',
    type: 'simple',
    fitment: 'resolved_performance',
    base_usd: 199.99,
  },

  // ---- Suspension ----
  {
    key: 'shocks',
    name: 'Shock Absorber',
    part_code: 'shk',
    category: 'suspension/shocks',
    scope: 'per_model_year',
    type: 'configurable',
    axes: [['grade', ['Luxury', 'Performance']]],
    fitment: 'mmy_all_trims',
    base_usd: { Luxury: 149.99, Performance: 189.99 },
  },
  {
    key: 'springs',
    name: 'Coil Spring',
    part_code: 'spr',
    category: 'suspension/springs',
    scope: 'per_model_year',
    type: 'configurable',
    axes: [['grade', ['Luxury', 'Performance']]],
    fitment: 'mmy_all_trims',
    base_usd: { Luxury: 119.99, Performance: 149.99 },
  },
  {
    key: 'control-arms',
    name: 'Control Arm',
    part_code: 'ctl',
    category: 'suspension/control-arms',
    scope: 'per_model_year',
    type: 'simple',
    fitment: 'mmy_all_trims',
    base_usd: 109.99,
  },
  {
    key: 'sway-bars',
    name: 'Sway Bar',
    part_code: 'swy',
    category: 'suspension/sway-bars',
    scope: 'per_model_year',
    type: 'simple',
    fitment: 'mmy_all_trims',
    base_usd: 89.99,
  },

  // ---- Transmission ----
  {
    key: 'clutch',
    name: 'Clutch Kit',
    part_code: 'clu',
    category: 'transmission/clutch',
    scope: 'per_model_year',
    type: 'simple',
    fitment: 'mmy_all_trims',
    base_usd: 299.99,
  },
  {
    key: 'flywheel',
    name: 'Flywheel',
    part_code: 'fly',
    category: 'transmission/flywheel',
    scope: 'per_model_year',
    type: 'simple',
    fitment: 'mmy_all_trims',
    base_usd: 219.99,
  },

  // ---- Charging / Electrical ----
  {
    key: 'charger',
    name: 'Onboard Charger',
    part_code: 'chg',
    category: 'charging-system/charger',
    scope: 'per_model_year',
    type: 'simple',
    fitment: 'mmy_all_trims',
    base_usd: 249.99,
  },
  {
    key: 'alternator',
    name: 'Alternator',
    part_code: 'alt',
    category: 'electrical/alternators',
    scope: 'per_model_year',
    type: 'simple',
    fitment: 'mmy_all_trims',
    base_usd: 179.99,
  },
  {
    key: 'starter',
    name: 'Starter Motor',
    part_code: 'str',
    category: 'electrical/starters',
    scope: 'per_model_year',
    type: 'simple',
    fitment: 'mmy_all_trims',
    base_usd: 149.99,
  },
  {
    key: 'fuel-pump',
    name: 'Fuel Pump',
    part_code: 'fpm',
    category: 'engine/fuel-pump',
    scope: 'per_model_year',
    type: 'simple',
    fitment: 'mmy_all_trims',
    base_usd: 129.99,
  },

  // ---- Universal / broad ----
  {
    key: 'tires',
    name: 'Tire',
    part_code: 'tir',
    category: 'tires',
    scope: 'universal',
    type: 'configurable',
    axes: [
      ['size', ['17"', '18"', '19"', '20"']],
      ['profile', ['35', '45', '55']],
      ['rating', ['H', 'V', 'Z']],
    ],
    fitment: 'universal',
    fit_axis: 'size',
    fit_dim: 'wheel_size',
    line_coverage: { 'Off-Road': ['Bolt'] },
    base_usd: 120.0,
    lines: ['All-Season', 'Sport', 'Off-Road'],
  },
  {
    key: 'wheels',
    name: 'Wheel',
    part_code: 'whl',
    category: 'wheels',
    scope: 'universal',
    type: 'configurable',
    axes: [
      ['size', ['17"', '18"', '19"', '20"']],
      ['bolt_pattern', ['5x114.3', '5x120']],
    ],
    fitment: 'universal',
    fit_axis: 'bolt_pattern',
    fit_dim: 'bolt_pattern',
    base_usd: 180.0,
    lines: ['Aero', 'Mesh', 'Forged'],
  },
  {
    key: 'battery',
    name: 'Battery',
    part_code: 'bat',
    category: 'electrical/batteries',
    extra_cats: ['charging-system/batteries'],
    scope: 'universal',
    type: 'configurable',
    axes: [['group_size', ['GRP-24', 'GRP-48', 'GRP-65']]],
    fitment: 'battery_lines',
    fit_axis: 'group_size',
    fit_dim: 'battery_group',
    base_usd: 159.99,
    lines: ['Economy', 'Standard', 'AGM'],
  },
  {
    key: 'oil',
    name: 'Motor Oil',
    part_code: 'oil',
    category: 'fluids/oil',
    scope: 'universal',
    type: 'configurable',
    axes: [
      ['viscosity', ['0W-20', '5W-30', '10W-40']],
      ['volume', ['1L', '5L']],
    ],
    fitment: 'universal',
    base_usd: 9.49,
  },
  {
    key: 'brake-fluid',
    name: 'Brake Fluid',
    part_code: 'bfl',
    category: 'fluids/brake-fluid',
    extra_cats: ['brakes/fluid'],
    scope: 'universal',
    type: 'configurable',
    axes: [['volume', ['0.5L', '1L']]],
    fitment: 'universal',
    base_usd: 12.99,
  },
  {
    key: 'trans-fluid',
    name: 'Transmission Fluid',
    part_code: 'tfl',
    category: 'fluids/transmission',
    extra_cats: ['transmission/fluid'],
    scope: 'universal',
    type: 'configurable',
    axes: [['volume', ['1L', '4L']]],
    fitment: 'universal',
    base_usd: 14.99,
  },
  {
    key: 'wiper-fluid',
    name: 'Wiper Fluid',
    part_code: 'wfl',
    category: 'fluids/wiper-fluid',
    scope: 'universal',
    type: 'configurable',
    axes: [['volume', ['1L', '4L']]],
    fitment: 'universal',
    base_usd: 6.99,
  },
  {
    key: 'spark-plugs',
    name: 'Spark Plug',
    part_code: 'spk',
    category: 'engine/spark-plugs',
    scope: 'universal',
    type: 'configurable',
    axes: [['size', ['14mm', '16mm']]],
    fitment: 'universal',
    fit_axis: 'size',
    fit_dim: 'plug_thread',
    base_usd: 6.99,
    lines: ['Copper', 'Iridium'],
  },
  {
    key: 'air-filter',
    name: 'Air Filter',
    part_code: 'afl',
    category: 'engine/air-filters',
    scope: 'universal',
    type: 'configurable',
    axes: [['size', ['Standard', 'High-Flow']]],
    fitment: 'universal',
    base_usd: 24.99,
  },
  {
    key: 'oil-filter',
    name: 'Oil Filter',
    part_code: 'ofl',
    category: 'engine/oil-filters',
    scope: 'universal',
    type: 'configurable',
    axes: [['size', ['Standard', 'Extended']]],
    fitment: 'universal',
    base_usd: 12.99,
  },
  {
    key: 'fuel-filter',
    name: 'Fuel Filter',
    part_code: 'ffl',
    category: 'engine/fuel-filters',
    scope: 'universal',
    type: 'configurable',
    axes: [['size', ['Standard', 'Extended']]],
    fitment: 'universal',
    base_usd: 29.99,
  },
];

const CONSUMABLE_KEYS = new Set([
  'oil',
  'brake-fluid',
  'trans-fluid',
  'wiper-fluid',
  'spark-plugs',
  'air-filter',
  'oil-filter',
  'fuel-filter',
  'brake-pads',
]);

console.log('part specs:', PART_SPECS.length);

// ----------------------------------------------------------------------------
// Small helpers: SKU segments, pricing, images, attribute construction
// ----------------------------------------------------------------------------
const MK3 = Object.fromEntries(MAKES.map(mk => [mk, mk.slice(0, 3).toLowerCase()]));

function md3(model) {
  return model.slice(0, 3).toLowerCase();
}

function seg(v) {
  return slugify(v).split('.').join('');
}

// Opaque token pairing a parent's configuration option value with the matching
// variant. Scoped by the parent SKU because ACO resolves the option-value -> variant
// join on variantReferenceId globally, not per VARIANT_OF link, so the id must be
// unique per configurable (see the SDK "pants-color-red" example). Delimiter "/" is
// safe because slugify() turns any "/" in a value into "-" and SKUs never contain "/".
function vref(parent, axis, value) {
  return `${parent}/${axis}/${seg(value)}`;
}

// Python's round() is round-half-to-even (banker's rounding); replicate it so
// tidy() snaps prices identically.
function pyRound(x) {
  const fl = Math.floor(x);
  const diff = x - fl;
  if (diff < 0.5) return fl;
  if (diff > 0.5) return fl + 1;
  return fl % 2 === 0 ? fl : fl + 1;
}

// Snap a price to a clean .99 ending, min 0.99.
function tidy(p) {
  return parseFloat(Math.max(0.99, pyRound(p) - 0.01).toFixed(2));
}

const SIZE_PREMIUM = { '17"': 0, '18"': 20, '19"': 45, '20"': 80 };
const RATING_PREMIUM = { H: 0, V: 15, Z: 35 };
const VISC_PREMIUM = { '0W-20': 2, '5W-30': 0, '10W-40': 1 };
const VOL_MULT = { '0.5L': 0.6, '1L': 1.0, '4L': 3.4, '5L': 4.2, '20L': 15.0 };
const LINE_PREMIUM = {
  'All-Season': 0,
  Sport: 40,
  'Off-Road': 60,
  Aero: 0,
  Mesh: 30,
  Forged: 120,
  Economy: -30,
  Standard: 0,
  AGM: 60,
  Copper: 0,
  Iridium: 7,
};
const GROUP_PREMIUM = { 'GRP-24': 0, 'GRP-48': 30, 'GRP-65': 60 };

function getOr(obj, key, dflt) {
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : dflt;
}

function compute_price(spec, line, combo) {
  const base = spec.base_usd;
  let price;
  if (base !== null && typeof base === 'object') {
    const first_axis = spec.axes[0][0];
    price = base[combo[first_axis]];
  } else {
    price = base;
  }
  if (line) price += getOr(LINE_PREMIUM, line, 0);
  for (const [code, val] of Object.entries(combo)) {
    if (code === 'size') price += getOr(SIZE_PREMIUM, val, 0);
    else if (code === 'rating') price += getOr(RATING_PREMIUM, val, 0);
    else if (code === 'viscosity') price += getOr(VISC_PREMIUM, val, 0);
    else if (code === 'group_size') price += getOr(GROUP_PREMIUM, val, 0);
    else if (code === 'volume') price *= getOr(VOL_MULT, val, 1.0);
  }
  return tidy(Math.max(0.99, price));
}

function image_url(color, label, key = null) {
  if (IMAGE_BASE_URL && key) return `${IMAGE_BASE_URL}/${key}.png`;
  const txt = label.split(' ').join('+');
  return `https://placehold.co/500x500/${color}/ffffff.png?text=${txt}`;
}

function img_block(color, label, roles, key = null) {
  return [{ url: image_url(color, label, key), label, roles }];
}

// Map each part family (PART_SPECS key) to its product image(s) under IMAGE_BASE_URL.
const IMAGE_MAP = {
  'brake-pads': [
    'grade',
    {
      Eco: 'brakes/brake-pads-eco',
      Performance: 'brakes/brake-pads-performance',
    },
  ],
  'brake-rotors': [
    'grade',
    {
      Eco: 'brakes/brake-rotors-eco',
      Performance: 'brakes/brake-rotors-performance',
    },
  ],
  'brake-calipers': 'brakes/brake-caliper',
  'brake-fluid': 'brakes/brake-fluid',
  shocks: [
    'grade',
    {
      Luxury: 'suspension/shock-luxury',
      Performance: 'suspension/shock-performance',
    },
  ],
  springs: [
    'grade',
    {
      Luxury: 'suspension/spring-luxury',
      Performance: 'suspension/spring-performance',
    },
  ],
  'control-arms': 'suspension/control-arm',
  'sway-bars': 'suspension/sway-bar',
  clutch: 'transmission/clutch-kit',
  flywheel: 'transmission/flywheel',
  'trans-fluid': 'transmission/transmission-fluid',
  charger: 'electrical/onboard-charger',
  alternator: 'electrical/alternator',
  starter: 'electrical/starter',
  battery: [
    'line',
    {
      Economy: 'electrical/battery-economy',
      Standard: 'electrical/battery-standard',
      AGM: 'electrical/battery-agm',
    },
  ],
  'fuel-pump': 'engine/fuel-pump',
  'spark-plugs': [
    'line',
    {
      Copper: 'engine/spark-plug-copper',
      Iridium: 'engine/spark-plug-iridium',
    },
  ],
  'air-filter': [
    'size',
    {
      Standard: 'engine/air-filter-standard',
      'High-Flow': 'engine/air-filter-high-flow',
    },
  ],
  'oil-filter': 'engine/oil-filter',
  'fuel-filter': 'engine/fuel-filter',
  tires: [
    'line',
    {
      'All-Season': 'tires/tire-all-season',
      Sport: 'tires/tire-sport',
      'Off-Road': 'tires/tire-off-road',
    },
  ],
  wheels: [
    'line',
    {
      Aero: 'wheels/wheel-aero',
      Mesh: 'wheels/wheel-mesh',
      Forged: 'wheels/wheel-forged',
    },
  ],
  oil: ['volume', { '1L': 'fluids/motor-oil-1l', '5L': 'fluids/motor-oil-5l' }],
  'wiper-fluid': 'fluids/wiper-fluid',
};

function image_key_for(part_key, line, combo) {
  const entry = IMAGE_MAP[part_key];
  if (typeof entry === 'string') return entry;
  const [driver, table] = entry;
  let value = driver === 'line' ? line : combo && Object.keys(combo).length ? combo[driver] : undefined;
  if (value == null) value = Object.keys(table)[0];
  return table[value];
}

// --- copy composition (fragments live in copy-deck.js) ---------------------
const _TIRE_WHEEL_NOUNS = ['Tire', 'Tires', 'Wheel', 'Wheels'];

function brand_display(brand, part_noun) {
  const words = brand.split(' ');
  const last = words[words.length - 1];
  if (words.length > 1 && _TIRE_WHEEL_NOUNS.includes(last) && part_noun.includes(last)) {
    return words.slice(0, -1).join(' ');
  }
  return brand;
}

function opt_label(value) {
  return getOr(cd.OPTION_DISPLAY, value, value);
}

function clean(text) {
  return text
    .split(/\s+/)
    .filter(s => s.length > 0)
    .join(' ');
}

function compose_description(
  sku,
  part_key,
  brand,
  adjective,
  benefit_value,
  fitment_key,
  make = null,
  model = null,
  year = null,
  makesText = null,
) {
  const intro = cd.PART_INTRO[part_key];
  const benefit = benefit_value ? getOr(cd.OPTION_BENEFIT, benefit_value, '') : '';
  const voice = getOr(cd.BRAND_VOICE, brand, '');
  const fit = cd.FITMENT_PHRASE[fitment_key]
    .replace('{make}', make)
    .replace('{model}', model)
    .replace('{year}', String(year))
    .replace('{makes}', makesText ?? '');
  // Three sentence orderings, chosen deterministically to avoid identical strings
  // across the 90 model-years of the same part.
  const orderings = [
    [intro, benefit, fit, voice],
    [voice, intro, benefit, fit],
    [intro, fit, benefit, voice],
  ];
  const parts = orderings[h(sku) % orderings.length].filter(p => p);
  return clean(parts.join(' '));
}

function attr(code, ...values) {
  return { code, values: values.map(v => String(v)) };
}

function vattr(parent, code, value) {
  const a = attr(code, value);
  a.variantReferenceId = vref(parent, code, value);
  return a;
}

function cartesian(axes) {
  let combos = [{}];
  for (const [code, values] of axes) {
    const next = [];
    for (const c of combos) for (const v of values) next.push({ ...c, [code]: v });
    combos = next;
  }
  return combos;
}

// ----------------------------------------------------------------------------
// Product metadata (attribute definitions)
// ----------------------------------------------------------------------------
function build_product_metadata() {
  const ALL = ['PRODUCT_DETAIL', 'PRODUCT_LISTING', 'SEARCH_RESULTS', 'PRODUCT_COMPARE'];
  const m = (
    code,
    label,
    {
      dt = 'TEXT',
      vis = ['PRODUCT_DETAIL'],
      filt = false,
      sort = false,
      search = false,
      weight = 1,
      stypes = ['AUTOCOMPLETE'],
    } = {},
  ) => ({
    code,
    source: { locale: LOCALE },
    label: getOr(cd.ATTR_LABEL, code, label),
    dataType: dt,
    visibleIn: [...vis],
    filterable: filt,
    sortable: sort,
    searchable: search,
    searchWeight: weight,
    searchTypes: [...stypes],
  });
  return [
    m('sku', 'SKU', { search: true, stypes: ['AUTOCOMPLETE'], vis: ALL }),
    m('name', 'Name', { sort: true, search: true, weight: 5, vis: ALL }),
    m('description', 'Description', { vis: ['PRODUCT_DETAIL'] }),
    m('shortDescription', 'Short Description', {
      search: true,
      vis: ['PRODUCT_DETAIL'],
    }),
    m('price', 'Price', {
      dt: 'DECIMAL',
      filt: true,
      sort: true,
      vis: ALL,
      stypes: [],
    }),
    // record kind: "vehicle" (picker) vs "part" (shopper) — drives ACO object_type policies
    m('object_type', 'Object Type', { filt: true, vis: ALL, stypes: [] }),
    // vehicle attributes
    m('make', 'Vehicle Make', {
      filt: true,
      search: true,
      weight: 2,
      vis: ALL,
    }),
    m('model', 'Vehicle Model', {
      filt: true,
      search: true,
      weight: 2,
      vis: ALL,
    }),
    m('trim', 'Vehicle Trim', { filt: true, vis: ALL }),
    m('year', 'Vehicle Year', {
      dt: 'INTEGER',
      filt: true,
      vis: ALL,
      stypes: [],
    }),
    // part attributes
    m('part_category', 'Part Category', {
      filt: true,
      search: true,
      weight: 3,
      vis: ALL,
    }),
    m('brand', 'Brand', { filt: true, search: true, weight: 2, vis: ALL }),
    m('manufacturer', 'Manufacturer', { filt: true, vis: ALL }),
    m('fitment', 'Fitment', {
      filt: true,
      search: true,
      weight: 2,
      vis: ['PRODUCT_DETAIL', 'SEARCH_RESULTS'],
    }),
    // Coarse fitment tokens for browse-by-make / make+model
    m('make_fitment', 'Fits Make', { filt: true, vis: ALL, stypes: [] }),
    m('make_model_fitment', 'Fits Model', { filt: true, vis: ALL, stypes: [] }),
    // Per-vehicle attribute override: "{vehicle-sku}::{full text}" display tokens, read on the PDP for
    // the selected vehicle.
    m('fitment_drives', 'Drives', { vis: ['PRODUCT_DETAIL'], stypes: [] }),
    m('sold_by_third_party', 'Sold by Third Party', {
      dt: 'BOOLEAN',
      filt: true,
      vis: ALL,
      stypes: [],
    }),
    // configurable option axes
    m('grade', 'Grade', { filt: true, vis: ALL }),
    m('size', 'Size', { filt: true, vis: ALL }),
    m('profile', 'Profile', { filt: true, vis: ALL }),
    m('rating', 'Speed Rating', { filt: true, vis: ALL }),
    m('bolt_pattern', 'Bolt Pattern', { filt: true, vis: ALL }),
    m('group_size', 'Group Size', { filt: true, vis: ALL }),
    m('volume', 'Volume', { filt: true, vis: ALL }),
    m('viscosity', 'Viscosity', { filt: true, vis: ALL }),
  ];
}

function build_category_metadata() {
  // No category-attribute use case for now, so the feed is intentionally empty.
  return [];
}

// ----------------------------------------------------------------------------
// Categories
// ----------------------------------------------------------------------------
function build_categories() {
  const out = [];
  CATEGORY_TREE.forEach(([slug, treeName, sys], pos) => {
    const color = SYS_COLOR[sys];
    const name = getOr(cd.CATEGORY_NAME, slug, treeName);
    const blurb = cd.CATEGORY_BLURB[slug];
    out.push({
      name,
      slug,
      source: { locale: LOCALE },
      description: blurb,
      families: ['menu'],
      position: pos,
      metaTags: {
        title: cd.PHRASES.metaTitle.replace('{name}', name),
        description: blurb,
        keywords: [...cd.PHRASES.keywords, name.toLowerCase()],
      },
      images: img_block(color, name, ['BASE', 'THUMBNAIL']),
    });
  });
  return out;
}

// ----------------------------------------------------------------------------
// Vehicles (reference-only configurable products)
// ----------------------------------------------------------------------------
function build_vehicles() {
  const out = [];
  for (const mk of MAKES) {
    for (const md of MODELS[mk]) {
      const parent = veh_parent_sku(mk, md);
      out.push({
        sku: parent,
        source: { locale: LOCALE },
        name: `${mk} ${md}`,
        slug: slugify('vehicle', mk, md),
        status: 'ENABLED',
        description: cd.PHRASES.refLineDesc.replace('{name}', `${mk} ${md}`),
        shortDescription: cd.PHRASES.refLineShort.replace('{name}', `${mk} ${md}`),
        visibleIn: ['CATALOG', 'SEARCH'],
        attributes: [attr('object_type', 'vehicle'), attr('make', mk), attr('model', md)],
        configurations: [
          {
            attributeCode: 'trim',
            label: getOr(cd.AXIS_LABEL, 'trim', 'Trim'),
            type: 'CONFIGURABLE',
            values: TRIMS.map(t => ({
              variantReferenceId: vref(parent, 'trim', t),
              label: t,
            })),
          },
          {
            attributeCode: 'year',
            label: getOr(cd.AXIS_LABEL, 'year', 'Year'),
            type: 'CONFIGURABLE',
            values: YEARS.map(y => ({
              variantReferenceId: vref(parent, 'year', y),
              label: String(y),
            })),
          },
        ],
        images: img_block('455a64', `${mk} ${md}`, ['BASE', 'SMALL', 'THUMBNAIL']),
      });
      for (const t of TRIMS) {
        for (const y of YEARS) {
          out.push({
            sku: veh_variant_sku(mk, md, t, y),
            source: { locale: LOCALE },
            name: `${mk} ${md} ${opt_label(t)} ${y}`,
            slug: slugify('vehicle', mk, md, t, y),
            status: 'ENABLED',
            description: cd.PHRASES.refVariantDesc.replace('{name}', `${mk} ${md} ${opt_label(t)} ${y}`),
            shortDescription: `${mk} ${md} ${opt_label(t)} ${y}`,
            visibleIn: ['CATALOG', 'SEARCH'],
            attributes: [
              attr('object_type', 'vehicle'),
              attr('make', mk),
              attr('model', md),
              vattr(parent, 'trim', t),
              vattr(parent, 'year', y),
            ],
            links: [{ type: 'VARIANT_OF', sku: parent }],
          });
        }
      }
    }
  }
  return out;
}

const ADD_TIERS = true;

function resolve_fitment(kind, { mk = null, md = null, yr = null, line = null } = {}) {
  if (kind === 'universal') return ['UNIVERSAL', ...all_vehicle_variants()];
  if (kind === 'mmy_all_trims') return model_year_all_trims(mk, md, yr);
  if (kind === 'resolved_performance') return [veh_variant_sku(mk, md, PERFORMANCE_TRIM, yr)];
  if (kind === 'battery_lines') {
    const cov = {
      Economy: ['Aurora', 'Bolt'],
      Standard: MAKES,
      AGM: ['Bolt', 'Cruz'],
    }[line];
    const out = [];
    for (const m of cov)
      for (const d of MODELS[m]) for (const t of TRIMS) for (const y of YEARS) out.push(veh_variant_sku(m, d, t, y));
    return out;
  }
  throw new Error(String(kind));
}

// ACO does not roll up category ancestry, so a product needs a route for each ancestor
// level, not just the leaf: "brakes/pads" -> routes for "brakes" and "brakes/pads".
function to_routes(...paths) {
  const expanded = paths.flatMap(p => p.split('/').map((_, i, segs) => segs.slice(0, i + 1).join('/')));
  return [...new Set(expanded)].map(path => ({ path }));
}

function part_routes(spec) {
  return to_routes(spec.category, ...(spec.extra_cats || []));
}

function part_attrs(spec, brand, mfr, tp, fitment, extra = null) {
  const a = [
    attr('object_type', 'part'),
    attr('part_category', spec.category.split('/')[0]),
    attr('brand', brand),
    attr('manufacturer', mfr),
    attr('sold_by_third_party', tp ? 'true' : 'false'),
  ];
  // Fitment lives on parents/simples only; configurable variants are Not Visible Individually and
  // are reached through the parent, so they carry no fitment (callers pass [] for variants).
  if (fitment && fitment.length) {
    a.push(attr('fitment', ...fitment));
    const { makeFitment, makeModelFitment } = coarse_fitment(fitment);
    if (makeFitment.length) a.push(attr('make_fitment', ...makeFitment));
    if (makeModelFitment.length) a.push(attr('make_model_fitment', ...makeModelFitment));
  }
  if (extra) a.push(...extra);
  return a;
}

const FITMENT_KEY = {
  mmy_all_trims: 'direct_fit',
  resolved_performance: 'direct_fit_perf',
  universal: 'universal',
  battery_lines: 'broad',
};

// Word placed before the part noun in the name (line, or grade value).
function _adjective(spec, line, combo) {
  if (line) return opt_label(line);
  for (const [code] of spec.axes || []) {
    if (code === 'grade') return opt_label(combo[code]);
  }
  return null;
}

// Dimensional option values shown in parentheses (everything but grade).
function _paren_tokens(spec, combo) {
  return (spec.axes || []).filter(([code]) => code !== 'grade').map(([code]) => opt_label(combo[code]));
}

function _benefit_value(spec, line, combo) {
  const cands = (line ? [line] : []).concat((spec.axes || []).map(([c]) => combo[c]));
  for (const cand of cands) {
    if (cand != null && Object.prototype.hasOwnProperty.call(cd.OPTION_BENEFIT, cand)) return cand;
  }
  return null;
}

function _part_name(brand_disp, adjective, noun, mk, md, yr, paren_tokens) {
  const adj = adjective ? ` ${adjective}` : '';
  const core = cd.NAME_ADJ_AFTER_NOUN ? brand_disp + ` ${noun}` + adj : brand_disp + adj + ` ${noun}`;
  const suffix = mk ? ` ${cd.PHRASES.for} ${mk} ${md} ${yr}` : '';
  const paren = paren_tokens.length ? ` (${paren_tokens.join(', ')})` : '';
  return clean(core + suffix + paren);
}

function _short(spec, adjective, noun, mk, md, yr, paren_tokens) {
  const adj = adjective || '';
  const head = cd.NAME_ADJ_AFTER_NOUN ? `${noun} ${adj}` : `${adj} ${noun}`;
  if (mk) return clean(`${head} ${cd.PHRASES.for} ${mk} ${md} ${yr}`);
  const tail = spec.fit_axis || spec.fitment === 'battery_lines' ? cd.PHRASES.fitsMany : cd.PHRASES.universalFit;
  const paren = paren_tokens.length ? ` (${paren_tokens.join(', ')})` : '';
  return clean(`${head}${paren}, ${tail}`);
}

function build_parts() {
  const products = [];
  const sellable = []; // [sku, usd_public, consumable]

  const add_price = (sku, spec, line, combo) => {
    const p = compute_price(spec, line, combo);
    sellable.push([sku, p, CONSUMABLE_KEYS.has(spec.key)]);
    return p;
  };

  for (const spec of PART_SPECS) {
    const sys = top_system(spec.category);
    const color = SYS_COLOR[sys];
    const brands = SYS_BRANDS[sys];
    const routes = part_routes(spec);
    const pk = spec.key;
    const noun = getOr(cd.PART_NOUN, spec.key, spec.name);
    const fit_key = spec.fit_axis ? 'broad' : FITMENT_KEY[spec.fitment];

    if (spec.scope === 'per_model_year') {
      for (const [mk, md, yr] of model_years()) {
        const brand = pick(brands, pk, mk, md, yr);
        const [mfr, tp] = BRANDS[brand];
        const bdisp = brand_display(brand, noun);
        const fitment = resolve_fitment(spec.fitment, { mk, md, yr });
        const base_sku = `${spec.part_code}-${MK3[mk]}-${md3(md)}-${yr}`;
        const img = img_block(color, `${bdisp} ${noun}`, ['BASE', 'SMALL', 'THUMBNAIL'], image_key_for(pk, null, {}));

        if (spec.type === 'simple') {
          const prod = {
            sku: base_sku,
            source: { locale: LOCALE },
            name: _part_name(bdisp, null, noun, mk, md, yr, []),
            slug: slugify(pk, mk, md, yr),
            status: 'ENABLED',
            description: compose_description(base_sku, pk, brand, null, null, fit_key, mk, md, yr),
            shortDescription: _short(spec, null, noun, mk, md, yr, []),
            visibleIn: ['CATALOG', 'SEARCH'],
            attributes: part_attrs(spec, brand, mfr, tp, fitment),
            images: img,
            routes,
          };
          if (pk === 'brake-calipers') {
            prod.links = [
              { type: 'related', sku: `pad-${MK3[mk]}-${md3(md)}-${yr}` },
              { type: 'related', sku: `rot-${MK3[mk]}-${md3(md)}-${yr}` },
            ];
          }
          products.push(prod);
          add_price(base_sku, spec, null, {});
        } else {
          // configurable per model-year
          const axes = spec.axes;
          products.push({
            sku: base_sku,
            source: { locale: LOCALE },
            name: _part_name(bdisp, null, noun, mk, md, yr, []),
            slug: slugify(pk, mk, md, yr),
            status: 'ENABLED',
            description: compose_description(base_sku, pk, brand, null, null, fit_key, mk, md, yr),
            shortDescription: _short(spec, null, noun, mk, md, yr, []),
            visibleIn: ['CATALOG', 'SEARCH'],
            attributes: part_attrs(spec, brand, mfr, tp, fitment),
            images: img,
            routes,
            configurations: axes.map(([code, vals]) => ({
              attributeCode: code,
              label: getOr(cd.AXIS_LABEL, code, title(code.split('_').join(' '))),
              type: 'CONFIGURABLE',
              values: vals.map(v => ({
                variantReferenceId: vref(base_sku, code, v),
                label: v,
              })),
            })),
          });
          for (const combo of cartesian(axes)) {
            const vsku = base_sku + '-' + axes.map(([c]) => seg(combo[c])).join('-');
            const adj = _adjective(spec, null, combo);
            const paren = _paren_tokens(spec, combo);
            const bv = _benefit_value(spec, null, combo);
            products.push({
              sku: vsku,
              source: { locale: LOCALE },
              name: _part_name(bdisp, adj, noun, mk, md, yr, paren),
              slug: slugify(pk, mk, md, yr, ...axes.map(([c]) => combo[c])),
              status: 'ENABLED',
              description: compose_description(vsku, pk, brand, adj, bv, fit_key, mk, md, yr),
              shortDescription: _short(spec, adj, noun, mk, md, yr, paren),
              visibleIn: [], // Not Visible Individually — reached via the configurable parent
              attributes: part_attrs(
                spec,
                brand,
                mfr,
                tp,
                [],
                axes.map(([c]) => vattr(base_sku, c, combo[c])),
              ),
              images: img_block(
                color,
                `${bdisp} ${noun}`,
                ['BASE', 'SMALL', 'THUMBNAIL'],
                image_key_for(pk, null, combo),
              ),
              links: [{ type: 'VARIANT_OF', sku: base_sku }],
            });
            add_price(vsku, spec, null, combo);
          }
        }
      }
    } else {
      // universal — optionally split by a hard-fit axis (spec.fit_axis) into scoped products
      const lines = spec.lines || [null];
      const allAxes = spec.axes || [];
      const fitAxis = spec.fit_axis || null;
      const prefAxes = fitAxis ? allAxes.filter(([c]) => c !== fitAxis) : allAxes;
      const fitValues = fitAxis ? allAxes.find(([c]) => c === fitAxis)[1] : [null];
      // Line -> allowed makes. Battery lines cover specific makes; other specs can restrict a line
      // via spec.line_coverage (e.g. Off-Road tires -> Bolt). Unlisted lines fit every make.
      const lineCoverage = spec.line_coverage || (spec.fitment === 'battery_lines' ? BATTERY_COVERAGE : null);

      for (const line of lines) {
        const brand = pick(brands, pk, line);
        const [mfr, tp] = BRANDS[brand];
        const bdisp = brand_display(brand, noun);
        const p_bv = Object.prototype.hasOwnProperty.call(cd.OPTION_BENEFIT, line) ? line : null;

        for (const fitVal of fitValues) {
          // A fit_axis part fits only the vehicles that physically accept fitVal (intersected with
          // any line coverage, e.g. battery makes); a plain universal part fits everything.
          const makesFilter = lineCoverage ? (lineCoverage[line] ?? null) : null;
          const fitment = fitAxis
            ? vehicles_matching(spec.fit_dim, fitVal, makesFilter)
            : resolve_fitment(spec.fitment, { line });
          if (fitAxis && !fitment.length) continue; // no vehicle accepts this fit value
          const makesText = human_list(makes_in_fitment(fitment));

          const base_sku = [spec.part_code, line && seg(line), fitAxis && seg(fitVal)].filter(Boolean).join('-');
          const slugFit = fitAxis ? [fitVal] : [];
          const parenFit = fitAxis ? [opt_label(fitVal)] : [];
          const img = img_block(color, `${bdisp} ${noun}`, ['BASE', 'SMALL', 'THUMBNAIL'], image_key_for(pk, line, {}));
          const common = {
            source: { locale: LOCALE },
            status: 'ENABLED',
            visibleIn: ['CATALOG', 'SEARCH'],
            attributes: part_attrs(spec, brand, mfr, tp, fitment),
            images: img,
            routes,
          };

          if (prefAxes.length === 0) {
            // hard-fit split leaves no options -> simple product
            products.push({
              sku: base_sku,
              name: _part_name(bdisp, line, noun, null, null, null, parenFit),
              slug: slugify(pk, line, ...slugFit),
              description: compose_description(base_sku, pk, brand, line, p_bv, fit_key, null, null, null, makesText),
              shortDescription: _short(spec, line, noun, null, null, null, parenFit),
              ...common,
            });
            add_price(base_sku, spec, line, fitAxis ? { [fitAxis]: fitVal } : {});
          } else {
            // configurable parent on the preference axes
            products.push({
              sku: base_sku,
              name: _part_name(bdisp, line, noun, null, null, null, parenFit),
              slug: slugify(pk, line, ...slugFit),
              description: compose_description(base_sku, pk, brand, line, p_bv, fit_key, null, null, null, makesText),
              shortDescription: _short(spec, line, noun, null, null, null, parenFit),
              ...common,
              configurations: prefAxes.map(([code, vals]) => ({
                attributeCode: code,
                label: getOr(cd.AXIS_LABEL, code, title(code.split('_').join(' '))),
                type: 'CONFIGURABLE',
                values: vals.map(v => ({
                  variantReferenceId: vref(base_sku, code, v),
                  label: v,
                })),
              })),
            });
            for (const combo of cartesian(prefAxes)) {
              const vsku = base_sku + '-' + prefAxes.map(([c]) => seg(combo[c])).join('-');
              const adj = _adjective(spec, line, combo);
              const paren = [...parenFit, ...prefAxes.filter(([c]) => c !== 'grade').map(([c]) => opt_label(combo[c]))];
              const bv = _benefit_value(spec, line, combo);
              products.push({
                sku: vsku,
                source: { locale: LOCALE },
                name: _part_name(bdisp, adj, noun, null, null, null, paren),
                slug: slugify(pk, line, ...slugFit, ...prefAxes.map(([c]) => combo[c])),
                status: 'ENABLED',
                description: compose_description(vsku, pk, brand, adj, bv, fit_key, null, null, null, makesText),
                shortDescription: _short(spec, adj, noun, null, null, null, paren),
                visibleIn: [], // Not Visible Individually — reached via the configurable parent
                attributes: part_attrs(
                  spec,
                  brand,
                  mfr,
                  tp,
                  [],
                  prefAxes.map(([c]) => vattr(base_sku, c, combo[c])),
                ),
                images: img_block(
                  color,
                  `${bdisp} ${noun}`,
                  ['BASE', 'SMALL', 'THUMBNAIL'],
                  image_key_for(pk, line, combo),
                ),
                links: [{ type: 'VARIANT_OF', sku: base_sku }],
              });
              add_price(vsku, spec, line, {
                ...combo,
                ...(fitAxis ? { [fitAxis]: fitVal } : {}),
              });
            }
          }
        }
      }
    }
  }

  return { products, sellable };
}

// ----------------------------------------------------------------------------
// Per-vehicle attribute overrides
// ----------------------------------------------------------------------------

function build_fitment_overrides() {
  const sku = 'tmk-halden-tbk-100';
  const brand = 'Halden';
  const [mfr, tp] = BRANDS[brand];
  const fitment = [];
  const drives = [];
  for (const md of MODELS['Aurora']) {
    for (const yr of YEARS) {
      for (const t of TRIMS) {
        const vsku = veh_variant_sku('Aurora', md, t, yr);
        fitment.push(vsku);
        const shafts = t === PERFORMANCE_TRIM ? cd.OVERRIDE.drivesCamshaftBalance : cd.OVERRIDE.drivesCamshaft;
        drives.push(`${vsku}::${shafts}`);
      }
    }
  }
  const { makeFitment, makeModelFitment } = coarse_fitment(fitment);
  const color = SYS_COLOR[top_system('engine/timing')];
  const product = {
    sku,
    source: { locale: LOCALE },
    name: cd.OVERRIDE.name,
    slug: 'timing-belt-kit-halden-tbk-100',
    status: 'ENABLED',
    description: cd.OVERRIDE.description,
    shortDescription: cd.OVERRIDE.shortDescription,
    visibleIn: ['CATALOG', 'SEARCH'],
    attributes: [
      attr('object_type', 'part'),
      attr('part_category', 'engine'),
      attr('brand', brand),
      attr('manufacturer', mfr),
      attr('sold_by_third_party', tp ? 'true' : 'false'),
      attr('fitment', ...fitment),
      attr('make_fitment', ...makeFitment),
      attr('make_model_fitment', ...makeModelFitment),
      attr('fitment_drives', ...drives),
    ],
    images: img_block(color, cd.OVERRIDE.imageLabel, ['BASE', 'SMALL', 'THUMBNAIL'], 'engine/timing-belt-kit'),
    routes: to_routes('engine/timing'),
  };
  return { products: [product], sellable: [[sku, 189.99, false]] };
}

// Mimics Python str.title(): capitalize each word, lowercase the rest.
function title(s) {
  return s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

// ----------------------------------------------------------------------------
// Price books + prices
// ----------------------------------------------------------------------------
function build_pricebooks() {
  return [
    { priceBookId: 'base-usd', name: 'USD Base', currency: 'USD' },
    { priceBookId: 'public-usd', name: 'Public USD', parentId: 'base-usd' },
    { priceBookId: 'vip-usd', name: 'VIP USD', parentId: 'base-usd' },
    { priceBookId: 'base-eur', name: 'EUR Base', currency: 'EUR' },
    { priceBookId: 'public-eur', name: 'Public EUR', parentId: 'base-eur' },
    { priceBookId: 'vip-eur', name: 'VIP EUR', parentId: 'base-eur' },
  ];
}

const TIERS = [
  { qty: 5, percentage: 10 },
  { qty: 10, percentage: 15 },
];

function build_prices(sellable) {
  const out = [];
  for (const [sku, usd_pub, consumable] of sellable) {
    const usd_vip = tidy(usd_pub * 0.85);
    const eur_pub = tidy(usd_pub * 0.92);
    const eur_vip = tidy(eur_pub * 0.85);
    const rows = [
      ['base-usd', usd_pub, true],
      ['public-usd', usd_pub, true],
      ['vip-usd', usd_vip, false],
      ['base-eur', eur_pub, true],
      ['public-eur', eur_pub, true],
      ['vip-eur', eur_vip, false],
    ];
    for (const [pb, val, tier_ok] of rows) {
      const row = { sku, priceBookId: pb, regular: val };
      if (ADD_TIERS && consumable && tier_ok) {
        row.tierPrices = TIERS.map(t => ({ ...t }));
      }
      out.push(row);
    }
  }
  return out;
}

// ----------------------------------------------------------------------------
// Write + validate
// ----------------------------------------------------------------------------
function write(name, data) {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  const kb = Math.floor(fs.statSync(p).size / 1024);
  console.log(`  wrote ${name.padEnd(26)} ${String(data.length).padStart(6)} items  (${kb} KB)`);
  return p;
}

function validate(pmeta, cmeta, cats, prods, pbs, prices, sellable) {
  const errs = [];
  const cat_slugs = new Set(cats.map(c => c.slug));
  const prod_by_sku = new Map();
  for (const p of prods) {
    if (prod_by_sku.has(p.sku)) errs.push(`duplicate sku ${p.sku}`);
    prod_by_sku.set(p.sku, p);
  }
  const vehicle_skus = new Set(prods.filter(p => p.sku.startsWith('veh-')).map(p => p.sku));
  const sellable_skus = new Set(sellable.map(s => s[0]));

  // required fields
  for (const p of prods) {
    for (const k of ['sku', 'source', 'name', 'slug', 'status']) {
      if (!(k in p)) errs.push(`${p.sku ?? '?'} missing ${k}`);
    }
    if (!['ENABLED', 'DISABLED'].includes(p.status)) errs.push(`${p.sku} bad status`);
  }

  // VARIANT_OF targets exist
  for (const p of prods) {
    for (const lk of p.links || []) {
      if (lk.type === 'VARIANT_OF' && !prod_by_sku.has(lk.sku)) {
        errs.push(`${p.sku} VARIANT_OF missing parent ${lk.sku}`);
      }
      if (lk.type === 'related' && !prod_by_sku.has(lk.sku)) {
        errs.push(`${p.sku} related missing ${lk.sku}`);
      }
    }
  }

  // fitment targets exist (non-sentinel) and point at vehicles
  for (const p of prods) {
    for (const a of p.attributes || []) {
      if (a.code === 'fitment') {
        for (const v of a.values) {
          if (v === 'UNIVERSAL') continue;
          if (!prod_by_sku.has(v)) errs.push(`${p.sku} fitment -> unknown ${v}`);
          else if (!vehicle_skus.has(v)) errs.push(`${p.sku} fitment -> non-vehicle ${v}`);
        }
      }
    }
  }

  // every route path (leaf and each ancestor) must match a known category slug
  for (const p of prods) {
    for (const r of p.routes || []) {
      if (!cat_slugs.has(r.path)) errs.push(`${p.sku} route to unknown category ${r.path}`);
    }
  }

  // configurable parents have configurations; every config value has a variant
  for (const p of prods) {
    if ('configurations' in p) {
      const declared = new Set();
      for (const c of p.configurations)
        for (const v of c.values) declared.add(`${c.attributeCode} ${v.variantReferenceId}`);
      const found = new Set();
      for (const q of prods) {
        if ((q.links || []).some(l => l.sku === p.sku && l.type === 'VARIANT_OF')) {
          for (const a of q.attributes || []) {
            if ('variantReferenceId' in a) found.add(`${a.code} ${a.variantReferenceId}`);
          }
        }
      }
      const missing = [...declared].filter(d => !found.has(d));
      if (missing.length) errs.push(`${p.sku} config value(s) with no variant: ${missing.slice(0, 3)}`);
    }
  }

  // prices
  const pb_ids = new Set(pbs.map(b => b.priceBookId));
  const price_cover = new Map();
  for (const pr of prices) {
    if (!pb_ids.has(pr.priceBookId)) errs.push(`price for unknown book ${pr.priceBookId}`);
    if (!sellable_skus.has(pr.sku)) errs.push(`price for non-sellable sku ${pr.sku}`);
    if (vehicle_skus.has(pr.sku)) errs.push(`price on reference vehicle ${pr.sku}`);
    if (typeof pr.regular !== 'number' || pr.regular <= 0) errs.push(`bad price ${pr.sku} ${pr.priceBookId}`);
    if (!price_cover.has(pr.sku)) price_cover.set(pr.sku, new Set());
    price_cover.get(pr.sku).add(pr.priceBookId);
  }
  for (const sku of sellable_skus) {
    const have = price_cover.get(sku) || new Set();
    const miss = [...pb_ids].filter(id => !have.has(id));
    if (miss.length) {
      errs.push(`${sku} missing price books ${miss}`);
      break;
    }
  }

  const parent_skus = new Set(prods.filter(p => 'configurations' in p).map(p => p.sku));
  for (const pr of prices) {
    if (parent_skus.has(pr.sku)) errs.push(`price on configurable parent ${pr.sku}`);
  }

  // child price books reference valid parents
  for (const b of pbs) {
    if ('parentId' in b && !pb_ids.has(b.parentId)) errs.push(`price book ${b.priceBookId} bad parent`);
  }

  const partKeyByCode = Object.fromEntries(PART_SPECS.map(s => [s.part_code, s.key]));
  const HAZARD_NOUNS = [
    [cd.PHRASES.hazardNouns.tire, new Set(['tires'])],
    [cd.PHRASES.hazardNouns.wheel, new Set(['wheels'])],
    [cd.PHRASES.hazardNouns.brake, new Set(['brake-pads', 'brake-rotors', 'brake-calipers', 'brake-fluid'])],
  ];
  for (const p of prods) {
    if (p.sku.startsWith('veh-')) continue;
    const key = partKeyByCode[p.sku.split('-')[0]];
    const text = `${p.name} ${p.shortDescription ?? ''} ${p.description ?? ''}`.toLowerCase();
    for (const [noun, allowed] of HAZARD_NOUNS) {
      if (allowed.has(key) || !new RegExp(`\\b${noun}`).test(text)) continue;
      errs.push(`${p.sku} (${key}) copy mentions foreign product noun "${noun}"`);
    }
  }

  const BANNED = new Set(
    // smart quotes, en/em dashes, non-breaking space, ellipsis
    [0x2018, 0x2019, 0x201c, 0x201d, 0x2013, 0x2014, 0x00a0, 0x2026].map(c => String.fromCharCode(c)),
  );
  const scan = (o, where) => {
    if (typeof o === 'string') {
      for (const ch of o) {
        if (BANNED.has(ch)) {
          errs.push(`banned typographic char in ${where}: ${JSON.stringify(o.slice(0, 40))}`);
          break;
        }
      }
    } else if (Array.isArray(o)) {
      for (const v of o) scan(v, where);
    } else if (o && typeof o === 'object') {
      for (const v of Object.values(o)) scan(v, where);
    }
  };
  for (const [feed, name] of [
    [pmeta, 'product_metadata'],
    [cmeta, 'category_metadata'],
    [cats, 'categories'],
    [prods, 'products'],
    [pbs, 'pricebooks'],
    [prices, 'prices'],
  ]) {
    scan(feed, name);
  }

  const asciiOnly = s => [...String(s)].every(c => c.codePointAt(0) <= 127);
  for (const p of prods) {
    if (!asciiOnly(p.sku)) errs.push(`non-ASCII sku ${JSON.stringify(p.sku)}`);
    if (p.slug && !asciiOnly(p.slug)) errs.push(`non-ASCII slug on ${p.sku}: ${JSON.stringify(p.slug)}`);
  }
  for (const c of cats) {
    if (c.slug && !asciiOnly(c.slug)) errs.push(`non-ASCII category slug ${JSON.stringify(c.slug)}`);
  }

  return errs;
}

function generateOne() {
  console.log(`\nGenerating Carvelo Parts 2.0 dataset [${LOCALE}]...\n`);
  const pmeta = build_product_metadata();
  const cmeta = build_category_metadata();
  const cats = build_categories();
  const vehicles = build_vehicles();
  const { products: parts, sellable } = build_parts();
  const overrides = build_fitment_overrides();
  parts.push(...overrides.products);
  sellable.push(...overrides.sellable);
  const prods = vehicles.concat(parts);
  const pbs = build_pricebooks();
  const prices = build_prices(sellable);

  fs.mkdirSync(OUT, { recursive: true });
  write('product_metadata.json', pmeta);
  write('category_metadata.json', cmeta);
  write('categories.json', cats);
  write('products.json', prods);
  write('pricebooks.json', pbs);
  write('prices.json', prices);

  const n_veh = vehicles.length;
  const n_parent = parts.filter(p => 'configurations' in p).length;
  const n_variant = parts.filter(p => (p.links || []).some(l => l.type === 'VARIANT_OF')).length;
  const n_simple = parts.length - n_parent - n_variant;
  console.log(`\n  vehicles (reference)      ${n_veh}`);
  console.log(`  part configurable parents ${n_parent}`);
  console.log(`  part variants             ${n_variant}`);
  console.log(`  part simples              ${n_simple}`);
  console.log(`  sellable SKUs (priced)    ${sellable.length}`);
  console.log(`  total products            ${prods.length}`);
  console.log(`  total prices              ${prices.length}`);

  const errs = validate(pmeta, cmeta, cats, prods, pbs, prices, sellable);
  console.log('\nVALIDATION:', errs.length === 0 ? 'PASS' : `FAIL (${errs.length} issues)`);
  for (const e of errs.slice(0, 25)) console.log('   -', e);
  if (errs.length) throw new Error(`validation failed with ${errs.length} issue(s)`);
}

async function main() {
  for (const locale of parseLocaleArgs()) {
    await setLocale(locale);
    generateOne();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
