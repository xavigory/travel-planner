import { useState, useEffect, useRef } from 'react';
import { AppData, Trip } from './types';
import { colors } from './constants/colors';
import { fonts } from './constants/fonts';
import { DEF_PACK, TABS } from './constants/data';
import { loadData, loadUserData, saveUserData } from './utils/storage';
import { sanitizeData, uid, getDays } from './utils/helpers';
import { collectReminders } from './utils/reminders';
import { onAuthChange, signInWithGoogle, signOut, User } from './utils/auth';
import { pushTrip, syncTrip, subscribeTrip, buildCollabUrl, getCollabIdFromUrl } from './utils/share';
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
  const [showMemo, setShowMemo] = useState(false);

  // 協作狀態：客人透過連結進入時使用（不存 localStorage）
  const [guestTrip, setGuestTrip] = useState<Trip | 'loading' | 'error' | null>(null);
  const [guestTab, setGuestTab] = useState(0);

  // 開啟協作連結的 modal 狀態
  const [collabUrl, setCollabUrl] = useState('');
  const [collabStatus, setCollabStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  // 本地行程訂閱清理函式（有 collabId 的行程）
  const localSubsRef = useRef<Record<string, () => void>>({});
  // 防止 Firestore onSnapshot 觸發自己寫入的迴圈
  const remoteUpdateRef = useRef(false);

  // 監聽 Firebase 登入狀態
  useEffect(() => {
    return onAuthChange(async user => {
      setAuthUser(user);
      if (user) {
        // 登入後：從 Firestore 載入用戶資料，若無則保留本地資料
        const cloud = await loadUserData(user.uid);
        if (cloud) {
          const sanitized = sanitizeData(cloud);
          if (sanitized) setData(sanitized);
        }
      }
    });
  }, []);

  // 資料變動時同步儲存
  useEffect(() => {
    if (!authUser || authUser === 'loading') return;
    saveUserData(authUser.uid, data);
  }, [data, authUser]);

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

  // 訂閱本地帶 collabId 的行程（接收朋友的修改）
  useEffect(() => {
    const subs = localSubsRef.current;
    // 找出有 collabId 的行程
    data.trips.forEach(t => {
      if (!t.collabId || subs[t.collabId]) return;
      subs[t.collabId] = subscribeTrip(
        t.collabId,
        remote => {
          remoteUpdateRef.current = true;
          setData(d => ({
            ...d,
            trips: d.trips.map(x =>
              x.collabId === remote.collabId ? { ...remote, id: x.id } : x
            ),
          }));
        },
        () => {},
      );
    });
    // 清理已移除行程的訂閱
    Object.keys(subs).forEach(cid => {
      if (!data.trips.find(t => t.collabId === cid)) {
        subs[cid]();
        delete subs[cid];
      }
    });
  }, [data.trips.map(t => t.collabId).join(',')]);

  // 清理所有訂閱
  useEffect(() => {
    return () => {
      Object.values(localSubsRef.current).forEach(u => u());
    };
  }, []);

  /** 更新本地行程，若有 collabId 同步到 Firestore */
  function upTrip(id: string, fn: (t: Trip) => Trip) {
    setData(d => {
      const trips = d.trips.map(t => (t.id === id ? fn(t) : t));
      const updated = trips.find(t => t.id === id);
      if (updated?.collabId && !remoteUpdateRef.current) {
        syncTrip(updated.collabId, updated);
      }
      remoteUpdateRef.current = false;
      return { ...d, trips };
    });
  }

  /** 客人模式：upTrip 直接寫 Firestore */
  function upGuestTrip(fn: (t: Trip) => Trip) {
    setGuestTrip(cur => {
      if (!cur || typeof cur !== 'object') return cur;
      const updated = fn(cur);
      if (updated.collabId) syncTrip(updated.collabId, updated);
      return updated;
    });
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

  // ── 登入頁面（未登入且非協作連結）──────────────────────────
  if (!authUser && !getCollabIdFromUrl()) {
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

  // ── 客人協作模式（?trip= URL 進入）──────────────────────────
  if (guestTrip === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: colors.page, fontFamily: fonts.body, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: colors.mist }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✈️</div>
          <div style={{ fontSize: 16 }}>正在連接協作行程…</div>
        </div>
      </div>
    );
  }

  if (guestTrip === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: colors.page, fontFamily: fonts.body, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: colors.mist }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, marginBottom: 8 }}>找不到這份協作行程</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>連結可能有誤，請再次確認</div>
          <Button onClick={() => { window.location.href = window.location.pathname; }}>回首頁</Button>
        </div>
      </div>
    );
  }

  if (guestTrip && typeof guestTrip === 'object') {
    const gt = guestTrip;
    const gtDays = getDays(gt.startDate, gt.endDate);
    const alreadySaved = data.trips.some(t => t.collabId === gt.collabId);
    return (
      <div style={{ minHeight: '100vh', background: colors.page, fontFamily: fonts.body }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 20px' }}>
          {/* 協作提示橫幅 */}
          <div style={{ background: colors.tealLight, border: `1.5px solid ${colors.teal}`, borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🤝</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.tealDark }}>協作行程 — 即時同步</div>
              <div style={{ fontSize: 12, color: colors.slate, marginTop: 2 }}>你的修改會即時同步給所有人，也可以新增到自己的行程清單</div>
            </div>
            {alreadySaved ? (
              <span style={{ fontSize: 12, color: colors.tealDark, fontWeight: 600 }}>✓ 已加入</span>
            ) : (
              <Button
                variant="teal"
                size="small"
                onClick={() => {
                  setData(d => ({
                    ...d,
                    trips: [...d.trips, { ...gt, id: uid() }],
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

          {/* Tabs */}
          <div style={{ display: 'flex', background: colors.white, borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', padding: 4, marginBottom: 16, overflowX: 'auto', gap: 2 }}>
            {TABS.map(([ic, lb], i) => (
              <button
                key={i}
                onClick={() => setGuestTab(i)}
                style={{ flex: 1, padding: '8px 10px', border: 'none', borderRadius: 10, background: i === guestTab ? colors.coral : 'transparent', cursor: 'pointer', fontSize: 12, color: i === guestTab ? colors.white : colors.mist, whiteSpace: 'nowrap', fontWeight: i === guestTab ? 700 : 500, fontFamily: fonts.body, transition: 'all .15s', minWidth: 56 }}
              >
                {ic} {lb}
              </button>
            ))}
          </div>

          {/* 可編輯的 Tab 內容 */}
          {guestTab === 0 && <ItineraryTab trip={gt} upTrip={fn => upGuestTrip(fn)} />}
          {guestTab === 1 && <AttractionsTab trip={gt} upTrip={fn => upGuestTrip(fn)} />}
          {guestTab === 2 && <AccomTransTab trip={gt} upTrip={fn => upGuestTrip(fn)} />}
          {guestTab === 3 && <ExpensesTab trip={gt} upTrip={fn => upGuestTrip(fn)} />}
          {guestTab === 4 && (
            <LuggageTab
              trip={gt}
              upTrip={fn => upGuestTrip(fn)}
              tpls={data.lugTpls}
              setTpls={tpls => setData(d => ({ ...d, lugTpls: tpls }))}
            />
          )}
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
                            if (t.collabId) {
                              // 已開啟協作，直接顯示連結
                              setCollabUrl(buildCollabUrl(t.collabId));
                              setCollabStatus('done');
                              setCopied(false);
                              setModal('collab');
                              return;
                            }
                            // 第一次開啟協作
                            setCollabStatus('loading');
                            setCollabUrl('');
                            setCopied(false);
                            setModal('collab');
                            try {
                              const cid = await pushTrip(t);
                              upTrip(t.id, x => ({ ...x, collabId: cid }));
                              setCollabUrl(buildCollabUrl(cid));
                              setCollabStatus('done');
                            } catch {
                              setCollabStatus('error');
                            }
                          }}
                        >
                          {t.collabId ? '🔗 分享連結' : '🤝 開啟協作'}
                        </Button>
                        <Button
                          size="small"
                          onClick={() => { setEditTripId(t.id); setModal('editTrip'); }}
                        >
                          ✏️ 編輯
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 協作連結 Modal */}
          {modal === 'collab' && (
            <Modal title="🤝 協作行程" onClose={() => { setModal(null); setCollabStatus('idle'); }}>
              {collabStatus === 'loading' && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: colors.mist }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
                  <div style={{ fontSize: 14 }}>正在建立協作連結…</div>
                </div>
              )}
              {collabStatus === 'done' && (
                <div>
                  <div style={{ fontSize: 13, color: colors.slate, marginBottom: 12 }}>
                    把以下連結傳給朋友，大家都可以即時編輯這份行程：
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: colors.fog, borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
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
                  <div style={{ fontSize: 12, color: colors.mist }}>
                    💡 所有人的修改都會即時同步。連結永久有效，隨時可再從行程卡片取得。
                  </div>
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
          )}

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
