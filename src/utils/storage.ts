import { STORAGE_KEY } from '../constants/data';
import { AppData } from '../types';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// ── localStorage（本地快取） ──────────────────────────────────

export function loadData(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ── Firestore（已登入用戶的個人數據） ────────────────────────

function userDoc(uid: string) {
  return doc(db, 'users', uid, 'private', 'appData');
}

export async function loadUserData(uid: string): Promise<AppData | null> {
  try {
    const snap = await getDoc(userDoc(uid));
    return snap.exists() ? (snap.data() as AppData) : null;
  } catch {
    return null;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** debounce 1s，防止每次按鍵都寫入 Firestore */
export function saveUserData(uid: string, data: AppData): void {
  // 同步到 localStorage
  saveData(data);
  // debounce 寫到 Firestore
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await setDoc(userDoc(uid), data);
    } catch {}
  }, 1000);
}
