import jwt from "jsonwebtoken";
import type { IncomingMessage } from "http";

export interface AuthConfig {
  jwtPublicKey?: string;   // for RS256
  jwtSecret?: string;      // for HS256 (dev/local)
  audience?: string;
  issuer?: string;
  requireRoomClaim?: boolean;
}

export interface UserClaims {
  userId: string;
  roles?: string[];
  roomId?: string;
  [k: string]: any;
}

export function verifyToken(token: string, cfg: AuthConfig): UserClaims {
  if (!cfg.jwtPublicKey && !cfg.jwtSecret) {
    throw new Error("JWT key not configured");
  }

  const verifyOpts: jwt.VerifyOptions = {};
  if (cfg.audience) verifyOpts.audience = cfg.audience;
  if (cfg.issuer) verifyOpts.issuer = cfg.issuer;

  const key = cfg.jwtPublicKey || cfg.jwtSecret!;
  const algos: jwt.Algorithm[] = cfg.jwtPublicKey ? ["RS256"] : ["HS256"];

  const payload = jwt.verify(token, key, { algorithms: algos, ...verifyOpts }) as any;

  const userId = payload.sub || payload.userId || payload.uid;
  if (!userId) throw new Error("Missing user id claim");

  return { userId, roles: payload.roles, roomId: payload.roomId, ...payload };
}

export function extractTokenFromReq(req: IncomingMessage): string | null {
  // 1) Authorization: Bearer <token>
  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }

  // 2) Query param: ?token=<token>
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const qp = url.searchParams.get("token");
  if (qp) return qp;

  // 3) Optional via Sec-WebSocket-Protocol: "Bearer <token>"
  const protoHeader = req.headers["sec-websocket-protocol"];
  if (typeof protoHeader === "string") {
    const token = protoHeader
      .split(",")
      .map((s) => s.trim())
      .find((s) => s.startsWith("Bearer "));
    if (token) return token.slice(7);
  }

  return null;
}
