import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestContext: RequestHandler = (request, response, next) => {
  const supplied = request.get("x-request-id")?.trim();
  const requestId = supplied && /^[a-zA-Z0-9._-]{1,100}$/.test(supplied) ? supplied : randomUUID();
  response.locals.requestId = requestId;
  response.setHeader("x-request-id", requestId);
  const startedAt = performance.now();
  response.on("finish", () => {
    console.info(JSON.stringify({
      level: "info",
      event: "request.completed",
      requestId,
      method: request.method,
      path: request.originalUrl.split("?")[0],
      status: response.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
    }));
  });
  next();
};
