import { createApp, AppConfig } from "./app";
import { initWebsocketServer } from "./ws/websocketServer";
import type { Server as HttpServer } from "http";
import 'dotenv/config';

function bool(v: string | undefined, def: boolean) {
  if (v === undefined) return def;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

const config: AppConfig = {
  port: Number(process.env.PORT ?? 8084),
  host: process.env.HOST ?? "0.0.0.0",
  wsPath: process.env.WS_PATH ?? "/ws",
  prometheusEnabled: bool(process.env.PROMETHEUS_ENABLED, true),
  serviceName: process.env.SERVICE_NAME ?? "collaboration-service",
  buildInfo: { commit: process.env.COMMIT_SHA ?? "dev", node: process.version },
  readinessChecks: [ async () => { return; } ],
};

async function main() {
  const app = createApp(config);
  const httpServer = app.server as HttpServer;

  await initWebsocketServer(httpServer, {
    path: config.wsPath,
    logger: app.log,
    auth: {
      jwtPublicKey: process.env.JWT_PUBLIC_KEY,  // for RS256 (prod)
      jwtSecret: process.env.JWT_SECRET,         // for HS256 (dev)
      audience: process.env.JWT_AUDIENCE,
      issuer: process.env.JWT_ISSUER,
      requireRoomClaim: bool(process.env.AUTH_REQUIRE_ROOM_CLAIM, false),
    },
  });

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info({ port: config.port, host: config.host, wsPath: config.wsPath }, "HTTP+WS up");
  } catch (err) {
    app.log.error({ err }, "Failed to start server");
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    try { app.log.info({ signal }, "Shutting down…"); await app.close(); process.exit(0); }
    catch (err) { app.log.error({ err }, "Shutdown error"); process.exit(1); }
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main();
