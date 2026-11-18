import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/api-error.js";
import { getEnv } from "../config/env.js";
import multer from "multer";

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new ApiError(404, "ROUTE_NOT_FOUND", `No route for ${request.method} ${request.path}`));
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const requestId = String(response.locals.requestId ?? "unknown");
  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.flatten(), requestId,
      },
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    response.status(tooLarge ? 413 : 400).json({
      success: false,
      error: {
        code: tooLarge ? "IMAGE_TOO_LARGE" : "INVALID_IMAGE_UPLOAD",
        message: tooLarge ? "Product images must be 10 MB or smaller" : "The image upload is invalid",
        requestId,
      },
    });
    return;
  }

  if (error instanceof ApiError) {
    response.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message, details: error.details, requestId },
    });
    return;
  }

  console.error(JSON.stringify({ level: "error", event: "request.failed", requestId,
    method: request.method, path: request.path,
    error: error instanceof Error ? { name: error.name, message: error.message, stack: getEnv().NODE_ENV === "development" ? error.stack : undefined } : { message: "Unknown error" } }));
  response.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred", requestId },
  });
};
