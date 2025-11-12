import { websocket } from "lib0";
import type { WebSocket } from "ws";

export class RoomRegistry {
  // roomId -> Set<WebSocket>
  private rooms = new Map<string, Set<WebSocket>>();

  join(roomId: string, ws: WebSocket) {
    let set = this.rooms.get(roomId);
    if (!set) {
      set = new Set();
      this.rooms.set(roomId, set);
    }
    set.add(ws);
    return set.size;
  }

  leave(roomId: string, ws: WebSocket): WebSocket[] {
    const set = this.rooms.get(roomId);
    if (!set) return [];
    set.delete(ws);
    const remaining = Array.from(set.values());
    if (set.size === 0) this.rooms.delete(roomId);
    return remaining;
  }

  broadcast(roomId: string, data: unknown, except?: WebSocket) {
    const set = this.rooms.get(roomId);
    if (!set) return;
    const raw = typeof data === "string" ? data : JSON.stringify(data);
    for (const peer of set) {
      if (peer !== except && peer.readyState === peer.OPEN) {
        peer.send(raw);
      }
    }
  }

  peers(roomId: string): WebSocket[] {
    const set = this.rooms.get(roomId);
    return set ? Array.from(set.values()) : [];
  }

  count(roomId: string): number {
    return this.rooms.get(roomId)?.size ?? 0;
  }

  leaveAll(ws: WebSocket) {
    for (const [roomId, set] of this.rooms.entries()) {
      if (set.has(ws)) {
        set.delete(ws);
        if (set.size === 0) this.rooms.delete(roomId);
      }
    }
  }
}
