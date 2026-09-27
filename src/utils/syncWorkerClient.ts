// Client wrapper for Sync Web Worker with fallback

export class SyncWorkerClient {
  private worker: Worker | null = null;

  constructor() {
    if (typeof window !== "undefined" && window.Worker) {
      try {
        this.worker = new Worker(new URL("../workers/syncWorker.ts", import.meta.url), {
          type: "module",
        });
      } catch (e) {
        console.warn("Web Worker initialization failed, falling back to main thread:", e);
      }
    }
  }

  public computeDelta(localRecords: any[], serverRecords: any[]): Promise<{ inserts: any[]; updates: any[]; deletes: any[] }> {
    return new Promise((resolve) => {
      if (!this.worker) {
        resolve(computeDeltaSync(localRecords, serverRecords));
        return;
      }

      const channel = (e: MessageEvent) => {
        if (e.data.type === "DELTA_RESULT") {
          this.worker?.removeEventListener("message", channel);
          resolve(e.data.payload);
        }
      };

      this.worker.addEventListener("message", channel);
      this.worker.postMessage({
        type: "COMPUTE_DELTA",
        payload: { localRecords, serverRecords },
      });
    });
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

function computeDeltaSync(localRecords: any[], serverRecords: any[]) {
  const serverMap = new Map();
  (serverRecords || []).forEach((row: any) => {
    const key = row.id || JSON.stringify(row.data || row);
    serverMap.set(key, row);
  });

  const localMap = new Map();
  (localRecords || []).forEach((item: any) => {
    const key = item.id || JSON.stringify(item);
    localMap.set(key, item);
  });

  const inserts: any[] = [];
  const updates: any[] = [];
  const deletes: any[] = [];

  for (const [key, localItem] of localMap.entries()) {
    if (!serverMap.has(key)) {
      inserts.push(localItem);
    } else {
      const serverItem = serverMap.get(key);
      if (JSON.stringify(localItem) !== JSON.stringify(serverItem)) {
        updates.push({ id: key, record: localItem, oldRecord: serverItem });
      }
    }
  }

  for (const [key, serverItem] of serverMap.entries()) {
    if (!localMap.has(key)) {
      deletes.push({ id: key, record: serverItem });
    }
  }

  return { inserts, updates, deletes };
}

export const syncWorkerClient = new SyncWorkerClient();
