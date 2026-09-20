import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  getDocFromServer,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  SubmittedSheetRecord,
  initialSubmittedSheets,
  saveStoredSubmittedSheets,
  getStoredSubmittedSheets,
} from '../utils/submittedSheets';
import {
  YearBatchConfig,
  DEFAULT_BATCHES,
  DEPARTMENTS,
  saveStoredBatches,
  getStoredBatches,
} from '../utils/studentBatches';

const COLLECTION_NAME = 'marksheets';
const BATCHES_COLLECTION = 'student_batches';

export type LiveConnectionStatus = 'connected' | 'connecting' | 'offline' | 'error';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate live connection to Firestore on boot
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}
testFirestoreConnection();

export interface LiveBackendEvent {
  id: string;
  timestamp: string;
  type: 'MARKSHEET_SUBMITTED' | 'MARKSHEET_APPROVED' | 'MARKSHEET_LOCKED' | 'MARKSHEET_UNLOCKED' | 'MARKSHEET_DELETED' | 'BATCH_UPDATED' | 'STUDENT_ROSTER_SAVED' | 'SYSTEM';
  title: string;
  description: string;
  author?: string;
  details?: Record<string, any>;
}

/**
 * Broadcast live event notification to backend SSE engine
 */
export async function broadcastLiveUpdate(
  type: LiveBackendEvent['type'],
  title: string,
  description: string,
  author?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    await fetch('/api/updates/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title, description, author, details }),
    });
  } catch (err) {
    console.warn('Notice: Backend event broadcast delayed:', err);
  }
}

/**
 * Subscribe to live backend Server-Sent Events (SSE) stream
 */
export function subscribeToLiveBackendEvents(
  onEvent: (event: LiveBackendEvent) => void
): () => void {
  if (typeof window === 'undefined' || !window.EventSource) {
    return () => {};
  }
  try {
    const es = new EventSource('/api/updates/stream');
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data && data.id) {
          onEvent(data);
        }
      } catch {
        // Heartbeat or comment
      }
    };
    es.onerror = () => {
      // Reconnection handled automatically by browser
    };
    return () => {
      es.close();
    };
  } catch {
    return () => {};
  }
}

/**
 * Real-time subscription to the Firestore marksheets collection.
 * Triggers callback whenever any faculty member or admin submits, locks, or deletes a marksheet.
 */
export function subscribeToLiveMarksheets(
  onData: (sheets: SubmittedSheetRecord[]) => void,
  onStatusChange?: (status: LiveConnectionStatus, errorMsg?: string) => void
): Unsubscribe {
  onStatusChange?.('connecting');

  try {
    const marksheetsRef = collection(db, COLLECTION_NAME);
    const q = query(marksheetsRef);

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        onStatusChange?.('connected');

        if (snapshot.empty) {
          saveStoredSubmittedSheets([]);
          onData([]);
          return;
        }

        const sheets: SubmittedSheetRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as SubmittedSheetRecord;
          // Filter out MA25C01 if encountered
          if (data.meta?.subjectCode?.trim()?.toUpperCase() === 'MA25C01') {
            return;
          }
          sheets.push({
            ...data,
            id: docSnap.id || data.id,
          });
        });

        // Sort by submittedAt descending if available
        sheets.sort((a, b) => {
          return (b.submittedAt || '').localeCompare(a.submittedAt || '');
        });

        // Keep local cache up to date as backup
        saveStoredSubmittedSheets(sheets);
        onData(sheets);
      },
      (error) => {
        console.warn('Firestore real-time subscription notice (falling back to cache):', error.message);
        try {
          handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
        } catch {
          // Handled and logged with structured error info
        }
        onStatusChange?.('error', error.message);
        // Fall back to local cached marksheets so user data is never lost or blank
        const cached = getStoredSubmittedSheets();
        onData(cached);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.warn('Failed to initialize Firestore listener, using local cache:', err);
    onStatusChange?.('offline', err?.message);
    const cached = getStoredSubmittedSheets();
    onData(cached);
    return () => {};
  }
}

/**
 * Seed initial sample marksheets into Firestore if cloud collection is empty (no-op if clean)
 */
export async function seedInitialMarksheets(): Promise<void> {
  // Production clean deployment: no initial sample marksheets
}

/**
 * Delete all submitted marksheets from live Firestore database
 * Preserves student rosters and department batch configurations intact.
 */
export async function deleteAllMarksheetsFromFirestore(): Promise<void> {
  try {
    const marksheetsRef = collection(db, COLLECTION_NAME);
    const msSnap = await getDocs(marksheetsRef);
    const deletePromises = msSnap.docs.map((d) =>
      deleteDoc(d.ref).catch((e) => {
        console.warn(`Failed to delete marksheet ${d.id}:`, e);
      })
    );
    await Promise.all(deletePromises);

    broadcastLiveUpdate(
      'MARKSHEET_DELETED',
      'All Submitted Marksheets Cleared',
      `All ${msSnap.docs.length} submitted marksheets were deleted from Central Database`,
      'Central Exam Cell Admin',
      { count: msSnap.docs.length }
    ).catch(() => {});
  } catch (err) {
    console.error('Error deleting all marksheets from Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, COLLECTION_NAME);
    throw err;
  }
}

/**
 * Clear all marksheets and empty all student rosters in Firestore
 */
export async function clearAllDatabaseData(): Promise<void> {
  try {
    const marksheetsRef = collection(db, COLLECTION_NAME);
    const msSnap = await getDocs(marksheetsRef);
    for (const d of msSnap.docs) {
      await deleteDoc(d.ref).catch(() => {});
    }
    const batchesRef = collection(db, BATCHES_COLLECTION);
    const bSnap = await getDocs(batchesRef);
    for (const d of bSnap.docs) {
      await updateDoc(d.ref, {
        students: [],
        defaultSubjectCode: '',
        defaultSubjectName: '',
        facultyInCharge: '',
        evaluatorName: '',
      }).catch(() => {});
    }
    // Also clear any other lingering collections if they exist
    for (const extraCol of ['subjects', 'staffs', 'students', 'staff', 'marks']) {
      try {
        const extraSnap = await getDocs(collection(db, extraCol));
        for (const docItem of extraSnap.docs) {
          await deleteDoc(docItem.ref).catch(() => {});
        }
      } catch {
        // ignore non-existent collections
      }
    }
  } catch (err) {
    console.warn('Error clearing database:', err);
  }
}

/**
 * Recursively strip any undefined fields from objects or arrays so Firestore
 * never throws "Unsupported field value: undefined".
 */
export function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => removeUndefinedFields(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedFields(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Save or submit marksheet directly to live Firestore database
 */
export async function saveMarksheetToFirestore(record: SubmittedSheetRecord): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, record.id);
    const cleanedRecord = removeUndefinedFields(record);
    await setDoc(docRef, cleanedRecord, { merge: true });

    // Broadcast live event update to backend & all connected clients
    broadcastLiveUpdate(
      'MARKSHEET_SUBMITTED',
      `Marksheet Submitted: ${record.meta.subjectCode}`,
      `${record.meta.department} • ${record.meta.semester} • ${record.meta.examType} • ${record.students.length} students`,
      record.meta.facultyInCharge || 'Faculty',
      { marksheetId: record.id, ...record.meta }
    ).catch(() => {});
  } catch (error) {
    console.error('Error saving marksheet to Firestore:', error);
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_NAME}/${record.id}`);
    throw error;
  }
}

/**
 * Toggle lock/unlock status of a marksheet in live Firestore
 */
export async function updateMarksheetLockInFirestore(sheetId: string, isUnlocked: boolean): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, sheetId);
    await updateDoc(docRef, {
      'meta.isUnlocked': isUnlocked,
      'meta.status': isUnlocked ? 'Unlocked for Editing' : 'Submitted (Locked)',
    });

    broadcastLiveUpdate(
      isUnlocked ? 'MARKSHEET_UNLOCKED' : 'MARKSHEET_LOCKED',
      isUnlocked ? 'Marksheet Unlocked by Exam Cell' : 'Marksheet Locked by Exam Cell',
      `Marksheet ID ${sheetId} editing status changed to ${isUnlocked ? 'Unlocked' : 'Locked'}`,
      'Central Exam Cell Admin',
      { sheetId, isUnlocked }
    ).catch(() => {});
  } catch (error) {
    console.error('Error updating lock in Firestore:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${sheetId}`);
    throw error;
  }
}

/**
 * Permanently approve a marksheet in live Firestore database.
 * Once approved, status becomes 'APPROVED' and the approve option cannot be shown again.
 */
export async function updateMarksheetApprovalInFirestore(sheetId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, sheetId);
    const now = new Date();
    const approvedAt = `${now.toLocaleDateString('en-IN')} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

    await updateDoc(docRef, {
      status: 'APPROVED',
      approvedAt: approvedAt,
      'meta.status': 'Approved by Exam Cell',
      'meta.isUnlocked': false,
    });

    broadcastLiveUpdate(
      'MARKSHEET_APPROVED',
      'Marksheet Verified & Approved',
      `Marksheet ID ${sheetId} has been officially verified and approved by the Central Exam Cell.`,
      'Central Exam Cell Admin',
      { sheetId, status: 'APPROVED', approvedAt }
    ).catch(() => {});
  } catch (error) {
    console.error('Error updating marksheet approval in Firestore:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${sheetId}`);
    throw error;
  }
}

/**
 * Delete a marksheet from live Firestore
 */
export async function deleteMarksheetFromFirestore(sheetId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, sheetId);
    await deleteDoc(docRef);

    // Also sweep for any doc with matching id field to guarantee complete removal
    try {
      const snap = await getDocs(query(collection(db, COLLECTION_NAME)));
      for (const d of snap.docs) {
        const data = d.data() as SubmittedSheetRecord;
        if (d.id === sheetId || data.id === sheetId) {
          await deleteDoc(d.ref).catch(() => {});
        }
      }
    } catch {
      // Ignore sweep errors
    }

    broadcastLiveUpdate(
      'MARKSHEET_DELETED',
      'Marksheet Removed',
      `Marksheet ${sheetId} was deleted from Central Database`,
      'Central Exam Cell Admin',
      { sheetId }
    ).catch(() => {});
  } catch (error) {
    console.warn('Error deleting marksheet from Firestore:', error);
    try {
      handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${sheetId}`);
    } catch {
      // Ignored
    }
  }
}

/**
 * One-off fetch of all marksheets from Firestore
 */
export async function fetchMarksheetsFromFirestore(): Promise<SubmittedSheetRecord[]> {
  try {
    const marksheetsRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(marksheetsRef);
    const sheets: SubmittedSheetRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as SubmittedSheetRecord;
      if (data.meta?.subjectCode?.trim()?.toUpperCase() !== 'MA25C01') {
        sheets.push({ ...data, id: docSnap.id || data.id });
      }
    });
    return sheets;
  } catch (error) {
    console.warn('Error fetching marksheets from Firestore:', error);
    try {
      handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
    } catch {
      // Logged structured error
    }
    return getStoredSubmittedSheets();
  }
}

/**
 * Real-time subscription to student batches in Firestore
 */
export function subscribeToLiveBatches(
  onData: (batches: YearBatchConfig[]) => void
): Unsubscribe {
  try {
    const batchesRef = collection(db, BATCHES_COLLECTION);
    const unsubscribe = onSnapshot(
      batchesRef,
      async (snapshot) => {
        if (snapshot.empty) {
          try {
            await seedInitialBatches();
          } catch (e) {
            console.warn('Initial batches seed notice:', e);
          }
          return;
        }

        const validDeptNames = new Set(DEPARTMENTS.map((d) => d.trim().toLowerCase()));
        const loaded: YearBatchConfig[] = [];
        snapshot.forEach((docSnap) => {
          const b = docSnap.data() as YearBatchConfig;
          // Clean up deleted or obsolete departments (S&H, ECE, IT, etc.)
          if (
            !b.department ||
            !validDeptNames.has(b.department.trim().toLowerCase()) ||
            b.id?.startsWith('sh_') ||
            b.id?.startsWith('ece_') ||
            b.id?.startsWith('it_')
          ) {
            deleteDoc(doc(db, BATCHES_COLLECTION, docSnap.id)).catch(() => {});
            return;
          }
          // Strip legacy subject fields from all year batches
          delete (b as any).defaultSubjectCode;
          delete (b as any).defaultSubjectName;
          loaded.push(b);
        });

        // Ensure all default batches for all departments are present
        const loadedIds = new Set(loaded.map((b) => b.id));
        const missing = DEFAULT_BATCHES.filter((b) => !loadedIds.has(b.id));
        if (missing.length > 0) {
          for (const m of missing) {
            setDoc(doc(db, BATCHES_COLLECTION, m.id), m, { merge: true }).catch(() => {});
            loaded.push(m);
          }
        }

        if (loaded.length > 0) {
          saveStoredBatches(loaded);
          onData(loaded);
        }
      },
      (err) => {
        console.warn('Firestore batches subscription notice (falling back to cache):', err);
        try {
          handleFirestoreError(err, OperationType.GET, BATCHES_COLLECTION);
        } catch {
          // Logged structured error
        }
        const cached = getStoredBatches();
        onData(cached);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to batches, using cache:', err);
    const cached = getStoredBatches();
    onData(cached);
    return () => {};
  }
}

/**
 * Delete batch document from Firestore
 */
export async function deleteBatchFromFirestore(batchId: string): Promise<void> {
  try {
    const docRef = doc(db, BATCHES_COLLECTION, batchId);
    await deleteDoc(docRef);

    broadcastLiveUpdate(
      'BATCH_UPDATED',
      'Student Batch Removed',
      `Batch ${batchId} was deleted from Central Database`,
      'Exam Cell Admin',
      { batchId }
    ).catch(() => {});
  } catch (err) {
    console.warn('Error deleting batch from Firestore:', err);
    handleFirestoreError(err, OperationType.DELETE, `${BATCHES_COLLECTION}/${batchId}`);
  }
}

/**
 * Seed initial batches into Firestore
 */
export async function seedInitialBatches(): Promise<void> {
  const batchesRef = collection(db, BATCHES_COLLECTION);
  for (const batch of DEFAULT_BATCHES) {
    const docRef = doc(batchesRef, batch.id);
    await setDoc(docRef, batch, { merge: true });
  }
}

/**
 * Save / update student batch in Firestore
 */
export async function saveBatchToFirestore(batch: YearBatchConfig): Promise<void> {
  try {
    const docRef = doc(db, BATCHES_COLLECTION, batch.id);
    const cleanedBatch = removeUndefinedFields(batch);
    await setDoc(docRef, cleanedBatch, { merge: true });

    broadcastLiveUpdate(
      'STUDENT_ROSTER_SAVED',
      `Student Roster Updated: ${batch.yearLabel || batch.id}`,
      `${batch.department} • ${batch.academicYear} • ${batch.students?.length || 0} students enrolled`,
      'Exam Cell Admin',
      { batchId: batch.id, department: batch.department, count: batch.students?.length }
    ).catch(() => {});
  } catch (err) {
    console.warn('Error saving batch to Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, `${BATCHES_COLLECTION}/${batch.id}`);
  }
}

