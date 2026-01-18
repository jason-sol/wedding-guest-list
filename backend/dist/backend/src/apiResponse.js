"use strict";
/**
 * Standardized API response helpers.
 * Provides consistent response format across all endpoints.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendCreated = sendCreated;
exports.sendNoContent = sendNoContent;
exports.sendError = sendError;
exports.sendValidationError = sendValidationError;
exports.sendNotFound = sendNotFound;
exports.sendUnauthorized = sendUnauthorized;
exports.sendForbidden = sendForbidden;
exports.sendServerError = sendServerError;
/**
 * Send a successful response.
 */
function sendSuccess(res, data, statusCode = 200) {
    const response = {
        success: true,
        data,
    };
    res.status(statusCode).json(response);
}
/**
 * Send a created response (201).
 */
function sendCreated(res, data) {
    sendSuccess(res, data, 201);
}
/**
 * Send a no-content response (204).
 */
function sendNoContent(res) {
    res.status(204).send();
}
/**
 * Send an error response.
 */
function sendError(res, message, statusCode = 400, details) {
    const response = {
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
function sendValidationError(res, message, details) {
    sendError(res, message, 400, details);
}
/**
 * Send a not found error response.
 */
function sendNotFound(res, resource) {
    sendError(res, `${resource} not found`, 404);
}
/**
 * Send an unauthorized error response.
 */
function sendUnauthorized(res, message = 'Authentication required') {
    sendError(res, message, 401);
}
/**
 * Send a forbidden error response.
 */
function sendForbidden(res, message = 'Access denied') {
    sendError(res, message, 403);
}
/**
 * Send an internal server error response.
 */
function sendServerError(res, message = 'Internal server error') {
    sendError(res, message, 500);
}
