import { Request, Response, NextFunction } from "express";

interface PerformanceMetrics {
  requestCount: number;
  totalResponseTime: number;
  averageResponseTime: number;
  slowestRequest: number;
  fastestRequest: number;
}

const metrics: PerformanceMetrics = {
  requestCount: 0,
  totalResponseTime: 0,
  averageResponseTime: 0,
  slowestRequest: 0,
  fastestRequest: Infinity,
};

export const performanceMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  res.on("finish", () => {
    const responseTime = Date.now() - startTime;

    // Update metrics
    metrics.requestCount++;
    metrics.totalResponseTime += responseTime;
    metrics.averageResponseTime =
      metrics.totalResponseTime / metrics.requestCount;

    if (responseTime > metrics.slowestRequest) {
      metrics.slowestRequest = responseTime;
    }

    if (responseTime < metrics.fastestRequest) {
      metrics.fastestRequest = responseTime;
    }

    // Log slow requests
    if (responseTime > 1000) {
      console.warn(
        `Slow request detected: ${req.method} ${req.path} took ${responseTime}ms`
      );
    }
  });

  next();
};

export const getPerformanceMetrics = (): PerformanceMetrics => metrics;
