// Carvelo Parts 2.0 -- copy deck.
//
// Plain-language fragments that generate.js slots together into product and
// category names / descriptions. Edit copy HERE; the composition logic lives in
// generate.js. Keep everything ASCII: no em dashes, no smart quotes, no unicode.

// One sentence on what each part is / does. Keyed by PART_SPECS "key".
export const PART_INTRO = {
  "brake-pads": "Brake pads press against the rotor to slow the vehicle and are the first thing to check at any brake service.",
  "brake-rotors": "Brake rotors are the discs the pads clamp onto, shedding heat to keep braking steady stop after stop.",
  "brake-calipers": "The brake caliper holds the pistons that squeeze the pads against the rotor, and it is the muscle behind every stop.",
  "shocks": "Shock absorbers damp the springs to keep the tires planted and the ride composed over rough pavement.",
  "springs": "Coil springs carry the weight of the vehicle and set its ride height and stance.",
  "control-arms": "Control arms locate the wheel and let the suspension move through its travel while keeping alignment true.",
  "sway-bars": "The sway bar ties the left and right suspension together to cut body roll through corners.",
  "clutch": "The clutch kit couples the engine to the transmission, and wear here shows up as slipping or a heavy pedal.",
  "flywheel": "The flywheel stores rotational energy and gives the clutch a flat, balanced surface to grip.",
  "charger": "The onboard charger converts incoming power to top up the battery safely and efficiently.",
  "alternator": "The alternator keeps the battery charged and the electrical system powered while the engine runs.",
  "starter": "The starter motor cranks the engine to life every time the key is turned.",
  "fuel-pump": "The fuel pump delivers a steady supply of fuel from the tank to the engine under all conditions.",
  "tires": "Tires are the only contact between the vehicle and the road, so they shape grip, comfort, and noise.",
  "wheels": "Wheels carry the tires and the weight of the vehicle while setting much of its stance and character.",
  "battery": "The battery supplies the power to start the vehicle and steadies the electrical system on the move.",
  "oil": "Motor oil lubricates and cools the moving parts of the engine and carries away the debris of daily running.",
  "brake-fluid": "Brake fluid carries pedal pressure to the calipers, and its condition directly affects braking feel.",
  "trans-fluid": "Transmission fluid lubricates and cools the gearbox while carrying the pressure that makes shifts crisp.",
  "wiper-fluid": "Washer fluid clears the windshield of grime, bugs, and winter salt for safe visibility.",
  "spark-plugs": "Spark plugs ignite the air and fuel in each cylinder, and fresh plugs sharpen response and economy.",
  "air-filter": "The air filter keeps grit out of the engine while letting it breathe freely.",
  "oil-filter": "The oil filter traps the particles that motor oil picks up, protecting the engine between changes.",
  "fuel-filter": "The fuel filter screens out contaminants before they reach the injectors.",
};

// The differentiator clause for a "character" option value. Dimensional options
// (sizes, profiles, volumes, group sizes, bolt patterns) carry no clause; they
// read in the name instead. Missing key -> no clause.
export const OPTION_BENEFIT = {
  // grade (brakes / suspension)
  "Eco": "The Eco grade is tuned for quiet, low-dust daily driving and long life.",
  "Performance": "The Performance grade uses a higher-spec build for stronger, steadier work when pushed hard.",
  "Luxury": "The Luxury grade is tuned for a soft, quiet, refined ride.",
  // battery lines
  "Economy": "The Economy line covers the essentials at a value price.",
  "Standard": "The Standard line is a balanced choice for everyday driving.",
  "AGM": "The AGM build resists vibration and handles heavy electrical loads and frequent restarts.",
  // oil viscosity
  "0W-20": "A 0W-20 weight flows fast on cold starts for modern low-friction engines.",
  "5W-30": "A 5W-30 weight suits a wide range of engines and climates.",
  "10W-40": "A 10W-40 weight holds up under heat and in higher-mileage engines.",
  // filter media
  "High-Flow": "The high-flow media opens up airflow for a freer-breathing intake.",
  "Extended": "The extended-life media stretches the interval between changes.",
  // spark plug lines
  "Copper": "Copper electrodes deliver a strong spark at a value price.",
  "Iridium": "Iridium electrodes hold their edge far longer for a fine, reliable spark.",
  // tire lines
  "All-Season": "The all-season tread balances grip in dry, wet, and light winter conditions.",
  "Sport": "The sport compound trades a little tread life for sharper dry and wet grip.",
  "Off-Road": "The off-road tread bites into loose surfaces and shrugs off trail abuse.",
  // wheel lines
  "Aero": "The aero design smooths airflow for a clean, modern look.",
  "Mesh": "The mesh spokes are light and show off the brakes behind them.",
  "Forged": "Forged construction is lighter and stronger than a cast wheel.",
  // tire speed rating
  "Z": "The Z speed rating is built for sustained high-speed stability.",
};

// Human-readable label for an option value when it appears in names / copy.
// Missing key -> the raw value is used as-is.
export const OPTION_DISPLAY = {
  '17"': "17-inch", '18"': "18-inch", '19"': "19-inch", '20"': "20-inch",
  "H": "H-rated", "V": "V-rated", "Z": "Z-rated",
  "GRP-24": "Group 24", "GRP-48": "Group 48", "GRP-65": "Group 65",
};

// One-line brand positioning. Keyed by brand name (see generate.js BRANDS).
export const BRAND_VOICE = {
  "Carvelo OE": "Genuine Carvelo original-equipment parts, built to the same spec as the factory fitment.",
  "Halden": "Halden focuses on quiet, dependable braking for everyday drivers.",
  "Torqa Performance": "Torqa Performance builds track-ready hardware for drivers who push harder.",
  "RideWorks": "RideWorks tunes its suspension for a comfortable, well-controlled ride.",
  "Apex Dynamics": "Apex Dynamics engineers stiffer, sportier suspension for enthusiast handling.",
  "Terravox": "Terravox builds tires for confident grip in real-world conditions.",
  "Aeroline": "Aeroline chases lightweight performance for drivers who want an edge.",
  "Forgecraft": "Forgecraft specializes in light, strong wheels with a clean finish.",
  "Voltaic": "Voltaic makes reliable electrical parts you can count on to start every time.",
  "AmpEdge": "AmpEdge pushes higher output for demanding electrical builds.",
  "PureFlow": "PureFlow blends clean, consistent fluids to tight factory tolerances.",
  "Vireo Lubricants": "Vireo formulates high-performance lubricants for hard-working engines.",
  "Ignis": "Ignis makes dependable ignition parts for a clean, reliable spark.",
  "Cleanstream": "Cleanstream builds filters that protect the engine without choking it.",
  "FuelPro": "FuelPro engineers high-flow fuel delivery for stronger, cleaner running.",
  "GearMark": "GearMark builds driveline parts for smooth, positive shifts.",
};

// Fitment sentence. {make} {model} {year} are filled in by generate.js.
export const FITMENT_PHRASE = {
  "direct_fit": "A direct-fit replacement for the {make} {model} {year}.",
  "direct_fit_perf": "A direct-fit upgrade for the {make} {model} Performance {year}.",
  "universal": "Universal fit across Aurora, Bolt, and Cruz vehicles.",
  "broad": "Fits a wide range of Aurora, Bolt, and Cruz vehicles.",
};

// Category descriptions, keyed by slug. Used for description + meta description.
export const CATEGORY_BLURB = {
  "brakes": "Everything that brings your Carvelo to a stop, from pads and rotors to calipers and fluid.",
  "brakes/pads": "Replacement and upgrade brake pads for confident, quiet stops.",
  "brakes/rotors": "Brake rotors that shed heat for steady, fade-free braking.",
  "brakes/calipers": "Brake calipers that clamp the pads with even, reliable force.",
  "brakes/fluid": "Brake fluid to keep pedal feel firm and braking responsive.",
  "suspension": "Suspension parts that control the ride and keep the tires planted.",
  "suspension/shocks": "Shock absorbers for a composed ride over any road.",
  "suspension/springs": "Coil springs that set ride height and carry the load.",
  "suspension/control-arms": "Control arms that locate the wheels and hold alignment true.",
  "suspension/sway-bars": "Sway bars that reduce body roll through the corners.",
  "tires": "Tires for every Carvelo, tuned for grip, comfort, and quiet.",
  "transmission": "Driveline parts that keep shifts smooth and power flowing.",
  "transmission/fluid": "Transmission fluid for crisp, cool, reliable shifts.",
  "transmission/clutch": "Clutch kits that couple engine to gearbox with a positive bite.",
  "transmission/flywheel": "Flywheels that give the clutch a flat, balanced surface to grip.",
  "charging-system": "The parts that store and replenish your vehicle's electrical energy.",
  "charging-system/charger": "Onboard chargers that top up the battery safely and efficiently.",
  "charging-system/batteries": "Batteries that start the vehicle and steady the electrical system.",
  "wheels": "Wheels that carry the load and set the stance of your Carvelo.",
  "electrical": "Electrical parts that start the vehicle and keep the power flowing.",
  "electrical/alternators": "Alternators that keep the battery charged on the move.",
  "electrical/starters": "Starter motors that crank the engine to life every time.",
  "electrical/batteries": "Batteries that start the vehicle and steady the electrical system.",
  "fluids": "Oils and fluids that keep every system running clean and cool.",
  "fluids/oil": "Motor oil that lubricates, cools, and protects the engine.",
  "fluids/transmission": "Transmission fluid for crisp, cool, reliable shifts.",
  "fluids/brake-fluid": "Brake fluid to keep pedal feel firm and braking responsive.",
  "fluids/wiper-fluid": "Washer fluid for a clear windshield in any weather.",
  "engine": "Engine parts that keep combustion clean, fed, and breathing.",
  "engine/fuel-pump": "Fuel pumps that deliver steady pressure under any load.",
  "engine/fuel-filters": "Fuel filters that screen out grit before it reaches the injectors.",
  "engine/air-filters": "Air filters that keep the engine breathing clean air.",
  "engine/oil-filters": "Oil filters that trap the particles motor oil picks up.",
  "engine/spark-plugs": "Spark plugs for a clean, reliable spark and sharp response.",
};
