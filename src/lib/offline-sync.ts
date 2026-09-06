import { openDB, DBSchema, IDBPDatabase } from "idb";
import { AnnotationRecord, StudyFile } from "@/lib/db";

interface NaraDBSchema extends DBSchema {
  annotations: {
    key: string;
    value: AnnotationRecord;
    indexes: {
      by_file: string;
      by_file_page: [string, number];
      by_sync: string;
    };
  };
  cached_files: {
    key: string;
    value: {
      file: StudyFile;
      dataUrl?: string;
      cached_at: string;
    };
    indexes: {
      by_workspace: string;
    };
  };
}

const DB_NAME = "nara_offline_db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<NaraDBSchema>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<NaraDBSchema>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB hanya tersedia di browser"));
  }

  if (!dbPromise) {
    dbPromise = openDB<NaraDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Annotations store
        if (!db.objectStoreNames.contains("annotations")) {
          const annoStore = db.createObjectStore("annotations", { keyPath: "id" });
          annoStore.createIndex("by_file", "file_id");
          annoStore.createIndex("by_file_page", ["file_id", "page_number"]);
          annoStore.createIndex("by_sync", "sync_status");
        }

        // Cached files store
        if (!db.objectStoreNames.contains("cached_files")) {
          const fileStore = db.createObjectStore("cached_files", { keyPath: "file.id" });
          fileStore.createIndex("by_workspace", "file.workspace_id");
        }
      },
    });
  }

  return dbPromise;
}

/**
 * Saves an annotation locally first with instant 0ms feedback.
 */
export async function saveAnnotationLocal(anno: AnnotationRecord): Promise<void> {
  const db = await getOfflineDB();
  const record: AnnotationRecord = {
    ...anno,
    sync_status: anno.sync_status || "pending",
    updated_at: new Date().toISOString(),
  };
  await db.put("annotations", record);
}

/**
 * Removes an annotation locally.
 */
export async function deleteAnnotationLocal(id: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete("annotations", id);
}

/**
 * Retrieves annotations from IndexedDB instantly.
 */
export async function getAnnotationsLocal(
  fileId: string,
  pageNumber?: number
): Promise<AnnotationRecord[]> {
  const db = await getOfflineDB();
  let records: AnnotationRecord[] = [];

  if (typeof pageNumber === "number") {
    records = await db.getAllFromIndex("annotations", "by_file_page", [fileId, pageNumber]);
  } else {
    records = await db.getAllFromIndex("annotations", "by_file", fileId);
  }

  return records.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

/**
 * Gets all pending annotations for background synchronization.
 */
export async function getPendingAnnotations(fileId?: string): Promise<AnnotationRecord[]> {
  const db = await getOfflineDB();
  const pending = await db.getAllFromIndex("annotations", "by_sync", "pending");
  if (fileId) {
    return pending.filter((a) => a.file_id === fileId);
  }
  return pending;
}

/**
 * Background sync engine: sends pending annotations to Supabase/server in batch.
 * Applies Last-Write-Wins and detects conflicts.
 */
export async function syncPendingAnnotations(fileId: string): Promise<{
  syncedCount: number;
  conflictsCount: number;
}> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { syncedCount: 0, conflictsCount: 0 };
  }

  const db = await getOfflineDB();
  const pending = await getPendingAnnotations(fileId);

  if (pending.length === 0) {
    return { syncedCount: 0, conflictsCount: 0 };
  }

  try {
    const res = await fetch(`/api/files/${fileId}/annotations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: pending }),
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data = await res.json();
    const serverItems: AnnotationRecord[] = data.annotations || [];

    let syncedCount = 0;
    let conflictsCount = 0;

    const tx = db.transaction("annotations", "readwrite");
    for (const item of serverItems) {
      const local = await tx.store.get(item.id);
      if (local && local.sync_status === "pending") {
        // Last-write-wins: check timestamps
        const localTime = new Date(local.updated_at).getTime();
        const serverTime = new Date(item.updated_at).getTime();

        if (serverTime > localTime) {
          // Server wins, mark conflict if divergence
          await tx.store.put({
            ...item,
            sync_status: "conflict",
          });
          conflictsCount++;
        } else {
          // Client successfully pushed
          await tx.store.put({
            ...local,
            sync_status: "synced",
          });
          syncedCount++;
        }
      } else {
        await tx.store.put({
          ...item,
          sync_status: "synced",
        });
        syncedCount++;
      }
    }
    await tx.done;

    return { syncedCount, conflictsCount };
  } catch (err) {
    console.warn("Background sync tertunda (koneksi offline/server lambat):", err);
    return { syncedCount: 0, conflictsCount: 0 };
  }
}

/**
 * Loads from IndexedDB first (instantly), then synchronizes in the background.
 */
export async function loadAndSyncAnnotations(
  fileId: string,
  pageNumber?: number
): Promise<AnnotationRecord[]> {
  // Step 1: Load from IndexedDB immediately
  const localList = await getAnnotationsLocal(fileId, pageNumber);

  // Step 2: In background, fetch from server if online
  if (typeof window !== "undefined" && navigator.onLine) {
    syncPendingAnnotations(fileId).catch(() => {});
  }

  return localList;
}

/**
 * Caches a file record and optional dataUrl locally for 100% offline access.
 */
export async function cacheFileLocal(file: StudyFile, dataUrl?: string): Promise<void> {
  const db = await getOfflineDB();
  await db.put("cached_files", {
    file,
    dataUrl,
    cached_at: new Date().toISOString(),
  });
}

/**
 * Retrieves cached file from IndexedDB.
 */
export async function getCachedFileLocal(
  fileId: string
): Promise<{ file: StudyFile; dataUrl?: string } | null> {
  const db = await getOfflineDB();
  const cached = await db.get("cached_files", fileId);
  return cached || null;
}
