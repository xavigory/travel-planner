import { db } from '../firebase/config';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  arrayUnion,
  arrayRemove,
  deleteField,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Trip, CollabMember, CollabRole } from '../types';
import { stripUndefined } from './helpers';

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** 把行程推到 Firestore，設定 ownerId 並將建立者加入 members */
export async function pushTrip(trip: Trip, uid: string, user: User): Promise<string> {
  const collabId = genId();
  const { collabId: _c, ...rest } = trip;
  const ownerMember: CollabMember = {
    uid,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? '',
    role: 'owner',
    joinedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'trips', collabId), {
    ...stripUndefined(rest),
    ownerId: uid,
    members: { [uid]: ownerMember },
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
    } catch (e) {
      console.warn('[sync] updateDoc failed', e);
    }
  }, 500);
}

/** 將用戶加入協作行程的 members（首次訪問時呼叫） */
export async function addMember(
  collabId: string,
  uid: string,
  user: User,
  role: CollabRole = 'editor',
): Promise<void> {
  const member: CollabMember = {
    uid,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? '',
    role,
    joinedAt: new Date().toISOString(),
  };
  await updateDoc(doc(db, 'trips', collabId), { [`members.${uid}`]: member });
}

/** 更新成員的角色（owner 專用） */
export async function updateMemberRole(
  collabId: string,
  uid: string,
  role: CollabRole,
): Promise<void> {
  await updateDoc(doc(db, 'trips', collabId), { [`members.${uid}.role`]: role });
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

/** 修復舊行程缺少 ownerId / members 的問題（靜默呼叫） */
export async function repairOwnership(collabId: string, uid: string, user: User): Promise<void> {
  const member: CollabMember = {
    uid,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? '',
    role: 'owner',
    joinedAt: new Date().toISOString(),
  };
  await updateDoc(doc(db, 'trips', collabId), {
    ownerId: uid,
    [`members.${uid}`]: member,
  });
}

/** 邀請成員（加入 invitedEmails，待對方開啟連結後自動加入 members） */
export async function inviteMemberByEmail(collabId: string, email: string): Promise<void> {
  await updateDoc(doc(db, 'trips', collabId), {
    invitedEmails: arrayUnion(email.toLowerCase()),
  });
}

/** 撤回尚未加入的邀請（僅從 invitedEmails 移除） */
export async function revokeInvite(collabId: string, email: string): Promise<void> {
  await updateDoc(doc(db, 'trips', collabId), {
    invitedEmails: arrayRemove(email.toLowerCase()),
  });
}

/** 移除已加入的成員（從 members 和 invitedEmails 一起清除） */
export async function removeMember(collabId: string, uid: string, email: string): Promise<void> {
  await updateDoc(doc(db, 'trips', collabId), {
    [`members.${uid}`]: deleteField(),
    invitedEmails: arrayRemove(email.toLowerCase()),
  });
}

/** 建立唯讀分享快照（只含行程 + 景點），存入 shares 集合 */
export async function pushSharedTrip(trip: Trip, uid: string): Promise<string> {
  const shareId = genId();
  await setDoc(doc(db, 'shares', shareId), {
    name: trip.name || '',
    destination: trip.destination || '',
    startDate: trip.startDate || '',
    endDate: trip.endDate || '',
    currency: trip.currency || '',
    localCurrency: trip.localCurrency || '',
    itinerary: stripUndefined(trip.itinerary || {}),
    attractions: (trip.attractions || []).map(a => stripUndefined(a as unknown as Record<string, unknown>)),
    dayOrder: stripUndefined(trip.dayOrder || {}),
    ownerId: uid,
    _createdAt: serverTimestamp(),
  });
  return shareId;
}

/** 取得分享快照（一次性讀取） */
export async function getSharedTrip(shareId: string): Promise<Partial<Trip> | null> {
  const snap = await getDoc(doc(db, 'shares', shareId));
  if (!snap.exists()) return null;
  const { _createdAt, ownerId: _o, ...data } = snap.data();
  return data as Partial<Trip>;
}

export function buildShareUrl(shareId: string): string {
  return `${window.location.origin}${window.location.pathname}?share=${shareId}`;
}

export function getShareIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('share');
}

export function buildCollabUrl(collabId: string): string {
  return `${window.location.origin}${window.location.pathname}?trip=${collabId}`;
}

export function getCollabIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('trip');
}
