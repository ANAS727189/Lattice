import * as Y from "yjs";
import { SYNC_BASE_URL } from "@/lib/config";
import type {ProviderOptions, SyncStatus} from "@/types/types";


export class YjsSocketProvider {
  private socket: WebSocket | null = null;
  private disposed = false;
  private reconnectTimer: number | null = null;
  private readonly docId: string;
  private readonly token: string;
  private readonly doc: Y.Doc;
  private readonly onStatusChange: (status: SyncStatus) => void;

  constructor({ docId, token, doc, onStatusChange }: ProviderOptions) {
    this.docId = docId;
    this.token = token;
    this.doc = doc;
    this.onStatusChange = onStatusChange;
    this.doc.on("update", this.handleDocumentUpdate);
    this.connect();
  }

  destroy() {
    this.disposed = true;
    this.doc.off("update", this.handleDocumentUpdate);
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
    }
    this.socket?.close();
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
    };

    socket.onmessage = event => {
      const update = event.data;
      if (update instanceof ArrayBuffer) {
        Y.applyUpdate(this.doc, new Uint8Array(update), "remote");
      } else if (update instanceof Blob) {
        update.arrayBuffer().then(buffer => {
          Y.applyUpdate(this.doc, new Uint8Array(buffer), "remote");
        });
      }
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

  private handleDocumentUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === "remote") {
      return;
    }
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(update);
    }
  };
}
