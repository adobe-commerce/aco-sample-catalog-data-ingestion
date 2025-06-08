import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const loadConfig = () => {
  config();

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

  return {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    tenantId: process.env.TENANT_ID,
    region: process.env.REGION,
    environment: process.env.ENVIRONMENT,
  };
};

export const readFile = (dirName) => {
  const filePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "data",
    dirName
  );
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};
