import { useState, useRef } from 'react';
import { Trip, ItineraryItem } from '../../types';
import { getDays, safeStr, uid } from '../../utils/helpers';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Field } from '../Field';
import { Modal } from '../Modal';
import { ModalFooter } from '../ModalFooter';

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

interface ItineraryTabProps {
  trip: Trip;
  upTrip: (fn: (t: Trip) => Trip) => void;
}

export default function ItineraryTab({ trip, upTrip }: ItineraryTabProps) {
  const [col, setCol] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<string | null>(null);
  const [ctx, setCtx] = useState<any>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const dragRef = useRef<any>(null);

  const days = getDays(trip.startDate, trip.endDate);
  const attrs = trip.attractions || [];
  const placedIds = new Set(
    Object.values(trip.itinerary || {})
      .flat()
      .map(i => i.attrId)
      .filter(Boolean)
  );
  const unplaced = attrs.filter(a => !placedIds.has(a.id));
  const allCollapsed = days.length > 0 && days.every(d => col[d] === true);

  function toggleAllDays() {
    if (allCollapsed) {
      setCol({});
    } else {
      setCol(Object.fromEntries(days.map(d => [d, true])));
    }
  }

  function autoItems(ds: string) {
    const items: any[] = [];
    (trip.accommodations || []).forEach(a => {
      if (a.checkIn === ds) {
        items.push({
          id: 'ai' + a.id,
          time: a.checkInTime || '14:00',
          name: '🏨 入住：' + safeStr(a.name),
          auto: true,
        });
      }
      if (a.checkOut === ds) {
        items.push({
          id: 'ao' + a.id,
          time: a.checkOutTime || '11:00',
          name: '🏨 退房：' + safeStr(a.name),
          auto: true,
        });
      }
    });
    (trip.transports || []).forEach(tr => {
      if (tr.date === ds) {
        const ic =
          tr.type === '機票'
            ? '✈️'
            : tr.type === '火車'
            ? '🚆'
            : tr.type === '巴士'
            ? '🚌'
            : tr.type === '渡輪'
            ? '🚢'
            : '🚗';
        items.push({
          id: 'tr' + tr.id,
          time: tr.depTime || '',
          name: ic + ' ' + safeStr(tr.from) + '→' + safeStr(tr.to),
          auto: true,
        });
      }
    });
    return items;
  }

  function uItems(ds: string): ItineraryItem[] {
    return (trip.itinerary || {})[ds] || [];
  }

  function addItem(ds: string, item: Partial<ItineraryItem>) {
    upTrip(t => ({
      ...t,
      itinerary: {
        ...t.itinerary,
        [ds]: [...(t.itinerary[ds] || []), { id: uid(), ...item } as ItineraryItem],
      },
    }));
  }

  function editItemData(ds: string, id: string, item: Partial<ItineraryItem>) {
    upTrip(t => ({
      ...t,
      itinerary: {
        ...t.itinerary,
        [ds]: (t.itinerary[ds] || []).map(x => (x.id === id ? { ...x, ...item } : x)),
      },
    }));
  }

  function delItem(ds: string, id: string) {
    upTrip(t => ({
      ...t,
      itinerary: {
        ...t.itinerary,
        [ds]: (t.itinerary[ds] || []).filter(x => x.id !== id),
      },
    }));
  }

  return (
    <div>
      {unplaced.length > 0 && (
        <div
          style={{
            ...Sty.card,
            marginBottom: 14,
            border: `1.5px solid ${colors.violetMid}`,
          }}
        >
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: colors.cloud, cursor: 'grab' }}>⠿</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: colors.coral,
                }}
              >
                📍 拖曳景點加入行程
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {unplaced.map(a => (
                <div
                  key={a.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer?.setData('attrId', a.id);
                  }}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 999,
                    border: `1.5px solid ${colors.violetMid}`,
                    background: colors.violetLight,
                    cursor: 'grab',
                    fontSize: 12,
                    fontWeight: 600,
                    userSelect: 'none',
                    color: colors.violetDark,
                  }}
                >
                  📍 {safeStr(a.name)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {days.length === 0 && (
        <p style={{ color: colors.mist, fontSize: 14 }}>請先設定旅行日期</p>
      )}

      {days.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <Button size="small" onClick={toggleAllDays}>
            {allCollapsed ? '⊞ 展開全部' : '⊟ 收合全部'}
          </Button>
        </div>
      )}

      {days.map((ds, i) => {
        const open = col[ds] !== true;
        const autoItms = autoItems(ds);
        const uitms = uItems(ds);
        const total = autoItms.length + uitms.length;
        const isOver = dragOverDay === ds;
        return (
          <div key={ds}>
            {unplaced.length > 0 && i === 0 && (
              <div
                style={{
                  height: 8,
                  background: dragOverDay === `drop-${i}` ? colors.coral : 'transparent',
                  borderRadius: 4,
                  marginBottom: 8,
                  transition: 'all .15s',
                }}
              />
            )}
            <div
              style={{
                ...Sty.card,
                border:
                  isOver ? `1.5px solid ${colors.coral}` : '1px solid rgba(0,0,0,0.07)',
                background: isOver ? '#fff8f6' : colors.white,
              }}
              onDragOver={e => {
                e.preventDefault();
                setDragOverDay(ds);
              }}
              onDragLeave={() => setDragOverDay(null)}
              onDrop={e => {
                e.preventDefault();
                const attrId = e.dataTransfer?.getData('attrId');
                if (attrId) {
                  const attr = attrs.find(a => a.id === attrId);
                  if (attr) {
                    addItem(ds, {
                      time: '',
                      name: safeStr(attr.name),
                      note: '',
                      attrId: attr.id,
                    });
                  }
                }
                setDragOverDay(null);
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  userSelect: 'none' as const,
                  borderBottom: open ? `1px solid ${colors.fog}` : 'none',
                }}
                onClick={() => setCol(c => ({ ...c, [ds]: open }))}
              >
                <span
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 15,
                    fontWeight: 500,
                    color: colors.ink,
                    flex: 1,
                  }}
                >
                  Day {i + 1}{' '}
                  <span style={{ fontSize: 13, color: colors.mist, fontFamily: fonts.body }}>
                    · {ds}
                  </span>
                </span>
                <span style={{ fontSize: 12, color: colors.mist, marginRight: 8 }}>
                  {total} 項
                </span>
                <span style={{ fontSize: 12, color: colors.mist }}>{open ? '▾' : '▸'}</span>
              </div>
              {open && (
                <div style={{ padding: '10px 14px' }}>
                  {autoItms.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        padding: '6px 0',
                        borderBottom: `1px solid ${colors.fog}`,
                      }}
                    >
                      <span style={{ fontSize: 12, color: colors.mist, minWidth: 42, paddingTop: 2 }}>
                        {item.time || '--:--'}
                      </span>
                      <span style={{ fontSize: 13, color: colors.ink, flex: 1 }}>
                        {item.name}
                      </span>
                    </div>
                  ))}
                  {uitms.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        padding: '7px 6px',
                        marginBottom: 4,
                        border: `1.5px solid ${colors.cloud}`,
                        borderRadius: 8,
                        background: colors.white,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          color: colors.cloud,
                          flexShrink: 0,
                          paddingTop: 1,
                        }}
                      >
                        ⠿
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: colors.mist,
                          minWidth: 42,
                          paddingTop: 2,
                        }}
                      >
                        {item.time || '--:--'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 13, color: colors.ink }}>
                          {item.attrId ? '📍 ' : ''}
                          {safeStr(item.name)}
                        </span>
                        {item.note && (
                          <div style={{ fontSize: 12, color: colors.mist }}>
                            {safeStr(item.note)}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button
                          size="small"
                          onClick={() => {
                            setCtx({ ds, item });
                            setModal('edit');
                          }}
                        >
                          ✏️
                        </Button>
                        <Button
                          variant="dan"
                          size="small"
                          onClick={() => delItem(ds, item.id)}
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  ))}
                  {isOver && (
                    <div
                      style={{
                        textAlign: 'center',
                        fontSize: 12,
                        color: colors.coral,
                        padding: '8px 0',
                        fontWeight: 600,
                      }}
                    >
                      放開以加入此天 ✈️
                    </div>
                  )}
                  <Button
                    size="small"
                    onClick={() => {
                      setCtx({ ds });
                      setModal('add');
                    }}
                    style={{ marginTop: 10, fontSize: 12 }}
                  >
                    ＋ 新增項目
                  </Button>
                </div>
              )}
            </div>
            {unplaced.length > 0 && i < days.length - 1 && (
              <div
                style={{
                  height: 8,
                  background: dragOverDay === `drop-${i + 1}` ? colors.coral : 'transparent',
                  borderRadius: 4,
                  marginBottom: 8,
                  marginTop: 8,
                  transition: 'all .15s',
                  cursor: 'pointer',
                }}
                onDragOver={e => {
                  e.preventDefault();
                  setDragOverDay(`drop-${i + 1}`);
                }}
                onDragLeave={() => setDragOverDay(null)}
                onDrop={e => {
                  e.preventDefault();
                  const nextDay = days[i + 1];
                  const attrId = e.dataTransfer?.getData('attrId');
                  if (attrId && nextDay) {
                    const attr = attrs.find(a => a.id === attrId);
                    if (attr) {
                      addItem(nextDay, {
                        time: '',
                        name: safeStr(attr.name),
                        note: '',
                        attrId: attr.id,
                      });
                    }
                  }
                  setDragOverDay(null);
                }}
              />
            )}
          </div>
        );
      })}

      {modal === 'add' && ctx && (
        <ItinItemModal
          title="新增行程"
          init={{}}
          onClose={() => setModal(null)}
          onSave={item => {
            addItem(ctx.ds, item);
            setModal(null);
          }}
        />
      )}
      {modal === 'edit' && ctx && (
        <ItinItemModal
          title="編輯行程"
          init={ctx.item}
          onClose={() => setModal(null)}
          onSave={item => {
            editItemData(ctx.ds, ctx.item.id, item);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function ItinItemModal({ title, init, onClose, onSave }: any) {
  const [f, setF] = useState({ time: '', name: '', note: '', ...init });
  return (
    <Modal title={title} onClose={onClose} width={400}>
      <Field label="時間（24小時制）">
        <input
          type="time"
          style={Sty.inp}
          value={f.time}
          onChange={e => setF({ ...f, time: e.target.value })}
        />
      </Field>
      <Field label="名稱">
        <input
          style={Sty.inp}
          value={f.name}
          onChange={e => setF({ ...f, name: e.target.value })}
        />
      </Field>
      <Field label="備註">
        <input
          style={Sty.inp}
          value={f.note}
          onChange={e => setF({ ...f, note: e.target.value })}
        />
      </Field>
      <ModalFooter onClose={onClose} onSave={() => onSave(f)} />
    </Modal>
  );
}
