import { Request, Response, NextFunction } from "express";

export const performanceMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Override res.end to capture response time
  const originalEnd = res.end.bind(res);

  // Override res.end method
  (res as any).end = function (chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;

    // Log performance metrics
    console.log(
      `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );

    // Add performance header
    res.setHeader("X-Response-Time", `${duration}ms`);

    // Call original end
    if (chunk !== undefined && encoding !== undefined) {
      originalEnd(chunk, encoding);
    } else if (chunk !== undefined) {
      originalEnd(chunk);
    } else {
      originalEnd();
    }
  };

  next();
};
