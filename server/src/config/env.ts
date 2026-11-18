import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:3000"),
  PAYNOW_INTEGRATION_ID: z.string().default(""),
  PAYNOW_INTEGRATION_KEY: z.string().default(""),
  PAYNOW_RESULT_URL: z.string().default(""),
  PAYNOW_RETURN_URL: z.string().default(""),
  PAYNOW_ACCEPTED_CURRENCIES: z.string().default("USD"),
  ADMIN_SESSION_SECRET: z.string().min(32).default("development-only-session-secret-change-me"),
  TRUST_PROXY: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  R2_ACCOUNT_ID: z.string().default(""),
  R2_ACCESS_KEY_ID: z.string().default(""),
  R2_SECRET_ACCESS_KEY: z.string().default(""),
  R2_BUCKET_NAME: z.string().default(""),
  R2_PUBLIC_URL: z.string().default(""),
}).superRefine((env, context) => {
  const r2Keys = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"] as const;
  const configuredR2Keys = r2Keys.filter((key) => env[key].trim());
  if (configuredR2Keys.length > 0 && configuredR2Keys.length !== r2Keys.length) {
    for (const key of r2Keys) {
      if (!env[key].trim()) context.addIssue({ code: "custom", path: [key], message: `${key} is required when R2 uploads are configured` });
    }
  }
  if (env.R2_PUBLIC_URL.trim()) {
    try {
      const url = new URL(env.R2_PUBLIC_URL);
      if (url.protocol !== "https:") throw new Error("not HTTPS");
    } catch {
      context.addIssue({ code: "custom", path: ["R2_PUBLIC_URL"], message: "R2_PUBLIC_URL must be a valid HTTPS URL" });
    }
  }
  if (env.NODE_ENV !== "production") return;
  for (const key of ["PAYNOW_INTEGRATION_ID", "PAYNOW_INTEGRATION_KEY"] as const) {
    if (!env[key].trim()) context.addIssue({ code: "custom", path: [key], message: `${key} is required in production` });
  }
  for (const key of ["PAYNOW_RESULT_URL", "PAYNOW_RETURN_URL"] as const) {
    try {
      const url = new URL(env[key]);
      if (url.protocol !== "https:") throw new Error("not HTTPS");
    } catch {
      context.addIssue({ code: "custom", path: [key], message: `${key} must be a valid HTTPS URL in production` });
    }
  }
  if (env.ADMIN_SESSION_SECRET.includes("development-only")) context.addIssue({ code: "custom", path: ["ADMIN_SESSION_SECRET"], message: "Set a unique ADMIN_SESSION_SECRET in production" });
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | undefined;

export function getEnv(): AppEnv {
  cachedEnv ??= envSchema.parse(process.env);
  return cachedEnv;
}
