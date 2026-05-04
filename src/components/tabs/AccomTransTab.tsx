import { useState } from 'react';
import { Trip } from '../../types';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { Button } from '../Button';
import { uid, safeStr, cancelLeft } from '../../utils/helpers';
import { Badge } from '../Badge';
import { Field } from '../Field';
import { Modal } from '../Modal';
import { ModalFooter } from '../ModalFooter';
import { ACC_PLAT, CURRENCIES, TRANS_TYPES } from '../../constants/data';

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

interface AccomTransTabProps {
  trip: Trip;
  upTrip: (fn: (t: Trip) => Trip) => void;
}

export default function AccomTransTab({ trip, upTrip }: AccomTransTabProps) {
  const [modal, setModal] = useState<string | null>(null);
  const [ctx, setCtx] = useState<any>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggleExpand(id: string) {
    setExpanded(e => ({ ...e, [id]: !e[id] }));
  }
  function expandAll(ids: string[]) {
    setExpanded(e => Object.fromEntries(ids.map(id => [id, !ids.every(i => e[i])])));
  }

  function autoExp(t2: Trip, type: string, id: string, amount: any, currency: string, date: string, note: string) {
    const exps = (t2.expenses || []).filter(e => e.autoFrom !== type + id);
    if (amount) {
      exps.push({
        id: uid(),
        amount,
        currency,
        category: type === 'accom' ? '住宿' : '交通',
        date: date || '',
        note,
        autoFrom: type + id,
      });
    }
    return exps;
  }

  function addAccom(f: any) {
    const id = uid();
    upTrip(t => {
      const t2 = {
        ...t,
        accommodations: [...(t.accommodations || []), { id, ...f }],
      };
      t2.expenses = autoExp(t2, 'accom', id, f.amount, f.currency || t.currency, f.checkIn, f.name);
      return t2;
    });
  }

  function upAccom(id: string, f: any) {
    upTrip(t => {
      const t2 = {
        ...t,
        accommodations: (t.accommodations || []).map(x => (x.id === id ? { ...x, ...f } : x)),
      };
      t2.expenses = autoExp(t2, 'accom', id, f.amount, f.currency || t.currency, f.checkIn, f.name);
      return t2;
    });
  }

  function delAccom(id: string) {
    upTrip(t => ({
      ...t,
      accommodations: (t.accommodations || []).filter(x => x.id !== id),
      expenses: (t.expenses || []).filter(e => e.autoFrom !== 'accom' + id),
    }));
  }

  function addTrans(f: any) {
    const id = uid();
    upTrip(t => {
      const t2 = {
        ...t,
        transports: [...(t.transports || []), { id, ...f }],
      };
      t2.expenses = autoExp(t2, 'trans', id, f.amount, f.currency || t.currency, f.date, f.type + ' ' + f.from + '→' + f.to);
      return t2;
    });
  }

  function upTrans(id: string, f: any) {
    upTrip(t => {
      const t2 = {
        ...t,
        transports: (t.transports || []).map(x => (x.id === id ? { ...x, ...f } : x)),
      };
      t2.expenses = autoExp(t2, 'trans', id, f.amount, f.currency || t.currency, f.date, f.type + ' ' + f.from + '→' + f.to);
      return t2;
    });
  }

  function delTrans(id: string) {
    upTrip(t => ({
      ...t,
      transports: (t.transports || []).filter(x => x.id !== id),
      expenses: (t.expenses || []).filter(e => e.autoFrom !== 'trans' + id),
    }));
  }

  function CancelTag({ ds }: { ds?: string }) {
    const n = cancelLeft(ds);
    if (n === null || n < 0) return null;
    const [bg, fc] =
      n <= 3
        ? [colors.dangerLight, colors.dangerDark]
        : n <= 7
        ? [colors.sunLight, colors.sunDark]
        : [colors.tealLight, colors.tealDark];
    return (
      <Badge
        fc={fc}
        bg={bg}
        text={'取消截止 ' + (n === 0 ? '今天' : n === 1 ? '明天' : n + '天後')}
      />
    );
  }

  const accoms = trip.accommodations || [];
  const trans = trip.transports || [];
  const accomAllExp = accoms.length > 0 && accoms.every(a => expanded[a.id]);
  const transAllExp = trans.length > 0 && trans.every(t => expanded[t.id]);

  return (
    <div>
      {/* ── 住宿 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 8, borderBottom: `1px solid ${colors.fog}` }}>
        <Button variant="pri" size="small" onClick={() => { setCtx({ type: 'accom' }); setModal('add'); }}>
          ＋ 新增住宿
        </Button>
        {accoms.length > 0 && (
          <Button size="small" onClick={() => expandAll(accoms.map(a => a.id))}>
            {accomAllExp ? '⊟ 收合全部' : '⊞ 展開全部'}
          </Button>
        )}
      </div>
      <div style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 500, color: colors.ink, marginBottom: 10 }}>🏨 住宿</div>
      {accoms.length === 0 && <p style={{ fontSize: 13, color: colors.mist, marginBottom: 16 }}>尚無住宿</p>}
      {accoms.map(a => (
        <div key={a.id} style={Sty.card}>
          <div
            style={{ padding: '12px 16px', cursor: 'pointer' }}
            onClick={() => toggleExpand(a.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: fonts.display, fontSize: 15, fontWeight: 500, color: colors.ink }}>
                    {safeStr(a.name)}
                  </span>
                  <span style={{ fontSize: 10, color: colors.mist, transition: 'transform .2s', display: 'inline-block', transform: expanded[a.id] ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                </div>
                <div style={{ fontSize: 12, color: colors.mist, marginTop: 2 }}>
                  {[a.platform, a.checkIn && a.checkOut ? `${a.checkIn} ～ ${a.checkOut}` : a.checkIn].filter(Boolean).join(' · ')}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {!a.amount && <Badge fc={colors.dangerDark} bg={colors.dangerLight} text="待訂" />}
                  {a.amount && a.freeCancel && (cancelLeft(a.freeCancel) ?? -1) >= 0 && (
                    <Badge fc={colors.tealDark} bg={colors.tealLight} text="✓ 可免費取消" />
                  )}
                  <CancelTag ds={a.freeCancel} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <Button size="small" onClick={() => { setCtx({ type: 'accom', item: a }); setModal('edit'); }}>✏️</Button>
                <Button variant="dan" size="small" onClick={() => delAccom(a.id)}>✕</Button>
              </div>
            </div>
          </div>
          {expanded[a.id] && (
            <div style={{ padding: '10px 16px 14px', borderTop: `1px solid ${colors.fog}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {a.checkIn && <Row label="入住" value={`${a.checkIn}${a.checkInTime ? ' ' + a.checkInTime : ''}`} />}
              {a.checkOut && <Row label="退房" value={`${a.checkOut}${a.checkOutTime ? ' ' + a.checkOutTime : ''}`} />}
              {a.amount && <Row label="金額" value={`${a.currency || ''} ${a.amount}`} />}
              {a.freeCancel && <Row label="免費取消截止" value={a.freeCancel} />}
              {a.orderId && <Row label="訂單編號" value={a.orderId} />}
              {a.note && <Row label="備註" value={a.note} span />}
            </div>
          )}
        </div>
      ))}

      {/* ── 交通 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginTop: 20, marginBottom: 8, borderBottom: `1px solid ${colors.fog}` }}>
        <Button variant="pri" size="small" onClick={() => { setCtx({ type: 'trans' }); setModal('add'); }}>
          ＋ 新增交通
        </Button>
        {trans.length > 0 && (
          <Button size="small" onClick={() => expandAll(trans.map(t => t.id))}>
            {transAllExp ? '⊟ 收合全部' : '⊞ 展開全部'}
          </Button>
        )}
      </div>
      <div style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 500, color: colors.ink, marginBottom: 10 }}>🚆 交通</div>
      {trans.length === 0 && <p style={{ fontSize: 13, color: colors.mist }}>尚無交通</p>}
      {trans.map(tr => (
        <div key={tr.id} style={Sty.card}>
          <div
            style={{ padding: '12px 16px', cursor: 'pointer' }}
            onClick={() => toggleExpand(tr.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: fonts.display, fontSize: 15, fontWeight: 500, color: colors.ink }}>
                    {safeStr(tr.type)} · {safeStr(tr.from)} → {safeStr(tr.to)}
                  </span>
                  <span style={{ fontSize: 10, color: colors.mist, transition: 'transform .2s', display: 'inline-block', transform: expanded[tr.id] ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                </div>
                <div style={{ fontSize: 12, color: colors.mist, marginTop: 2 }}>
                  {[tr.date, tr.depTime && tr.arrTime ? `${tr.depTime} → ${tr.arrTime}` : tr.depTime].filter(Boolean).join(' · ')}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {!tr.amount && <Badge fc={colors.dangerDark} bg={colors.dangerLight} text="待訂" />}
                  {tr.amount && tr.freeCancel && (cancelLeft(tr.freeCancel) ?? -1) >= 0 && (
                    <Badge fc={colors.tealDark} bg={colors.tealLight} text="✓ 可免費取消" />
                  )}
                  <CancelTag ds={tr.freeCancel} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <Button size="small" onClick={() => { setCtx({ type: 'trans', item: tr }); setModal('edit'); }}>✏️</Button>
                <Button variant="dan" size="small" onClick={() => delTrans(tr.id)}>✕</Button>
              </div>
            </div>
          </div>
          {expanded[tr.id] && (
            <div style={{ padding: '10px 16px 14px', borderTop: `1px solid ${colors.fog}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {tr.date && <Row label="日期" value={tr.date} />}
              {(tr.depTime || tr.arrTime) && <Row label="時間" value={[tr.depTime, tr.arrTime].filter(Boolean).join(' → ')} />}
              {tr.amount && <Row label="金額" value={`${tr.currency || ''} ${tr.amount}`} />}
              {tr.freeCancel && <Row label="免費取消截止" value={tr.freeCancel} />}
              {tr.orderId && <Row label="訂單編號" value={tr.orderId} />}
              {tr.note && <Row label="備註" value={tr.note} span />}
            </div>
          )}
        </div>
      ))}

      {modal === 'add' && ctx?.type === 'accom' && (
        <AccomModal
          title="新增住宿"
          init={{ platform: 'Booking.com', currency: trip.currency || 'TWD' }}
          onClose={() => setModal(null)}
          onSave={f => {
            addAccom(f);
            setModal(null);
          }}
        />
      )}
      {modal === 'edit' && ctx?.type === 'accom' && (
        <AccomModal
          title="編輯住宿"
          init={ctx.item}
          onClose={() => setModal(null)}
          onSave={f => {
            upAccom(ctx.item.id, f);
            setModal(null);
          }}
        />
      )}
      {modal === 'add' && ctx?.type === 'trans' && (
        <TransModal
          title="新增交通"
          init={{ type: '機票', currency: trip.currency || 'TWD' }}
          onClose={() => setModal(null)}
          onSave={f => {
            addTrans(f);
            setModal(null);
          }}
        />
      )}
      {modal === 'edit' && ctx?.type === 'trans' && (
        <TransModal
          title="編輯交通"
          init={ctx.item}
          onClose={() => setModal(null)}
          onSave={f => {
            upTrans(ctx.item.id, f);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function Row({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div style={span ? { gridColumn: '1 / -1' } : undefined}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: colors.mist, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: colors.ink }}>{value}</div>
    </div>
  );
}

function AccomModal({ title, init, onClose, onSave }: any) {
  const [f, setF] = useState({
    name: '',
    platform: 'Booking.com',
    checkIn: '',
    checkInTime: '14:00',
    checkOut: '',
    checkOutTime: '11:00',
    freeCancel: '',
    amount: '',
    currency: 'TWD',
    orderId: '',
    note: '',
    ...init,
  });

  return (
    <Modal title={title} onClose={onClose}>
      <Field label="名稱">
        <input style={Sty.inp} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      </Field>
      <Field label="訂房平台">
        <select style={Sty.inp} value={f.platform} onChange={e => setF({ ...f, platform: e.target.value })}>
          {ACC_PLAT.map(p => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="入住日期">
          <input type="date" style={Sty.inp} value={f.checkIn} onChange={e => setF({ ...f, checkIn: e.target.value })} />
        </Field>
        <Field label="Check-in 時間">
          <input type="time" style={Sty.inp} value={f.checkInTime} onChange={e => setF({ ...f, checkInTime: e.target.value })} />
        </Field>
        <Field label="退房日期">
          <input type="date" style={Sty.inp} value={f.checkOut} onChange={e => setF({ ...f, checkOut: e.target.value })} />
        </Field>
        <Field label="Check-out 時間">
          <input type="time" style={Sty.inp} value={f.checkOutTime} onChange={e => setF({ ...f, checkOutTime: e.target.value })} />
        </Field>
      </div>
      <Field label="免費取消截止日">
        <input type="date" style={Sty.inp} value={f.freeCancel} onChange={e => setF({ ...f, freeCancel: e.target.value })} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
        <Field label="金額（留空=待訂）">
          <input style={Sty.inp} value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
        </Field>
        <Field label="幣別">
          <select style={Sty.inp} value={f.currency} onChange={e => setF({ ...f, currency: e.target.value })}>
            {CURRENCIES.map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="訂單編號">
        <input style={Sty.inp} value={f.orderId} onChange={e => setF({ ...f, orderId: e.target.value })} />
      </Field>
      <Field label="備註">
        <input style={Sty.inp} value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
      </Field>
      <ModalFooter onClose={onClose} onSave={() => onSave(f)} />
    </Modal>
  );
}

function TransModal({ title, init, onClose, onSave }: any) {
  const [f, setF] = useState({
    type: '機票',
    from: '',
    to: '',
    date: '',
    depTime: '',
    arrTime: '',
    freeCancel: '',
    amount: '',
    currency: 'TWD',
    orderId: '',
    note: '',
    ...init,
  });

  return (
    <Modal title={title} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <Field label="類型">
          <select style={Sty.inp} value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>
            {TRANS_TYPES.map(t => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="出發地">
          <input style={Sty.inp} value={f.from} onChange={e => setF({ ...f, from: e.target.value })} />
        </Field>
        <Field label="目的地">
          <input style={Sty.inp} value={f.to} onChange={e => setF({ ...f, to: e.target.value })} />
        </Field>
        <Field label="日期">
          <input type="date" style={Sty.inp} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label="出發時間">
          <input type="time" style={Sty.inp} value={f.depTime} onChange={e => setF({ ...f, depTime: e.target.value })} />
        </Field>
        <Field label="抵達時間">
          <input type="time" style={Sty.inp} value={f.arrTime} onChange={e => setF({ ...f, arrTime: e.target.value })} />
        </Field>
      </div>
      <Field label="免費取消截止日">
        <input type="date" style={Sty.inp} value={f.freeCancel} onChange={e => setF({ ...f, freeCancel: e.target.value })} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
        <Field label="金額（留空=待訂）">
          <input style={Sty.inp} value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
        </Field>
        <Field label="幣別">
          <select style={Sty.inp} value={f.currency} onChange={e => setF({ ...f, currency: e.target.value })}>
            {CURRENCIES.map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="訂單編號">
        <input style={Sty.inp} value={f.orderId} onChange={e => setF({ ...f, orderId: e.target.value })} />
      </Field>
      <Field label="備註">
        <input style={Sty.inp} value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
      </Field>
      <ModalFooter onClose={onClose} onSave={() => onSave(f)} />
    </Modal>
  );
}
