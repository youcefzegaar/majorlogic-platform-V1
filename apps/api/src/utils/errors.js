export const badRequest  = (msg, code = "bad_request")         => ({ statusCode: 400, body: { error: code, message: msg } });
export const notFound    = (msg, code = "not_found")            => ({ statusCode: 404, body: { error: code, message: msg } });
export const conflict    = (msg, code = "conflict")             => ({ statusCode: 409, body: { error: code, message: msg } });
export const serverError = (msg, code = "internal_error")       => ({ statusCode: 500, body: { error: code, message: msg } });
export const unavailable = (msg, code = "service_unavailable")  => ({ statusCode: 503, body: { error: code, message: msg } });

export function sendError(reply, { statusCode, body }) {
  return reply.status(statusCode).send(body);
}

// True for non-retryable Postgres constraint errors (unique, fk, not-null)
export function isPermanentFailure(err) {
  return new Set(["23505", "23503", "23502"]).has(err?.code);
}
