import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dataDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
);

export const DEFAULT_LOCALE = "en-US";

// Locale subdirectories present under data/ (everything but the shared images tree).
export const listLocales = () => {
  if (!fs.existsSync(dataDir)) return [];
  return fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "images")
    .map((e) => e.name)
    .sort();
};

// Resolve which locales a script should act on, from CLI args:
//   --locales=en-US,fr-FR   explicit list
//   --all-locales           every locale dir under data/
// Falls back to the LOCALE env var, then DEFAULT_LOCALE. Returns a de-duped array.
export const parseLocaleArgs = (argv = process.argv.slice(2)) => {
  if (argv.includes("--all-locales")) {
    const found = listLocales();
    return found.length ? found : [DEFAULT_LOCALE];
  }
  const flag = argv.find(
    (a) => a === "--locales" || a.startsWith("--locales="),
  );
  let raw;
  if (flag === "--locales") {
    raw = argv[argv.indexOf(flag) + 1];
  } else if (flag) {
    raw = flag.slice("--locales=".length);
  }
  if (!raw) raw = process.env.LOCALE || DEFAULT_LOCALE;
  const locales = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(locales.length ? locales : [DEFAULT_LOCALE])];
};
