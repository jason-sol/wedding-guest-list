/**
 * Standardized API response helpers.
 * Provides consistent response format across all endpoints.
 */

import { Response } from 'express';

/**
 * Standard API response shape.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

/**
 * Send a successful response.
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  res.status(statusCode).json(response);
}

/**
 * Send a created response (201).
 */
export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

/**
 * Send a no-content response (204).
 */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}

/**
 * Send an error response.
 */
export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  details?: unknown
): void {
  const response: ApiResponse = {
    success: false,
    error: message,
  };

  if (details !== undefined) {
    response.details = details;
  }

  res.status(statusCode).json(response);
}

/**
 * Send a validation error response.
 */
export function sendValidationError(
  res: Response,
  message: string,
  details?: unknown
): void {
  sendError(res, message, 400, details);
}

/**
 * Send a not found error response.
 */
export function sendNotFound(res: Response, resource: string): void {
  sendError(res, `${resource} not found`, 404);
}

/**
 * Send an unauthorized error response.
 */
export function sendUnauthorized(res: Response, message = 'Authentication required'): void {
  sendError(res, message, 401);
}

/**
 * Send a forbidden error response.
 */
export function sendForbidden(res: Response, message = 'Access denied'): void {
  sendError(res, message, 403);
}

/**
 * Send an internal server error response.
 */
export function sendServerError(res: Response, message = 'Internal server error'): void {
  sendError(res, message, 500);
}
