import uuid from 'uuid';

export function addRequestIdMiddleware() {
  return function addRequestId(req, res, next) {
    req.requestId = uuid();
    next();
  };
}

export function errorHandlerMiddleware(logger) {
  const BAD_JSON = 'BAD_JSON';
  return function errorHandler(err, req, res, next) {
    if (res.headersSent) {
      return next(err);
    }

    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      res.statusCode = 400;
      res.json({
        error: {
          message: err.message,
          errorCode: BAD_JSON,
          payload: null,
        },
      });
    } else {
      switch (err.name) {
        case 'ValidationError':
        case 'DomainError':
          res.statusCode = 400;
          res.json({ error: err.toObject() });
          break;
        default:
          logger.error(err.stack, { requestId: req.requestId });
          res.statusCode = 500;
          res.json({ error: `${req.requestId}` });
      }
    }

    return next();
  };
}

export function logRequestMiddleware(logger) {
  return function logRequest(req, res, next) {
    next();
    const message = `${res.statusCode} ${req.method} ${req.originalUrl}`;
    const data = {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      headers: req.headers,
      body: req.body,
    };
    if (res.statusCode === 500) {
      logger.error(message, data);
    } else {
      logger.info(message, data);
    }
  };
}

export function notFoundMiddleware() {
  return function notFound(req, res, next) {
    if (!res.headersSent) {
      res.status(404).json({
        error: `${req.method} ${req.originalUrl}: Not found`,
      });
    }

    return next();
  };
}
