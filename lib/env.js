import { config } from "dotenv";

const requireEnv = (vars) => {
  config();
  for (const v of vars) {
    if (!process.env[v]) {
      throw new Error(`Missing required environment variable: ${v}`);
    }
  }
};

export const loadAcoConfig = () => {
  requireEnv([
    "CLIENT_ID",
    "CLIENT_SECRET",
    "TENANT_ID",
    "REGION",
    "ENVIRONMENT",
  ]);
  return {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    tenantId: process.env.TENANT_ID,
    region: process.env.REGION,
    environment: process.env.ENVIRONMENT,
  };
};

export const loadPaasConfig = () => {
  requireEnv(["AC_BASE_URL", "AC_ADMIN_API_USER", "AC_ADMIN_API_PASSWORD"]);
  return {
    baseUrl: process.env.AC_BASE_URL.replace(/\/+$/, ""),
    adminUser: process.env.AC_ADMIN_API_USER,
    adminPassword: process.env.AC_ADMIN_API_PASSWORD,
  };
};
