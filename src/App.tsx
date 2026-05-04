import { useState, useEffect, useRef } from 'react';
import { AppData, Trip, CollabRole } from './types';
import { colors } from './constants/colors';
import { fonts } from './constants/fonts';
import { DEF_PACK, TABS } from './constants/data';
import { loadData, loadUserData, saveUserData, saveUserDataNow } from './utils/storage';
import { sanitizeData, uid, getDays } from './utils/helpers';
import { collectReminders } from './utils/reminders';
import { onAuthChange, signInWithGoogle, signOut, User } from './utils/auth';
import { pushTrip, syncTrip, subscribeTrip, buildCollabUrl, getCollabIdFromUrl, addMember, updateMemberRole, inviteMemberByEmail, removeMember, revokeInvite, repairOwnership } from './utils/share';
import { Button } from './components/Button';
import { Badge } from './components/Badge';
import { Modal } from './components/Modal';
import { TripModal } from './components/TripModal';
import ItineraryTab from './components/tabs/ItineraryTab';
import AttractionsTab from './components/tabs/AttractionsTab';
import AccomTransTab from './components/tabs/AccomTransTab';
import ExpensesTab from './components/tabs/ExpensesTab';
import LuggageTab from './components/tabs/LuggageTab';

const Sty = {
  inp: {
    width: '100%',
    boxSizing: 'border-box' as const,
    border: `1.5px solid ${colors.cloud}`,
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    color: colors.ink,
    background: colors.white,
    fontFamily: fonts.body,
    outline: 'none' as const,
  },
  card: {
    background: colors.white,
    borderRadius: 14,
    border: '1px solid rgba(0,0,0,0.07)',
    marginBottom: 10,
    overflow: 'hidden' as const,
  },
};

function tripName(t: Trip): string {
  return t.name || (t.startDate || '?') + ' ' + (t.destination || '未命名');
}

export default function App() {
  // ── 認證狀態 ────────────────────────────────────────────────
  // 'loading' = Firebase 還未確認登入狀態；null = 未登入；User = 已登入
  const [authUser, setAuthUser] = useState<User | null | 'loading'>('loading');
  const [authError, setAuthError] = useState('');

  // ── 行程資料 ─────────────────────────────────────────────────
  const [data, setData] = useState<AppData>(() => {
    const loaded = sanitizeData(loadData());
    return loaded || { trips: [], lugTpls: [...DEF_PACK] };
  });
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [modal, setModal] = useState<string | null>(null);
  const [editTripId, setEditTripId] = useState<string | null>(null);
  const [deleteTripId, setDeleteTripId] = useState<string | null>(null);
  const [showMemo, setShowMemo] = useState(false);

  // 協作狀態：客人透過連結進入時使用（不存 localStorage）
  const [guestTrip, setGuestTrip] = useState<Trip | 'loading' | 'error' | null>(null);
  const [guestTab, setGuestTab] = useState(0);

  // 開啟協作連結的 modal 狀態
  const [collabUrl, setCollabUrl] = useState('');
  const [collabStatus, setCollabStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [collabTripId, setCollabTripId] = useState<string | null>(null);
  const [collabIsOwner, setCollabIsOwner] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);


  // 本地行程訂閱清理函式（有 collabId 的行程）
  // guestTrip 的 ref，讓 upGuestTrip 能讀取最新值而不在 updater 中產生副作用
  const guestTripRef = useRef<Trip | null>(null);
  // authUser 的 ref，讓訂閱 callback（閉包）能讀到最新的登入狀態
  const authUserRef = useRef(authUser);
  // 紀錄已自動儲存過的 collabId（避免重複觸發 setData）
  const collabAutoSavedRef = useRef<Set<string>>(new Set());
  authUserRef.current = authUser;
  // Map 式訂閱管理：collabId → unsubscribe fn
  const activeSubsRef = useRef<Map<string, () => void>>(new Map());

  // 監聽 Firebase 登入狀態
  useEffect(() => {
    return onAuthChange(async user => {
      setAuthUser(user);
      if (user) {
        const cloud = await loadUserData(user.uid);
        if (cloud) {
          const sanitized = sanitizeData(cloud);
          if (sanitized) {
            setData(prev => {
              // 合併策略：個人 Firestore 可能比協作訂閱更舊（race condition）
              // 對有 collabId 的行程：若 prev 已有訂閱帶來的版本，保留它；否則用個人 Firestore 版本
              const cloudById = new Map(sanitized.trips.map((t: Trip) => [t.id, t]));
              const prevById = new Map(prev.trips.map((t: Trip) => [t.id, t]));

              const trips: Trip[] = sanitized.trips.map((ct: Trip) => {
                const prevTrip = prevById.get(ct.id);

                // 協作行程：訂閱已更新則優先使用 prev
                if (ct.collabId && prevTrip?.collabId) return prevTrip;

                // 非協作行程：合併 attractions 的查詢結果
                // Firestore 有 1 秒 debounce，刷新太快時 cloud 可能還是舊的
                // 規則：若 prev 的 attraction 已有查詢資料（queryOk: true）
                //        而 cloud 對應的 attraction 尚未查詢過，保留 prev 的版本
                if (prevTrip && prevTrip.attractions?.length) {
                  const prevAttrById = new Map(
                    prevTrip.attractions.map(a => [a.id, a])
                  );
                  const mergedAttractions = (ct.attractions || []).map(ca => {
                    const pa = prevAttrById.get(ca.id);
                    // prev 有查詢過、cloud 還沒有 → 保留 prev 的 attraction
                    if (pa?.queryOk === true && !ca.queryOk) return pa;
                    return ca;
                  });
                  return { ...ct, attractions: mergedAttractions };
                }

                return ct;
              });

              // 保留 prev 中有但個人 Firestore 尚未收錄的行程（例如剛新增的）
              prev.trips.forEach(t => {
                if (!cloudById.has(t.id)) trips.push(t);
              });

              return { ...sanitized, trips };
            });
          }
        }
      }
    });
  }, []);

  // 資料變動時同步儲存
  useEffect(() => {
    if (!authUser || authUser === 'loading') return;
    saveUserData(authUser.uid, data);
  }, [data, authUser]);


  // 讓 guestTripRef 永遠跟 guestTrip state 同步
  if (guestTrip && typeof guestTrip === 'object') {
    guestTripRef.current = guestTrip;
  }

  // 偵測 ?trip= URL → 客人模式
  useEffect(() => {
    const collabId = getCollabIdFromUrl();
    if (!collabId) return;
    setGuestTrip('loading');
    const unsub = subscribeTrip(
      collabId,
      trip => setGuestTrip(trip),
      () => setGuestTrip('error'),
    );
    return () => unsub();
  }, []);

  // 訂閱本地所有有 collabId 的行程（接收朋友的修改）
  // 用 Map 做增量管理：只在 collabId 集合真正改變時新增/移除訂閱
  const collabIdsKey = [...new Set(
    data.trips.filter(t => t.collabId).map(t => t.collabId!)
  )].sort().join('|');

  useEffect(() => {
    const currentIds = new Set(
      data.trips.filter(t => t.collabId).map(t => t.collabId!)
    );
    const subs = activeSubsRef.current;

    // 移除不再存在的訂閱
    subs.forEach((unsub, cid) => {
      if (!currentIds.has(cid)) {
        console.log('[collab] 取消訂閱', cid);
        unsub();
        subs.delete(cid);
      }
    });

    // 新增尚未訂閱的 collabId
    currentIds.forEach(collabId => {
      if (!subs.has(collabId)) {
        console.log('[collab] 建立訂閱', collabId);
        subs.set(
          collabId,
          subscribeTrip(
            collabId,
            remote => {
              console.log('[collab] 收到更新', collabId, remote);
              const curUser = authUserRef.current;
              const curUid = curUser && typeof curUser === 'object' ? curUser.uid : null;
              const curEmail = curUser && typeof curUser === 'object' ? (curUser.email ?? '').toLowerCase() : '';
              const authorized =
                remote.ownerId === curUid ||
                !!(curUid && remote.members?.[curUid]) ||
                !!(curEmail && (remote.invitedEmails ?? []).includes(curEmail));
              if (!authorized) {
                // 被擁有者移除：從本地清單刪除此協作行程
                setData(d => ({ ...d, trips: d.trips.filter(x => x.collabId !== remote.collabId) }));
                return;
              }
              setData(d => ({
                ...d,
                trips: d.trips.map(x =>
                  x.collabId === remote.collabId ? { ...remote, id: x.id } : x
                ),
              }));
            },
            () => console.warn('[collab] 訂閱錯誤', collabId),
          )
        );
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collabIdsKey]);

  // 離開頁面時清除全部訂閱，並清空 Map
  // ★ 清空 Map 是關鍵：React Strict Mode 模擬 unmount 後若 Map 不清空，
  //   重新 mount 時 subs.has(collabId) 仍為 true，導致訂閱無法重建
  useEffect(() => {
    return () => {
      activeSubsRef.current.forEach(u => u());
      activeSubsRef.current.clear();
    };
  }, []);

  // 訪客訪問協作行程：驗證權限 → 自動加入 members → 自動同步到個人帳戶
  useEffect(() => {
    if (!guestTrip || guestTrip === 'loading' || guestTrip === 'error') return;
    if (!authUser || authUser === 'loading') return;
    if (!guestTrip.collabId) return;

    const myUid = authUser.uid;
    const myEmail = (authUser.email ?? '').toLowerCase();
    const isOwner = guestTrip.ownerId === myUid;
    const isAlreadyMember = !!guestTrip.members?.[myUid];
    const isInvited = (guestTrip.invitedEmails ?? []).includes(myEmail);

    if (!isOwner && !isAlreadyMember && !isInvited) return;
    if (isOwner) return; // 擁有者本地已有行程，不需重複加入

    // 加入 members
    if (!isAlreadyMember) {
      addMember(guestTrip.collabId, myUid, authUser).catch(e =>
        console.warn('[collab] addMember failed', e)
      );
    }

    // 自動同步協作行程到個人帳戶（含 collabId 保持即時同步）
    const cid = guestTrip.collabId;
    if (!collabAutoSavedRef.current.has(cid)) {
      collabAutoSavedRef.current.add(cid);
      setData(d => {
        if (d.trips.some(t => t.collabId === cid)) return d;
        return { ...d, trips: [...d.trips, { ...guestTrip, id: uid() }] };
      });
    }
  }, [guestTrip, authUser]);

  /** 更新本地行程，若有 collabId 同步到 Firestore；同時立即寫入個人 Firestore */
  function upTrip(id: string, fn: (t: Trip) => Trip) {
    // updater 同步執行，next 可在 setData 返回後立即取得
    let next: AppData | null = null;
    setData(d => {
      const trips = d.trips.map(t => (t.id === id ? fn(t) : t));
      const updated = trips.find(t => t.id === id);
      if (updated?.collabId) syncTrip(updated.collabId, updated);
      next = { ...d, trips };
      return next;
    });
    // 直接寫入，不等 useEffect，確保資料立即持久化
    if (next !== null && authUser && typeof authUser === 'object') {
      saveUserDataNow(authUser.uid, next);
    }
  }

  async function handleInvite(collabId: string) {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviteLoading(true);
    try {
      await inviteMemberByEmail(collabId, email);
      setInviteEmail('');
    } catch (e) {
      console.warn('[invite]', e);
    }
    setInviteLoading(false);
  }

  /** 客人模式：透過 ref 讀最新值，避免在 setState updater 裡產生副作用 */
  function upGuestTrip(fn: (t: Trip) => Trip) {
    const cur = guestTripRef.current;
    if (!cur) return;
    const updated = fn(cur);
    guestTripRef.current = updated;
    setGuestTrip(updated);
    if (updated.collabId) syncTrip(updated.collabId, updated);
  }

  const trip = sel ? data.trips.find(t => t.id === sel) || null : null;
  const editTrip = editTripId ? data.trips.find(t => t.id === editTripId) || null : null;
  const reminders = collectReminders(data.trips);

  // ── Firebase 初始化中（尚未確認登入狀態）────────────────────
  if (authUser === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: colors.page, fontFamily: fonts.body, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: colors.mist }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✈️</div>
          <div style={{ fontSize: 14 }}>載入中…</div>
        </div>
      </div>
    );
  }

  // ── 分享連結（?trip= URL 進入，支援未登入唯讀）──────────────
  if (guestTrip === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: colors.page, fontFamily: fonts.body, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: colors.mist }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✈️</div>
          <div style={{ fontSize: 16 }}>正在載入行程…</div>
        </div>
      </div>
    );
  }

  if (guestTrip === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: colors.page, fontFamily: fonts.body, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: colors.mist }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, marginBottom: 8 }}>找不到這份行程</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>連結可能有誤，請再次確認</div>
          <Button onClick={() => { window.location.href = window.location.pathname; }}>回首頁</Button>
        </div>
      </div>
    );
  }

  if (guestTrip && typeof guestTrip === 'object') {
    const isLoggedIn = typeof authUser === 'object' && authUser !== null;
    const myUid = isLoggedIn ? (authUser as User).uid : null;
    const myEmail = isLoggedIn ? ((authUser as User).email ?? '').toLowerCase() : '';
    const myMemberRole: CollabRole | undefined = myUid ? guestTrip.members?.[myUid]?.role : undefined;
    const isMember = !!myMemberRole;
    const isOwnerOfCollab = guestTrip.ownerId === myUid || myMemberRole === 'owner';
    const isInvited = myEmail ? (guestTrip.invitedEmails ?? []).includes(myEmail) : false;
    // 可編輯：正式成員（非 viewer）或已受邀待加入
    const canEdit = (isMember && myMemberRole !== 'viewer') || isInvited;
    const alreadySaved = isLoggedIn && data.trips.some(t =>
      t.collabId === guestTrip.collabId || t.savedFromCollabId === guestTrip.collabId
    );

    const gt = guestTrip;
    const gtDays = getDays(gt.startDate, gt.endDate);
    // 成員/擁有者/已加入者看全部頁籤；未加入且非成員只看行程＆景點
    const showAllTabs = isMember || isOwnerOfCollab || alreadySaved;
    const effectiveGuestTab = showAllTabs ? guestTab : Math.min(guestTab, 1);

    // 已加入的非成員：tabs 2-4 顯示個人副本資料（住宿/交通/花費為空），不顯示擁有者私人資訊
    const tripForPrivateTabs: Trip = (alreadySaved && !isMember && !isOwnerOfCollab)
      ? (data.trips.find(t => t.savedFromCollabId === gt.collabId)
          ?? { ...gt, accommodations: [], transports: [], expenses: [], luggage: [] })
      : gt;

    function upGuestTripOrNoop(fn: (t: Trip) => Trip) {
      if (!canEdit) return;
      upGuestTrip(fn);
    }

    return (
      <div style={{ minHeight: '100vh', background: colors.page, fontFamily: fonts.body }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 20px' }}>
          {/* 橫幅：依登入 / 成員狀態顯示不同資訊 */}
          <div style={{ background: colors.tealLight, border: `1.5px solid ${colors.teal}`, borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🔗</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.tealDark }}>
                分享的行程
                {myMemberRole && (
                  <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 999, padding: '2px 8px', marginLeft: 6,
                    background: myMemberRole === 'viewer' ? colors.cloud : colors.teal, color: colors.white }}>
                    {myMemberRole === 'owner' ? '✦ 擁有者' : myMemberRole === 'editor' ? '✏️ 協作者' : '👁 查看'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: colors.slate, marginTop: 2 }}>
                {!isLoggedIn
                  ? '請登入後可將行程加入你的帳戶'
                  : canEdit
                  ? '你的修改會即時同步給所有協作者'
                  : isMember
                  ? '你的權限為唯讀，無法修改此行程'
                  : '唯讀預覽，可將行程複製到你的帳戶作個人使用'}
              </div>
            </div>
            {/* 右側操作 */}
            {!isLoggedIn ? (
              <Button variant="teal" size="small" onClick={async () => { try { await signInWithGoogle(); } catch {} }}>
                登入
              </Button>
            ) : isOwnerOfCollab ? (
              <span style={{ fontSize: 12, color: colors.tealDark, fontWeight: 600 }}>✦ 擁有者</span>
            ) : isMember ? (
              <span style={{ fontSize: 12, color: colors.tealDark, fontWeight: 600 }}>✓ 已同步</span>
            ) : alreadySaved ? (
              <span style={{ fontSize: 12, color: colors.tealDark, fontWeight: 600 }}>✓ 已加入</span>
            ) : (
              <Button
                variant="teal"
                size="small"
                onClick={() => {
                  // 個人副本只保留行程規劃＆景點，其餘資料不複製
                  setData(d => ({
                    ...d,
                    trips: [...d.trips, {
                      id: uid(),
                      name: gt.name,
                      destination: gt.destination,
                      startDate: gt.startDate,
                      endDate: gt.endDate,
                      currency: gt.currency,
                      localCurrency: gt.localCurrency,
                      memo: '',
                      itinerary: gt.itinerary,
                      attractions: gt.attractions,
                      accommodations: [],
                      transports: [],
                      expenses: [],
                      luggage: data.lugTpls.map(n => ({ id: uid(), name: n, checked: false })),
                      dayOrder: gt.dayOrder,
                      savedFromCollabId: gt.collabId,
                    } as Trip],
                  }));
                }}
              >
                ＋ 加入我的行程
              </Button>
            )}
          </div>

          {/* 行程標題 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Button size="small" onClick={() => { window.location.href = window.location.pathname; }}>
              ← 我的行程
            </Button>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 500, color: colors.ink }}>
                {tripName(gt)}
              </div>
              {gt.startDate && gt.endDate && (
                <div style={{ fontSize: 12, color: colors.mist }}>
                  {gt.startDate} ～ {gt.endDate} · {gtDays.length} 天
                </div>
              )}
            </div>
          </div>

          {/* 頁籤：成員/擁有者全部 5 個；其他人只有行程＆景點 */}
          <div style={{ display: 'flex', background: colors.white, borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', padding: 4, marginBottom: 16, overflowX: 'auto', gap: 2 }}>
            {(showAllTabs ? TABS : [TABS[0], TABS[1]]).map(([ic, lb], i) => (
              <button
                key={i}
                onClick={() => setGuestTab(i)}
                style={{ flex: 1, padding: '8px 10px', border: 'none', borderRadius: 10, background: i === effectiveGuestTab ? colors.coral : 'transparent', cursor: 'pointer', fontSize: 12, color: i === effectiveGuestTab ? colors.white : colors.mist, whiteSpace: 'nowrap', fontWeight: i === effectiveGuestTab ? 700 : 500, fontFamily: fonts.body, transition: 'all .15s', minWidth: 56 }}
              >
                {ic} {lb}
              </button>
            ))}
          </div>

          {effectiveGuestTab === 0 && <ItineraryTab trip={gt} upTrip={fn => upGuestTripOrNoop(fn)} readOnly={!canEdit} />}
          {effectiveGuestTab === 1 && <AttractionsTab trip={gt} upTrip={fn => upGuestTripOrNoop(fn)} readOnly={!canEdit} />}
          {showAllTabs && effectiveGuestTab === 2 && <AccomTransTab trip={tripForPrivateTabs} upTrip={fn => upGuestTripOrNoop(fn)} />}
          {showAllTabs && effectiveGuestTab === 3 && <ExpensesTab trip={tripForPrivateTabs} upTrip={fn => upGuestTripOrNoop(fn)} />}
          {showAllTabs && effectiveGuestTab === 4 && (
            <LuggageTab
              trip={tripForPrivateTabs}
              upTrip={fn => upGuestTripOrNoop(fn)}
              tpls={data.lugTpls}
              setTpls={tpls => setData(d => ({ ...d, lugTpls: tpls }))}
            />
          )}
        </div>
      </div>
    );
  }

  // ── 登入頁面（未登入且非分享連結）──────────────────────────
  if (!authUser) {
    return (
      <div style={{ minHeight: '100vh', background: colors.page, fontFamily: fonts.body, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 360, padding: '0 24px' }}>
          <div style={{
            fontFamily: fonts.display,
            fontSize: 36,
            fontWeight: 700,
            background: `linear-gradient(135deg,${colors.coral},${colors.violet})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 8,
          }}>
            Wanderlust
          </div>
          <div style={{ fontSize: 14, color: colors.mist, marginBottom: 40 }}>你的私人旅行規劃助手</div>

          <button
            onClick={async () => {
              setAuthError('');
              try {
                await signInWithGoogle();
              } catch {
                setAuthError('登入失敗，請再試一次');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '14px 20px',
              border: `1.5px solid ${colors.cloud}`,
              borderRadius: 12,
              background: colors.white,
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 600,
              color: colors.ink,
              fontFamily: fonts.body,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            使用 Google 帳號登入
          </button>

          {authError && (
            <div style={{ marginTop: 14, fontSize: 13, color: colors.danger }}>{authError}</div>
          )}

          <div style={{ marginTop: 32, fontSize: 12, color: colors.cloud, lineHeight: 1.6 }}>
            你的行程資料只有你自己可以看到。<br />
            登入即代表你同意我們的使用條款。
          </div>
        </div>
      </div>
    );
  }
  // ─────────────────────────────────────────────────────────

  if (!sel) {
    return (
      <div style={{ minHeight: '100vh', background: colors.page, fontFamily: fonts.body }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 28,
                  fontWeight: 700,
                  background: `linear-gradient(135deg,${colors.coral},${colors.violet})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1.1,
                }}
              >
                Wanderlust
              </div>
              <div style={{ fontSize: 12, color: colors.mist, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>
                我的旅行
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {authUser && typeof authUser === 'object' && (
                <span style={{ fontSize: 12, color: colors.mist }}>{authUser.displayName || authUser.email}</span>
              )}
              <Button variant="pri" onClick={() => setModal('new')}>＋ 新增旅行</Button>
              <Button onClick={async () => { await signOut(); setData({ trips: [], lugTpls: [...DEF_PACK] }); setSel(null); }}>
                登出
              </Button>
            </div>
          </div>

          {reminders.length > 0 && (
            <div style={{ ...Sty.card, marginBottom: 20 }}>
              <div style={{ padding: '14px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.coral, marginBottom: 12 }}>
                  ⏰ 即將到來的提醒
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {reminders.map((r, i) => {
                    const isT = r.type === 'ticket';
                    const bg = isT ? colors.violetLight : r.diff <= 3 ? colors.dangerLight : r.diff <= 7 ? colors.sunLight : colors.tealLight;
                    const fc = isT ? colors.violetDark : r.diff <= 3 ? colors.dangerDark : r.diff <= 7 ? colors.sunDark : colors.tealDark;
                    const dl = r.diff === 0 ? '今天' : r.diff === 1 ? '明天' : r.diff + '天後';
                    return (
                      <div
                        key={i}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: bg, borderRadius: 10, cursor: 'pointer' }}
                        onClick={() => { setSel(r.tripId); setTab(isT ? 1 : 2); }}
                      >
                        <span style={{ fontSize: 16 }}>{isT ? '🎫' : '🔔'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: fc }}>{r.label}</div>
                          <div style={{ fontSize: 11, color: fc, opacity: 0.8 }}>
                            {r.tripName} · {r.date}{r.time ? ' ' + r.time : ''}{r.tz ? ' (' + r.tz + ')' : ''}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: fc, background: colors.white, borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap' as const }}>
                          {dl}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {data.trips.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 32px', background: colors.white, borderRadius: 20, border: `2px dashed ${colors.cloud}` }}>
              <div style={{ fontSize: 48, marginBottom: 14, opacity: 0.5 }}>✈️</div>
              <div style={{ fontFamily: fonts.display, fontSize: 20, fontWeight: 500, color: colors.ink, marginBottom: 8 }}>尚未規劃任何行程</div>
              <div style={{ fontSize: 14, color: colors.mist }}>點擊右上角「新增旅行」開始規劃</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.trips.map(t => {
              const days = getDays(t.startDate, t.endDate);
              return (
                <div
                  key={t.id}
                  style={{ ...Sty.card, cursor: 'pointer', marginBottom: 0 }}
                  onClick={() => { setSel(t.id); setTab(0); }}
                >
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontFamily: fonts.display, fontSize: 18, fontWeight: 500, color: colors.ink }}>
                          {tripName(t)}
                        </div>
                        <div style={{ fontSize: 13, color: colors.mist, marginTop: 4 }}>
                          {t.startDate && t.endDate ? t.startDate + ' ～ ' + t.endDate + '  ·  ' + days.length + '天' : '日期未設定'}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          {t.currency && <Badge fc={colors.violetDark} bg={colors.violetLight} text={t.currency} />}
                          {t.localCurrency && <Badge fc={colors.tealDark} bg={colors.tealLight} text={t.localCurrency} />}
                          {t.collabId && (
                            <span style={{ fontSize: 11, color: colors.tealDark, background: colors.tealLight, borderRadius: 999, padding: '2px 8px', fontWeight: 600 }}>
                              🤝 協作中
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <Button
                          variant={t.collabId ? 'teal' : 'def'}
                          size="small"
                          onClick={async () => {
                            const curUid = (authUser as User).uid;
                            const curUser = authUser as User;
                            // 沒有 ownership 資料（舊行程）→ 假定是擁有者
                            const hasOwnerInfo = !!(t.ownerId || t.members?.[curUid]);
                            const amOwner = !t.collabId ||
                              !hasOwnerInfo ||
                              t.ownerId === curUid ||
                              t.members?.[curUid]?.role === 'owner';
                            setCollabIsOwner(amOwner);
                            if (t.collabId) {
                              setCollabTripId(t.id);
                              setCollabUrl(buildCollabUrl(t.collabId));
                              setCollabStatus('done');
                              setCopied(false);
                              setModal('collab');
                              // 舊行程缺少 ownership 資料 → 靜默修復
                              if (amOwner && (!t.ownerId || !t.members?.[curUid])) {
                                repairOwnership(t.collabId, curUid, curUser).catch(() => {});
                              }
                              return;
                            }
                            setCollabTripId(t.id);
                            setCollabStatus('loading');
                            setCollabUrl('');
                            setCopied(false);
                            setModal('collab');
                            try {
                              const cid = await pushTrip(t, curUid, curUser);
                              upTrip(t.id, x => ({ ...x, collabId: cid }));
                              setCollabUrl(buildCollabUrl(cid));
                              setCollabStatus('done');
                            } catch {
                              setCollabStatus('error');
                            }
                          }}
                        >
                          {t.collabId ? '🔗 分享與協作' : '🔗 分享與協作'}
                        </Button>
                        <Button
                          size="small"
                          onClick={() => { setEditTripId(t.id); setModal('editTrip'); }}
                        >
                          ✏️ 編輯
                        </Button>
                        <Button
                          variant="dan"
                          size="small"
                          onClick={() => setDeleteTripId(t.id)}
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 刪除確認 Modal */}
          {deleteTripId && (() => {
            const target = data.trips.find(t => t.id === deleteTripId);
            return (
              <Modal title="確認刪除" onClose={() => setDeleteTripId(null)}>
                <p style={{ fontSize: 14, color: colors.slate, marginBottom: 20 }}>
                  確定要刪除「<strong>{target ? tripName(target) : ''}</strong>」嗎？<br />
                  <span style={{ fontSize: 13, color: colors.danger }}>此操作無法復原。</span>
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Button onClick={() => setDeleteTripId(null)}>取消</Button>
                  <Button
                    variant="dan"
                    onClick={() => {
                      setData(d => ({ ...d, trips: d.trips.filter(t => t.id !== deleteTripId) }));
                      setDeleteTripId(null);
                    }}
                  >
                    確認刪除
                  </Button>
                </div>
              </Modal>
            );
          })()}

          {/* 協作連結 Modal */}
          {modal === 'collab' && (() => {
            const ct = collabTripId ? data.trips.find(t => t.id === collabTripId) : null;
            const memberList = Object.values(ct?.members || {}).sort((a, b) =>
              a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : a.email.localeCompare(b.email)
            );
            const memberEmailSet = new Set(memberList.map(m => m.email.toLowerCase()));
            const pendingEmails = (ct?.invitedEmails || []).filter(e => !memberEmailSet.has(e));
            return (
              <Modal title="🤝 協作行程" onClose={() => { setModal(null); setCollabStatus('idle'); setCollabTripId(null); setCollabIsOwner(false); }}>
                {collabStatus === 'loading' && (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: colors.mist }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
                    <div style={{ fontSize: 14 }}>正在建立協作連結…</div>
                  </div>
                )}
                {collabStatus === 'done' && (
                  <div>
                    {/* 分享連結 — 僅擁有者 */}
                    {collabIsOwner && (
                      <>
                        <div style={{ fontSize: 13, color: colors.slate, marginBottom: 12 }}>
                          把以下連結傳給受邀成員，他們可以即時編輯這份行程：
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: colors.fog, borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                          <span style={{ flex: 1, fontSize: 12, color: colors.ink, wordBreak: 'break-all' as const }}>
                            {collabUrl}
                          </span>
                          <Button
                            variant="pri"
                            size="small"
                            onClick={() => {
                              navigator.clipboard.writeText(collabUrl);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                          >
                            {copied ? '✓ 已複製' : '複製'}
                          </Button>
                        </div>
                        <div style={{ fontSize: 12, color: colors.mist, marginBottom: memberList.length > 0 ? 20 : 0 }}>
                          💡 連結永久有效，僅受邀的成員可以存取。
                        </div>
                      </>
                    )}

                    {/* 成員區塊：清單所有人可見，邀請/移除/角色調整僅擁有者 */}
                    {(collabIsOwner || memberList.length > 0) && (
                      <div style={{ borderTop: `1px solid ${colors.cloud}`, paddingTop: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: colors.ink, marginBottom: 12 }}>👥 成員</div>

                        {/* 邀請輸入框 — 僅擁有者 */}
                        {collabIsOwner && (
                          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                            <input
                              type="email"
                              placeholder="輸入 Email 邀請成員…"
                              value={inviteEmail}
                              onChange={e => setInviteEmail(e.target.value)}
                              onKeyDown={async e => { if (e.key === 'Enter' && ct?.collabId) await handleInvite(ct.collabId); }}
                              style={{ ...Sty.inp, flex: 1 }}
                            />
                            <Button
                              variant="pri"
                              size="small"
                              disabled={inviteLoading || !inviteEmail.trim()}
                              onClick={async () => { if (ct?.collabId) await handleInvite(ct.collabId); }}
                            >
                              {inviteLoading ? '…' : '邀請'}
                            </Button>
                          </div>
                        )}

                        {/* 已加入成員清單 — 所有人可見 */}
                        {memberList.length > 0 && (
                          <div style={{ marginBottom: collabIsOwner && pendingEmails.length > 0 ? 14 : 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: colors.mist, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8 }}>已加入的成員</div>
                            {memberList.map(m => (
                              <div key={m.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${colors.fog}` }}>
                                {m.photoURL ? (
                                  <img src={m.photoURL} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' as const, flexShrink: 0 }} />
                                ) : (
                                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: colors.cloud, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: colors.white, fontWeight: 700, flexShrink: 0 }}>
                                    {(m.displayName || m.email).charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                                    {m.displayName || m.email}
                                  </div>
                                  <div style={{ fontSize: 11, color: colors.mist, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                                    {m.email}
                                  </div>
                                </div>
                                {m.role === 'owner' ? (
                                  <span style={{ fontSize: 11, color: colors.coral, fontWeight: 700, whiteSpace: 'nowrap' as const }}>✦ 擁有者</span>
                                ) : collabIsOwner ? (
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                                    <select
                                      value={m.role}
                                      onChange={async e => {
                                        if (!ct?.collabId) return;
                                        await updateMemberRole(ct.collabId, m.uid, e.target.value as CollabRole);
                                      }}
                                      style={{ fontSize: 12, border: `1px solid ${colors.cloud}`, borderRadius: 6, padding: '4px 8px', background: colors.white, color: colors.ink, cursor: 'pointer', fontFamily: fonts.body }}
                                    >
                                      <option value="editor">✏️ 編輯</option>
                                      <option value="viewer">👁 查看</option>
                                    </select>
                                    <Button
                                      variant="dan"
                                      size="small"
                                      onClick={async () => {
                                        if (!ct?.collabId) return;
                                        await removeMember(ct.collabId, m.uid, m.email);
                                      }}
                                    >
                                      移除
                                    </Button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 11, fontWeight: 600, color: m.role === 'editor' ? colors.tealDark : colors.mist, background: m.role === 'editor' ? colors.tealLight : colors.fog, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' as const }}>
                                    {m.role === 'editor' ? '✏️ 編輯' : '👁 查看'}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 待加入（已邀請）— 僅擁有者 */}
                        {collabIsOwner && pendingEmails.length > 0 && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: colors.mist, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8 }}>待加入（已邀請）</div>
                            {pendingEmails.map(email => (
                              <div key={email} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: `1px solid ${colors.fog}` }}>
                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: colors.fog, border: `1px solid ${colors.cloud}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                                  ✉️
                                </div>
                                <div style={{ flex: 1, fontSize: 13, color: colors.slate }}>{email}</div>
                                <Button
                                  variant="dan"
                                  size="small"
                                  onClick={async () => {
                                    if (!ct?.collabId) return;
                                    await revokeInvite(ct.collabId, email);
                                  }}
                                >
                                  撤回
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {collabStatus === 'error' && (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: colors.danger }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
                    <div style={{ fontSize: 14, marginBottom: 12 }}>建立失敗，請確認網路連線</div>
                    <Button onClick={() => setModal(null)}>關閉</Button>
                  </div>
                )}
              </Modal>
            );
          })()}

          {modal === 'new' && (
            <TripModal
              title="新增旅行"
              init={{}}
              onClose={() => setModal(null)}
              onSave={f => {
                const id = uid();
                setData(d => ({
                  ...d,
                  trips: [
                    ...d.trips,
                    {
                      id,
                      itinerary: {},
                      attractions: [],
                      accommodations: [],
                      transports: [],
                      expenses: [],
                      luggage: d.lugTpls.map(n => ({ id: uid(), name: n, checked: false })),
                      memo: '',
                      ...f,
                    } as Trip,
                  ],
                }));
                setModal(null);
              }}
            />
          )}
          {modal === 'editTrip' && editTrip && (
            <TripModal
              title="編輯旅行"
              init={editTrip}
              onClose={() => { setModal(null); setEditTripId(null); }}
              onSave={f => {
                upTrip(editTripId!, t => ({ ...t, ...f }));
                setModal(null);
                setEditTripId(null);
              }}
            />
          )}
        </div>
      </div>
    );
  }

  if (!trip) {
    setSel(null);
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.page, fontFamily: fonts.body }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Button size="small" onClick={() => setSel(null)}>
            ← 返回
          </Button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 500, color: colors.ink }}>
              {tripName(trip)}
            </div>
            {trip.startDate && trip.endDate && (
              <div style={{ fontSize: 12, color: colors.mist }}>
                {trip.startDate} ～ {trip.endDate}
                {trip.collabId && <span style={{ marginLeft: 8, color: colors.tealDark, fontWeight: 600 }}>🤝 協作中</span>}
              </div>
            )}
          </div>
          <Button size="small" onClick={() => setShowMemo(true)}>
            📋 備忘錄
          </Button>
          <Button size="small" onClick={() => setModal('editTrip')}>
            ✏️ 編輯
          </Button>
        </div>

        <div style={{ display: 'flex', background: colors.white, borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', padding: 4, marginBottom: 16, overflowX: 'auto', gap: 2 }}>
          {TABS.map(([ic, lb], i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              style={{ flex: 1, padding: '8px 10px', border: 'none', borderRadius: 10, background: i === tab ? colors.coral : 'transparent', cursor: 'pointer', fontSize: 12, color: i === tab ? colors.white : colors.mist, whiteSpace: 'nowrap', fontWeight: i === tab ? 700 : 500, fontFamily: fonts.body, transition: 'all .15s', minWidth: 56 }}
            >
              {ic} {lb}
            </button>
          ))}
        </div>

        {tab === 0 && <ItineraryTab trip={trip} upTrip={fn => upTrip(trip.id, fn)} />}
        {tab === 1 && <AttractionsTab trip={trip} upTrip={fn => upTrip(trip.id, fn)} />}
        {tab === 2 && <AccomTransTab trip={trip} upTrip={fn => upTrip(trip.id, fn)} />}
        {tab === 3 && <ExpensesTab trip={trip} upTrip={fn => upTrip(trip.id, fn)} />}
        {tab === 4 && (
          <LuggageTab
            trip={trip}
            upTrip={fn => upTrip(trip.id, fn)}
            tpls={data.lugTpls}
            setTpls={tpls => setData(d => ({ ...d, lugTpls: tpls }))}
          />
        )}

        {modal === 'editTrip' && (
          <TripModal
            title="編輯旅行"
            init={trip}
            onClose={() => setModal(null)}
            onSave={f => {
              upTrip(trip.id, t => ({ ...t, ...f }));
              setModal(null);
            }}
          />
        )}
        {showMemo && (
          <Modal title="📋 旅行備忘錄" onClose={() => setShowMemo(false)} width={520}>
            <textarea
              style={{ ...Sty.inp, height: 280, resize: 'vertical' as const, lineHeight: 1.7 }}
              placeholder={'記錄整個行程的備忘事項...\n例如：緊急聯絡電話、常用翻譯、兌換匯率、重要提醒等'}
              value={trip.memo || ''}
              onChange={e => upTrip(trip.id, t => ({ ...t, memo: e.target.value }))}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <Button variant="pri" size="small" onClick={() => setShowMemo(false)}>完成</Button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
