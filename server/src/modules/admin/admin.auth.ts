import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { getEnv } from "../../config/env.js";
import { ApiError } from "../../utils/api-error.js";
import { adminCredentials } from "./admin.credentials.js";

export const adminCookieName = "rj_admin_session";

const encode = (value: string) => Buffer.from(value).toString("base64url");
const signature = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url");

export function createAdminSession(email: string): string {
  const env = getEnv();
  const payload = encode(JSON.stringify({ email, exp: Date.now() + 8 * 60 * 60 * 1000 }));
  return `${payload}.${signature(payload, env.ADMIN_SESSION_SECRET)}`;
}

export function verifyAdminSession(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, supplied] = token.split(".");
  if (!payload || !supplied) return false;
  const expected = signature(payload, getEnv().ADMIN_SESSION_SECRET);
  if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return false;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString()) as { email: string; exp: number };
    return value.email === adminCredentials.email && value.exp > Date.now();
  } catch { return false; }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, configured: string): boolean {
  const [algorithm, salt, expectedHex] = configured.split(":");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const requireAdmin: RequestHandler = (request, _response, next) => {
  const cookies = Object.fromEntries((request.headers.cookie ?? "").split(";").map((part) => {
    const [key, ...rest] = part.trim().split("=");
    return [key, decodeURIComponent(rest.join("="))];
  }));
  if (!verifyAdminSession(cookies[adminCookieName])) return next(new ApiError(401, "ADMIN_AUTH_REQUIRED", "Admin sign-in required"));
  next();
};
