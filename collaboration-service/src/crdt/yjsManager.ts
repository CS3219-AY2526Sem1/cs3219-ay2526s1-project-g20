import * as Y from "yjs";
import { encodeAwarenessUpdate, applyAwarenessUpdate, Awareness } from "y-protocols/awareness";
import { WebSocket } from "ws";

type RoomId = string;

export interface YRoom {
  id: RoomId;
  doc: Y.Doc;
  awareness: Awareness;
  conns: Map<WebSocket, { userId: string }>;
  lastActive: number;
}

export class YjsManager {
  private rooms = new Map<RoomId, YRoom>();
  private onDocUpdate?: (room: YRoom, update: Uint8Array, origin?: any) => void;
  private onAwarenessUpdate?: (room: YRoom, origin: any, changed: number[], states: Map<number, any>) => void;

  constructor(
    private opts: {
      idleMs?: number;
      logger?: any;
    } = {}
  ) {}

  getOrCreate(roomId: RoomId): YRoom {
    let room = this.rooms.get(roomId);
    if (room) return room;

    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    const conns = new Map<WebSocket, { userId: string }>();

    // Relay doc updates to connections in this room
    doc.on("update", (update, origin) => {
      this.opts.logger?.debug?.({ roomId, bytes: update.length }, "yjs doc update");
      for (const [ws] of conns) {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: "YJS_UPDATE", payloadB64: uint8ToB64(update) }));
        }
      }
      this.onDocUpdate?.(room!, update, origin);
    });

    // Awareness changed callback (not auto-broadcasted; we control broadcast manually)
    awareness.on(
    "update",
    (
        { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
        origin: any
    ) => {
        const changed = added.concat(updated).concat(removed);
        const states = awareness.getStates();
        this.onAwarenessUpdate?.(room!, origin, changed, states);
    }
    );

    room = { id: roomId, doc, awareness, conns, lastActive: Date.now() };
    this.rooms.set(roomId, room);
    return room;
  }

  join(roomId: RoomId, ws: WebSocket, userId: string) {
    const room = this.getOrCreate(roomId);
    room.conns.set(ws, { userId });
    room.lastActive = Date.now();

    // On join, send current document snapshot
    if (ws.readyState === ws.OPEN) {
      const snapshot = Y.encodeStateAsUpdate(room.doc);
      if (snapshot && snapshot.length > 0) {
        ws.send(JSON.stringify({ type: "YJS_SYNC", payloadB64: uint8ToB64(snapshot) }));
      }
    }

    // Send current awareness to the new client
    const states = room.awareness.getStates();
    if (ws.readyState === ws.OPEN && states.size > 0) {
      const update = encodeAwarenessUpdate(room.awareness, Array.from(states.keys()));
      ws.send(JSON.stringify({ type: "AWARENESS_SYNC", payloadB64: uint8ToB64(update) }));
    }
  }

  leave(roomId: RoomId, ws: WebSocket) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.conns.delete(ws);
    room.lastActive = Date.now();

    if (room.conns.size === 0) {
      // GC idle room now or let a sweeper handle it
      if (!this.opts.idleMs) {
        room.doc.destroy();
        this.rooms.delete(roomId);
      }
    }
  }

  leaveAll(ws: WebSocket) {
    for (const [rid, room] of this.rooms) {
      if (room.conns.has(ws)) this.leave(rid, ws);
    }
  }

  applyUpdate(roomId: RoomId, update: Uint8Array, origin?: any) {
    const room = this.getOrCreate(roomId);
    Y.applyUpdate(room.doc, update, origin);
    room.lastActive = Date.now();
  }

  applyAwareness(roomId: RoomId, update: Uint8Array, origin: any) {
    const room = this.getOrCreate(roomId);
    applyAwarenessUpdate(room.awareness, update, origin);
    room.lastActive = Date.now();

    // Broadcast awareness update to peers
    for (const [ws] of room.conns) {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: "AWARENESS_UPDATE", payloadB64: uint8ToB64(update) }));
      }
    }
  }

  sweepIdle(now = Date.now()) {
    const idleMs = this.opts.idleMs ?? 20 * 60_000; // default 20 min
    for (const [rid, room] of this.rooms) {
      if (room.conns.size === 0 && now - room.lastActive > idleMs) {
        room.doc.destroy();
        this.rooms.delete(rid);
        this.opts.logger?.info?.({ rid }, "yjs room GC");
      }
    }
  }
}

// helpers
export function b64ToUint8(b64: string): Uint8Array {
  const bin = Buffer.from(b64, "base64");
  return new Uint8Array(bin.buffer, bin.byteOffset, bin.length);
}
export function uint8ToB64(uint8: Uint8Array): string {
  return Buffer.from(uint8).toString("base64");
}
