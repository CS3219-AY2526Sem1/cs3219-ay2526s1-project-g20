import Fastify, { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import client from "prom-client";

export interface AppConfig {
  port: number;
  host: string;
  wsPath: string;
  prometheusEnabled: boolean;
  serviceName: string;
  buildInfo?: Record<string, string | number>;
  readinessChecks?: Array<() => Promise<void>>;
}

const metricsPlugin = fp(async (app: FastifyInstance) => {
  // Minimal Prometheus setup
  client.collectDefaultMetrics();
  const register = client.register;

  app.get("/metrics", async (_req, reply) => {
    reply.header("Content-Type", register.contentType);
    return register.metrics();
  });
});

export function createApp(config: AppConfig): FastifyInstance {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      // Pretty logs in dev (optional)
      transport:
        process.env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
    trustProxy: true,
  });

  // Basic request-id for tracing (compatible with many gateways)
  app.addHook("onRequest", async (req) => {
    const rid =
      req.headers["x-request-id"] ||
      req.headers["x-correlation-id"] ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    (req as any).rid = rid;
  });

  // Health & readiness
  app.get("/healthz", async (_req, reply) => {
    reply.send({ status: "ok", service: config.serviceName });
  });

  app.get("/readyz", async (_req, reply) => {
    try {
      if (config.readinessChecks && config.readinessChecks.length) {
        for (const check of config.readinessChecks) {
          // Each check should throw on failure
          // eslint-disable-next-line no-await-in-loop
          await check();
        }
      }
      reply.send({ status: "ready", service: config.serviceName });
    } catch (err: any) {
      app.log.error({ err }, "Readiness check failed");
      reply.code(503).send({ status: "not_ready", reason: err?.message });
    }
  });

  // Optional: simple session/room peek (stub; wire to presenceStore later)
  app.get("/rooms/:id", async (req, reply) => {
    const { id } = (req.params as { id: string });
    // Replace with actual presenceStore lookup
    reply.send({
      roomId: id,
      participants: [],
      active: false,
    });
  });

  // Build info (for quick debugging in demos)
  app.get("/info", async (_req, reply) => {
    reply.send({
      service: config.serviceName,
      version: process.env.COMMIT_SHA || "dev",
      ...config.buildInfo,
    });
  });

  // Metrics (conditionally)
  if (config.prometheusEnabled) {
    app.register(metricsPlugin);
  }

  return app;
}
