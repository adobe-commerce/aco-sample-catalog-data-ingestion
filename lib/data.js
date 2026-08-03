import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dataDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
);

export const readData = (name) =>
  JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
