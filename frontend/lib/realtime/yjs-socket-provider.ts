import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import { SYNC_BASE_URL } from "@/lib/config";
import type { ProviderOptions, SyncStatus, UserPresence } from "@/types";

const MESSAGE_DOCUMENT_UPDATE = 0;
const MESSAGE_AWARENESS_UPDATE = 1;

type AwarenessUpdate = {
  added: number[];
  updated: number[];
  removed: number[];
};

export class YjsSocketProvider {
  private socket: WebSocket | null = null;
  private disposed = false;
  private reconnectTimer: number | null = null;
  private readonly docId: string;
  private readonly token: string;
  private readonly doc: Y.Doc;
  private readonly onStatusChange: (status: SyncStatus) => void;
  public readonly awareness: Awareness;

  constructor({ docId, token, doc, onStatusChange }: ProviderOptions) {
    this.docId = docId;
    this.token = token;
    this.doc = doc;
    this.onStatusChange = onStatusChange;
    this.awareness = new Awareness(doc);
    this.doc.on("update", this.handleDocumentUpdate);
    this.awareness.on("update", this.handleAwarenessUpdate);
    this.connect();
  }

  destroy() {
    this.disposed = true;
    this.broadcastLocalAwarenessRemoval();
    this.doc.off("update", this.handleDocumentUpdate);
    this.awareness.off("update", this.handleAwarenessUpdate);
    this.awareness.destroy();
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
    }
    this.socket?.close();
  }

  setLocalPresence(user: UserPresence) {
    this.awareness.setLocalStateField("user", user);
  }

  getRemotePresence(): Map<number, UserPresence> {
    const result = new Map<number, UserPresence>();
    this.awareness.getStates().forEach((state, clientID) => {
      const user = state.user as UserPresence | undefined;
      if (clientID !== this.awareness.clientID && user) {
        result.set(clientID, user);
      }
    });
    return result;
  }

  private connect() {
    if (this.disposed) {
      return;
    }

    this.onStatusChange("connecting");
    const url = new URL(`${SYNC_BASE_URL}/ws/${this.docId}`);
    url.searchParams.set("token", this.token);

    const socket = new WebSocket(url);
    socket.binaryType = "arraybuffer";
    this.socket = socket;

    socket.onopen = () => {
      this.onStatusChange("connected");
      this.broadcastAwarenessClients([this.awareness.clientID]);
    };

    socket.onmessage = event => {
      this.readMessage(event.data);
    };

    socket.onerror = () => {
      this.onStatusChange("error");
    };

    socket.onclose = () => {
      if (this.disposed) {
        this.onStatusChange("offline");
        return;
      }
      this.onStatusChange("offline");
      this.reconnectTimer = window.setTimeout(() => this.connect(), 1800);
    };
  }

  private readMessage(data: ArrayBuffer | Blob | string) {
    if (data instanceof Blob) {
      data.arrayBuffer().then(buffer => this.readArrayBuffer(buffer));
      return;
    }
    if (data instanceof ArrayBuffer) {
      this.readArrayBuffer(data);
    }
  }

  private readArrayBuffer(data: ArrayBuffer) {
    if (data.byteLength === 0) {
      return;
    }

    const message = new Uint8Array(data);
    const type = message[0];
    if (type === MESSAGE_DOCUMENT_UPDATE) {
      Y.applyUpdate(this.doc, message.slice(1), "remote");
      return;
    }
    if (type === MESSAGE_AWARENESS_UPDATE) {
      applyAwarenessUpdate(this.awareness, message.slice(1), "remote");
      return;
    }

    // Backward-compatible replay for snapshots written before message framing.
    Y.applyUpdate(this.doc, message, "remote");
  }

  private handleDocumentUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === "remote") {
      return;
    }
    this.sendFramedMessage(MESSAGE_DOCUMENT_UPDATE, update);
  };

  private handleAwarenessUpdate = ({ added, updated, removed }: AwarenessUpdate, origin: unknown) => {
    if (origin === "remote") {
      return;
    }
    this.broadcastAwarenessClients(added.concat(updated, removed));
  };

  private broadcastAwarenessClients(clientIDs: number[]) {
    if (clientIDs.length === 0) {
      return;
    }
    const update = encodeAwarenessUpdate(this.awareness, clientIDs);
    this.sendFramedMessage(MESSAGE_AWARENESS_UPDATE, update);
  }

  private broadcastLocalAwarenessRemoval() {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }
    removeAwarenessStates(this.awareness, [this.awareness.clientID], "local");
  }

  private sendFramedMessage(type: number, payload: Uint8Array) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }
    const message = new Uint8Array(1 + payload.byteLength);
    message[0] = type;
    message.set(payload, 1);
    this.socket.send(message);
  }
}
