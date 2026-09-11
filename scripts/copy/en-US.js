// Carvelo Parts 2.0 -- en-US copy deck.
//
// Plain-language fragments that generate.js slots together into product and
// category names / descriptions. Edit copy HERE; the composition logic lives in
// generate.js. Every locale file (en-US.js, fr-FR.js, ...) exports the same shape.
// Identifiers (SKUs, slugs, attribute codes, variantReferenceIds, brand/make/model
// proper nouns) are NOT copy and never live here.

// One sentence on what each part is / does. Keyed by PART_SPECS "key".
export const PART_INTRO = {
  'brake-pads':
    'Where confidence meets the road: brake pads with firm, fade-resistant bite that keep every stop short, quiet, and sure.',
  'brake-rotors':
    'Cool-running brake rotors that shrug off heat and resist fade, so stopping stays sharp from the gentlest slowdown to the hardest.',
  'brake-calipers':
    'The clamping muscle behind every confident stop: a brake caliper that applies smooth, even, reliable force mile after mile.',
  shocks:
    'Composed control over broken pavement: shock absorbers that soak up the rough stuff and keep the ride flat, settled, and sure.',
  springs:
    'Coil springs that set the stance and carry the load, dialed for the right ride height and a planted, confident feel.',
  'control-arms':
    'The quiet backbone of precise handling: control arms that keep the suspension located, aligned, and true through every mile.',
  'sway-bars':
    'Flatter, more confident cornering: a sway bar that ties the suspension together and reins in body roll when the road turns.',
  clutch:
    'Crisp, positive engagement every time: a clutch kit built to grab cleanly and hold, from the daily commute to spirited driving.',
  flywheel:
    'A flat, precisely balanced flywheel that gives the clutch a true surface to grip, for smoother launches and steadier power.',
  charger:
    'Reliable, efficient charging that keeps the electrical system topped up and ready: an onboard charger you can set and forget.',
  alternator:
    'Steady power on the move: an alternator that keeps the electrical system charged and everything running, revs high or low.',
  starter:
    'First-turn starts, every time: a starter motor that cranks strong in heat, cold, and everything in between.',
  'fuel-pump':
    'Steady fuel delivery under any load: a fuel pump that holds pressure constant so the engine never goes hungry.',
  tires: 'Where every drive really happens: tires tuned for confident grip, a quiet ride, and the miles to back it up.',
  wheels: 'The first thing anyone notices: wheels engineered to be light, strong, and unmistakable at the curb.',
  battery:
    'Dependable cranking power and steady voltage: a battery that starts strong and holds up through every season.',
  oil: 'Cleaner, cooler running from every quart: motor oil that lubricates, protects, and keeps the engine performing like new.',
  'brake-fluid':
    'Firm, confident pedal feel: brake fluid engineered to resist heat and moisture so braking stays crisp and responsive.',
  'trans-fluid':
    'Crisp, cool, consistent shifts: transmission fluid that protects the gearbox and keeps power flowing smoothly.',
  'wiper-fluid':
    'A clear view in any weather: washer fluid that cuts through grime, bugs, and winter salt in a single pass.',
  'spark-plugs':
    'Sharper throttle response and smoother economy: spark plugs that light every cylinder cleanly, start after start.',
  'air-filter':
    'Clean air and freer breathing: an air filter that keeps grit out while letting the engine inhale deeply.',
  'oil-filter':
    'Long-lasting engine protection: an oil filter that traps the fine particles so clean oil keeps circulating.',
  'fuel-filter':
    'Protects what matters most: a fuel filter that screens out contaminants before they ever reach the injectors.',
};

// The differentiator clause for a "character" option value. Dimensional options
// (sizes, profiles, volumes, group sizes, bolt patterns) carry no clause; they
// read in the name instead. Missing key -> no clause.
export const OPTION_BENEFIT = {
  // grade (brakes / suspension)
  Eco: 'The Eco grade is tuned for quiet, low-dust daily driving and a long, worry-free life.',
  Performance: 'The Performance grade steps up to a higher-spec build for stronger, steadier bite when you push hard.',
  Luxury: 'The Luxury grade is tuned for a soft, hushed, refined ride that takes the edge off every mile.',
  // battery lines
  Economy: 'The Economy line covers the essentials at a smart, no-surprises price.',
  Standard: 'The Standard line is a balanced, do-it-all choice for everyday driving.',
  AGM: 'The AGM build resists vibration and shrugs off heavy electrical loads and frequent restarts.',
  // oil viscosity
  '0W-20': 'A 0W-20 weight flows fast on cold starts for modern, low-friction engines.',
  '5W-30': 'A 5W-30 weight is the versatile pick, at home across a wide range of engines and climates.',
  '10W-40': 'A 10W-40 weight holds its film under heat and in higher-mileage engines.',
  // filter media
  'High-Flow': 'The high-flow media opens up airflow for a freer-breathing intake.',
  Extended: 'The extended-life media stretches the interval between changes.',
  // spark plug lines
  Copper: 'Copper electrodes deliver a strong, dependable spark at a value price.',
  Iridium: 'Iridium electrodes hold their fine edge far longer for a precise, reliable spark.',
  // tire lines
  'All-Season': 'The all-season tread balances grip in the dry, the wet, and light winter.',
  Sport: 'The sport compound trades a little tread life for sharper dry and wet grip.',
  'Off-Road': 'The off-road tread bites into loose surfaces and shrugs off trail abuse.',
  // wheel lines
  Aero: 'The aero face is smooth and sculpted for a clean, modern look.',
  Mesh: 'The light, open mesh spokes give an airy face with plenty of attitude.',
  Forged: "Forged construction is lighter and stronger than a cast wheel, the enthusiast's pick.",
  // tire speed rating
  Z: 'The Z speed rating is built for sustained high-speed stability.',
};

// Human-readable label for an option value when it appears in names / copy.
// Missing key -> the raw value is used as-is. Localizes line/grade/trim badges
// and dimensional values; identity (variantReferenceId, SKU segment) is unaffected.
export const OPTION_DISPLAY = {
  '17"': '17-inch',
  '18"': '18-inch',
  '19"': '19-inch',
  '20"': '20-inch',
  H: 'H-rated',
  V: 'V-rated',
  Z: 'Z-rated',
  'GRP-24': 'Group 24',
  'GRP-48': 'Group 48',
  'GRP-65': 'Group 65',
};

// One-line brand positioning. Keyed by brand name (see generate.js BRANDS).
export const BRAND_VOICE = {
  'Carvelo OE': 'Genuine Carvelo original-equipment parts, built to the same spec as the factory fitment.',
  Halden: 'Halden focuses on quiet, dependable braking for everyday drivers.',
  'Torqa Performance': 'Torqa Performance builds track-ready hardware for drivers who push harder.',
  RideWorks: 'RideWorks tunes its suspension for a comfortable, well-controlled ride.',
  'Apex Dynamics': 'Apex Dynamics engineers stiffer, sportier suspension for enthusiast handling.',
  Terravox: 'Terravox builds tires for confident grip in real-world conditions.',
  Aeroline: 'Aeroline chases lightweight performance for drivers who want an edge.',
  Forgecraft: 'Forgecraft specializes in light, strong wheels with a clean finish.',
  Voltaic: 'Voltaic makes reliable electrical parts you can count on to start every time.',
  AmpEdge: 'AmpEdge pushes higher output for demanding electrical builds.',
  PureFlow: 'PureFlow blends clean, consistent fluids to tight factory tolerances.',
  'Vireo Lubricants': 'Vireo formulates high-performance lubricants for hard-working engines.',
  Ignis: 'Ignis makes dependable ignition parts for a clean, reliable spark.',
  Cleanstream: 'Cleanstream builds filters that protect the engine without choking it.',
  FuelPro: 'FuelPro engineers high-flow fuel delivery for stronger, cleaner running.',
  GearMark: 'GearMark builds driveline parts for smooth, positive shifts.',
};

// Fitment sentence. {make} {model} {year} {makes} are filled in by generate.js.
export const FITMENT_PHRASE = {
  direct_fit: 'A direct-fit replacement for the {make} {model} {year}.',
  direct_fit_perf: 'A direct-fit upgrade for the {make} {model} Performance {year}.',
  universal: 'Universal fit across Aurora, Bolt, and Cruz vehicles.',
  broad: 'Fits a range of {makes} vehicles.',
};

// Category descriptions, keyed by slug. Used for description + meta description.
export const CATEGORY_BLURB = {
  brakes: 'Everything that brings your Carvelo to a stop, from pads and rotors to calipers and fluid.',
  'brakes/pads': 'Replacement and upgrade brake pads for confident, quiet stops.',
  'brakes/rotors': 'Brake rotors that shed heat for steady, fade-free braking.',
  'brakes/calipers': 'Brake calipers that clamp the pads with even, reliable force.',
  'brakes/fluid': 'Brake fluid to keep pedal feel firm and braking responsive.',
  suspension: 'Suspension parts that control the ride and keep the vehicle planted and composed.',
  'suspension/shocks': 'Shock absorbers for a composed ride over any road.',
  'suspension/springs': 'Coil springs that set ride height and carry the load.',
  'suspension/control-arms': 'Control arms that keep the suspension located and hold alignment true.',
  'suspension/sway-bars': 'Sway bars that reduce body roll through the corners.',
  tires: 'Tires for every Carvelo, tuned for grip, comfort, and quiet.',
  transmission: 'Driveline parts that keep shifts smooth and power flowing.',
  'transmission/fluid': 'Transmission fluid for crisp, cool, reliable shifts.',
  'transmission/clutch': 'Clutch kits that couple engine to gearbox with a positive bite.',
  'transmission/flywheel': 'Flywheels that give the clutch a flat, balanced surface to grip.',
  'charging-system': "The parts that store and replenish your vehicle's electrical energy.",
  'charging-system/charger': 'Onboard chargers that top up the battery safely and efficiently.',
  'charging-system/batteries': 'Batteries that start the vehicle and steady the electrical system.',
  wheels: 'Wheels that carry the load and set the stance of your Carvelo.',
  electrical: 'Electrical parts that start the vehicle and keep the power flowing.',
  'electrical/alternators': 'Alternators that keep the battery charged on the move.',
  'electrical/starters': 'Starter motors that crank the engine to life every time.',
  'electrical/batteries': 'Batteries that start the vehicle and steady the electrical system.',
  fluids: 'Oils and fluids that keep every system running clean and cool.',
  'fluids/oil': 'Motor oil that lubricates, cools, and protects the engine.',
  'fluids/transmission': 'Transmission fluid for crisp, cool, reliable shifts.',
  'fluids/brake-fluid': 'Brake fluid to keep pedal feel firm and braking responsive.',
  'fluids/wiper-fluid': 'Washer fluid for a clear windshield in any weather.',
  engine: 'Engine parts that keep combustion clean, fed, and breathing.',
  'engine/fuel-pump': 'Fuel pumps that deliver steady pressure under any load.',
  'engine/fuel-filters': 'Fuel filters that screen out grit before it reaches the injectors.',
  'engine/air-filters': 'Air filters that keep the engine breathing clean air.',
  'engine/oil-filters': 'Oil filters that trap the particles motor oil picks up.',
  'engine/spark-plugs': 'Spark plugs for a clean, reliable spark and sharp response.',
};

// Part noun shown in product names / image labels. Keyed by PART_SPECS "key".
export const PART_NOUN = {
  'brake-pads': 'Brake Pads',
  'brake-rotors': 'Brake Rotors',
  'brake-calipers': 'Brake Caliper',
  shocks: 'Shock Absorber',
  springs: 'Coil Spring',
  'control-arms': 'Control Arm',
  'sway-bars': 'Sway Bar',
  clutch: 'Clutch Kit',
  flywheel: 'Flywheel',
  charger: 'Onboard Charger',
  alternator: 'Alternator',
  starter: 'Starter Motor',
  'fuel-pump': 'Fuel Pump',
  tires: 'Tire',
  wheels: 'Wheel',
  battery: 'Battery',
  oil: 'Motor Oil',
  'brake-fluid': 'Brake Fluid',
  'trans-fluid': 'Transmission Fluid',
  'wiper-fluid': 'Wiper Fluid',
  'spark-plugs': 'Spark Plug',
  'air-filter': 'Air Filter',
  'oil-filter': 'Oil Filter',
  'fuel-filter': 'Fuel Filter',
};

// Category display name, keyed by slug (slug stays identity across locales).
export const CATEGORY_NAME = {
  brakes: 'Brakes',
  'brakes/pads': 'Brake Pads',
  'brakes/rotors': 'Brake Rotors',
  'brakes/calipers': 'Brake Calipers',
  'brakes/fluid': 'Brake Fluid',
  suspension: 'Suspension',
  'suspension/shocks': 'Shocks',
  'suspension/springs': 'Springs',
  'suspension/control-arms': 'Control Arms',
  'suspension/sway-bars': 'Sway Bars',
  tires: 'Tires',
  transmission: 'Transmission',
  'transmission/fluid': 'Transmission Fluid',
  'transmission/clutch': 'Clutch',
  'transmission/flywheel': 'Flywheel',
  'charging-system': 'Charging System',
  'charging-system/charger': 'Charger',
  'charging-system/batteries': 'Batteries',
  wheels: 'Wheels',
  electrical: 'Electrical',
  'electrical/alternators': 'Alternators',
  'electrical/starters': 'Starters',
  'electrical/batteries': 'Batteries',
  fluids: 'Fluids',
  'fluids/oil': 'Oil',
  'fluids/transmission': 'Transmission Fluid',
  'fluids/brake-fluid': 'Brake Fluid',
  'fluids/wiper-fluid': 'Wiper Fluid',
  engine: 'Engine',
  'engine/timing': 'Timing',
  'engine/fuel-pump': 'Fuel Pump',
  'engine/fuel-filters': 'Fuel Filters',
  'engine/air-filters': 'Air Filters',
  'engine/oil-filters': 'Oil Filters',
  'engine/spark-plugs': 'Spark Plugs',
};

// Product-metadata attribute labels, keyed by attribute code.
export const ATTR_LABEL = {
  sku: 'SKU',
  name: 'Name',
  description: 'Description',
  shortDescription: 'Short Description',
  price: 'Price',
  object_type: 'Object Type',
  make: 'Vehicle Make',
  model: 'Vehicle Model',
  trim: 'Vehicle Trim',
  year: 'Vehicle Year',
  part_category: 'Part Category',
  brand: 'Brand',
  manufacturer: 'Manufacturer',
  fitment: 'Fitment',
  make_fitment: 'Fits Make',
  make_model_fitment: 'Fits Model',
  fitment_drives: 'Drives',
  sold_by_third_party: 'Sold by Third Party',
  grade: 'Grade',
  size: 'Size',
  profile: 'Profile',
  rating: 'Speed Rating',
  bolt_pattern: 'Bolt Pattern',
  group_size: 'Group Size',
  volume: 'Volume',
  viscosity: 'Viscosity',
};

// Configurable-option axis labels shown on the parent product, keyed by axis code.
// Distinct from ATTR_LABEL (e.g. rating reads "Rating" here, "Speed Rating" there).
export const AXIS_LABEL = {
  trim: 'Trim',
  year: 'Year',
  grade: 'Grade',
  size: 'Size',
  profile: 'Profile',
  rating: 'Rating',
  bolt_pattern: 'Bolt Pattern',
  group_size: 'Group Size',
  volume: 'Volume',
  viscosity: 'Viscosity',
};

// Connective words, name/short templates, reference-vehicle blurbs, metaTags scaffolding,
// and the validator's per-locale product-noun list.
export const PHRASES = {
  // Word before the vehicle in a part name/short ("... for Aurora Flux 2024").
  for: 'for',
  // human_list conjunction + whether to use an Oxford comma before it.
  listAnd: 'and',
  listOxford: true,
  // universal-part short-description tails.
  fitsMany: 'fits many vehicles',
  universalFit: 'universal fit',
  // reference-vehicle copy. {name} = "Make Model" or "Make Model Trim Year".
  refLineDesc: 'Reference vehicle line: {name}. Not sold; used for parts fitment.',
  refLineShort: '{name} (reference vehicle)',
  refVariantDesc: 'Reference vehicle: {name}.',
  // category metaTags. {name} = category display name.
  metaTitle: '{name} | Carvelo Parts',
  keywords: ['carvelo', 'auto', 'parts'],
  // Cross-category search-hygiene nouns (validator). Keyed by stable family; value is the
  // localized noun that must not leak into a foreign family's copy.
  hazardNouns: { tire: 'tire', wheel: 'wheel', brake: 'brake' },
};

// The single per-vehicle-override product (Halden timing belt kit). Brand + code stay identity.
export const OVERRIDE = {
  name: 'Halden Timing Belt Kit TBK-100',
  description:
    'Complete timing belt kit for Aurora engines. Includes a reinforced toothed ' +
    'timing belt, tensioner damper, and tension pulley for a reliable, quiet valvetrain drive, ' +
    'engineered as a direct-fit replacement for the original timing system.',
  shortDescription: 'Complete timing belt kit for Aurora engines.',
  imageLabel: 'Halden Timing Belt Kit',
  // fitment_drives display tokens -- must stay comma-free (they ride in PaaS additional_attributes).
  drivesCamshaft: 'Camshaft',
  drivesCamshaftBalance: 'Camshaft and balance shaft',
};

// English places the descriptive adjective before the noun ("Sport Tire").
export const NAME_ADJ_AFTER_NOUN = false;
