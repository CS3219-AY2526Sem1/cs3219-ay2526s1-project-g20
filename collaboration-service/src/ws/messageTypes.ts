export type ClientMessage =
  | { type: "JOIN_ROOM"; roomId: string }
  | { type: "LEAVE_ROOM" }
  | { type: "PING" }
  | { type: "YJS_UPDATE"; payloadB64: string }
  | { type: "AWARENESS_SET"; payloadB64: string }
  | { type: "PARTNER_CHAT"; content: string; clientId?: string };

export type ServerMessage =
  | { type: "JOINED"; roomId: string; participants: number }
  | { type: "LEFT"; roomId?: string }
  | { type: "PONG" }
  | { type: "YJS_UPDATE"; payloadB64: string }        // server -> clients
  | { type: "AWARENESS_UPDATE"; payloadB64: string }  // server -> clients
  | { type: "AWARENESS_SYNC"; payloadB64: string }    // initial states to a new client
  | { type: "ERROR"; code: string; message: string }
  | { type: "YJS_SYNC"; payloadB64: string }
  | { type: "PARTNER_CHAT"; roomId: string; content: string; senderId: string; sentAt: string; clientId?: string };

export function safeParse<T>(raw: string): T | null {
  try { return JSON.parse(raw) as T; } catch { return null; }
}
