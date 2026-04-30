import { useState, useEffect } from 'react';
import { AppData, Trip } from './types';
import { colors } from './constants/colors';
import { fonts } from './constants/fonts';
import { DEF_PACK, TABS } from './constants/data';
import { loadData, saveData } from './utils/storage';
import { sanitizeData, uid, getDays } from './utils/helpers';
import { collectReminders } from './utils/reminders';
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
  const [data, setData] = useState<AppData>(() => {
    const loaded = sanitizeData(loadData());
    return loaded || { trips: [], lugTpls: [...DEF_PACK] };
  });
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [modal, setModal] = useState<string | null>(null);
  const [editTripId, setEditTripId] = useState<string | null>(null);
  const [showMemo, setShowMemo] = useState(false);

  useEffect(() => {
    saveData(data);
  }, [data]);

  function upTrip(id: string, fn: (t: Trip) => Trip) {
    setData(d => ({
      ...d,
      trips: d.trips.map(t => (t.id === id ? fn(t) : t)),
    }));
  }

  const trip = sel ? data.trips.find(t => t.id === sel) || null : null;
  const editTrip = editTripId ? data.trips.find(t => t.id === editTripId) || null : null;
  const reminders = collectReminders(data.trips);

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
              <div
                style={{
                  fontSize: 12,
                  color: colors.mist,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}
              >
                我的旅行
              </div>
            </div>
            <Button variant="pri" onClick={() => setModal('new')}>
              ＋ 新增旅行
            </Button>
          </div>

          {reminders.length > 0 && (
            <div style={{ ...Sty.card, marginBottom: 20 }}>
              <div style={{ padding: '14px 18px' }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: colors.coral,
                    marginBottom: 12,
                  }}
                >
                  ⏰ 即將到來的提醒
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {reminders.map((r, i) => {
                    const isT = r.type === 'ticket';
                    const bg = isT
                      ? colors.violetLight
                      : r.diff <= 3
                      ? colors.dangerLight
                      : r.diff <= 7
                      ? colors.sunLight
                      : colors.tealLight;
                    const fc = isT
                      ? colors.violetDark
                      : r.diff <= 3
                      ? colors.dangerDark
                      : r.diff <= 7
                      ? colors.sunDark
                      : colors.tealDark;
                    const dl =
                      r.diff === 0 ? '今天' : r.diff === 1 ? '明天' : r.diff + '天後';
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          background: bg,
                          borderRadius: 10,
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          setSel(r.tripId);
                          setTab(isT ? 1 : 2);
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{isT ? '🎫' : '🔔'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: fc }}>
                            {r.label}
                          </div>
                          <div style={{ fontSize: 11, color: fc, opacity: 0.8 }}>
                            {r.tripName} · {r.date}
                            {r.time ? ' ' + r.time : ''}
                            {r.tz ? ' (' + r.tz + ')' : ''}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: fc,
                            background: colors.white,
                            borderRadius: 999,
                            padding: '3px 10px',
                            whiteSpace: 'nowrap' as const,
                          }}
                        >
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
            <div
              style={{
                textAlign: 'center',
                padding: '48px 32px',
                background: colors.white,
                borderRadius: 20,
                border: `2px dashed ${colors.cloud}`,
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 14, opacity: 0.5 }}>✈️</div>
              <div style={{ fontFamily: fonts.display, fontSize: 20, fontWeight: 500, color: colors.ink, marginBottom: 8 }}>
                尚未規劃任何行程
              </div>
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
                  onClick={() => {
                    setSel(t.id);
                    setTab(0);
                  }}
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
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          {t.currency && <Badge fc={colors.violetDark} bg={colors.violetLight} text={t.currency} />}
                          {t.localCurrency && <Badge fc={colors.tealDark} bg={colors.tealLight} text={t.localCurrency} />}
                        </div>
                      </div>
                      <Button
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          setEditTripId(t.id);
                          setModal('editTrip');
                        }}
                      >
                        ✏️ 編輯
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

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
              onClose={() => {
                setModal(null);
                setEditTripId(null);
              }}
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

        <div
          style={{
            display: 'flex',
            background: colors.white,
            borderRadius: 14,
            border: '1px solid rgba(0,0,0,0.07)',
            padding: 4,
            marginBottom: 16,
            overflowX: 'auto',
            gap: 2,
          }}
        >
          {TABS.map(([ic, lb], i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              style={{
                flex: 1,
                padding: '8px 10px',
                border: 'none',
                borderRadius: 10,
                background: i === tab ? colors.coral : 'transparent',
                cursor: 'pointer',
                fontSize: 12,
                color: i === tab ? colors.white : colors.mist,
                whiteSpace: 'nowrap',
                fontWeight: i === tab ? 700 : 500,
                fontFamily: fonts.body,
                transition: 'all .15s',
                minWidth: 56,
              }}
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
              style={{
                ...Sty.inp,
                height: 280,
                resize: 'vertical' as const,
                lineHeight: 1.7,
              }}
              placeholder={
                '記錄整個行程的備忘事項...\n例如：緊急聯絡電話、常用翻譯、兌換匯率、重要提醒等'
              }
              value={trip.memo || ''}
              onChange={e => upTrip(trip.id, t => ({ ...t, memo: e.target.value }))}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <Button variant="pri" size="small" onClick={() => setShowMemo(false)}>
                完成
              </Button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
