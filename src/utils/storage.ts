import { STORAGE_KEY } from '../constants/data';
import { AppData } from '../types';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { stripUndefined } from './helpers';

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

/** 立即將資料寫入 Firestore（不 debounce） */
export async function saveUserDataNow(uid: string, data: AppData): Promise<void> {
  saveData(data);
  try {
    await setDoc(userDoc(uid), stripUndefined(data));
  } catch (e) {
    console.error('[storage] Firestore 寫入失敗', e);
  }
}

/** debounce 500ms 寫入 Firestore（適用頻繁操作如輸入文字），localStorage 立即更新 */
export function saveUserData(uid: string, data: AppData): void {
  saveData(data);
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveUserDataNow(uid, data);
  }, 500);
}

/** 清空 pending 的 debounce timer，立即寫入 */
export async function flushUserData(uid: string, data: AppData): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  await saveUserDataNow(uid, data);
}
