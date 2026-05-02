import { db } from '../firebase/config';
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { Trip } from '../types';
import { stripUndefined } from './helpers';

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** 把行程推到 Firestore，回傳 collabId */
export async function pushTrip(trip: Trip): Promise<string> {
  const collabId = genId();
  const { collabId: _c, ...rest } = trip;
  await setDoc(doc(db, 'trips', collabId), {
    ...stripUndefined(rest),
    _updatedAt: serverTimestamp(),
  });
  return collabId;
}

/** debounce 計時器（每個 collabId 獨立） */
const timers: Record<string, ReturnType<typeof setTimeout>> = {};

/** 更新 Firestore（500ms debounce，防止過度寫入） */
export function syncTrip(collabId: string, trip: Trip): void {
  clearTimeout(timers[collabId]);
  timers[collabId] = setTimeout(async () => {
    const { collabId: _c, ...rest } = trip;
    const clean = { ...stripUndefined(rest), _updatedAt: serverTimestamp() };
    try {
      await updateDoc(doc(db, 'trips', collabId), clean);
    } catch {
      await setDoc(doc(db, 'trips', collabId), clean);
    }
  }, 500);
}

/** 訂閱 Firestore 行程變更，回傳取消訂閱函式 */
export function subscribeTrip(
  collabId: string,
  onData: (trip: Trip) => void,
  onError: () => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'trips', collabId),
    snap => {
      if (!snap.exists()) { onError(); return; }
      const { _updatedAt, ...data } = snap.data();
      onData({ ...(data as Trip), collabId });
    },
    () => onError(),
  );
}

export function buildCollabUrl(collabId: string): string {
  return `${window.location.origin}${window.location.pathname}?trip=${collabId}`;
}

export function getCollabIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('trip');
}
