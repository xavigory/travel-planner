import { useState, useRef } from 'react';
import { Trip } from '../../types';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { Button } from '../Button';
import { uid, safeStr, today } from '../../utils/helpers';
import { Badge } from '../Badge';
import { Field } from '../Field';
import { Modal } from '../Modal';
import { ModalFooter } from '../ModalFooter';
import { CURRENCIES, EXP_CATS } from '../../constants/data';

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

interface ExpensesTabProps {
  trip: Trip;
  upTrip: (fn: (t: Trip) => Trip) => void;
}

export default function ExpensesTab({ trip, upTrip }: ExpensesTabProps) {
  const [modal, setModal] = useState<string | null>(null);
  const [editExp, setEditExp] = useState<any>(null);
  const [view, setView] = useState('list');

  function addE(e: any) {
    upTrip(t => ({
      ...t,
      expenses: [...(t.expenses || []), { id: uid(), ...e }],
    }));
  }

  function upE(id: string, e: any) {
    upTrip(t => ({
      ...t,
      expenses: (t.expenses || []).map(x => (x.id === id ? { ...x, ...e } : x)),
    }));
  }

  function delE(id: string) {
    upTrip(t => ({
      ...t,
      expenses: (t.expenses || []).filter(x => x.id !== id),
    }));
  }

  const exps = trip.expenses || [];
  const curs = [...new Set(exps.map(e => e.currency))];

  function getTot(cur: string, cat?: string): number {
    return exps
      .filter(e => e.currency === cur && (!cat || e.category === cat))
      .reduce((s, e) => s + (parseFloat(String(e.amount)) || 0), 0);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="pri" onClick={() => {
          setEditExp(null);
          setModal('add');
        }}>
          ＋ 新增支出
        </Button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: colors.fog, borderRadius: 10, padding: 4 }}>
          <button
            style={{
              padding: '5px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              background: view === 'list' ? colors.white : 'transparent',
              color: view === 'list' ? colors.coral : colors.mist,
              fontFamily: fonts.body,
            }}
            onClick={() => setView('list')}
          >
            清單
          </button>
          <button
            style={{
              padding: '5px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              background: view === 'table' ? colors.white : 'transparent',
              color: view === 'table' ? colors.coral : colors.mist,
              fontFamily: fonts.body,
            }}
            onClick={() => setView('table')}
          >
            統計表
          </button>
        </div>
      </div>

      {view === 'table' && (
        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
          <table
            style={{
              borderCollapse: 'collapse',
              width: '100%',
              minWidth: 400,
              background: colors.white,
              borderRadius: 14,
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', background: colors.fog }}>
                  幣別
                </th>
                {EXP_CATS.map(c => (
                  <th key={c} style={{ padding: '8px 12px', background: colors.fog, textAlign: 'right' }}>
                    {c}
                  </th>
                ))}
                <th style={{ padding: '8px 12px', background: colors.violetLight, textAlign: 'right' }}>
                  總和
                </th>
              </tr>
            </thead>
            <tbody>
              {curs.length === 0 ? (
                <tr>
                  <td colSpan={EXP_CATS.length + 2} style={{ textAlign: 'center', color: colors.mist, padding: '8px 12px' }}>
                    尚無支出
                  </td>
                </tr>
              ) : (
                curs.map(cur => (
                  <tr key={cur}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: colors.ink, textAlign: 'left' }}>
                      {cur}
                    </td>
                    {EXP_CATS.map(cat => {
                      const v = getTot(cur, cat);
                      return (
                        <td key={cat} style={{ padding: '8px 12px', textAlign: 'right', color: v > 0 ? colors.ink : colors.cloud }}>
                          {v > 0 ? v.toLocaleString() : '—'}
                        </td>
                      );
                    })}
                    <td style={{ padding: '8px 12px', background: colors.violetLight, fontWeight: 700, color: colors.violetDark, textAlign: 'right' }}>
                      {getTot(cur).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {exps.length === 0 ? (
            <p style={{ color: colors.mist, fontSize: 14 }}>尚無支出</p>
          ) : (
            exps.slice().reverse().map(e => (
              <div key={e.id} style={Sty.card}>
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: fonts.display, fontSize: 16, fontWeight: 500, color: colors.ink }}>
                        {Number(e.amount).toLocaleString()} {e.currency}
                      </span>
                      <Badge fc={colors.slate} bg={colors.fog} text={String(e.category)} />
                      {e.autoFrom && <Badge fc={colors.mist} bg={colors.fog} text="自動" />}
                    </div>
                    <div style={{ fontSize: 12, color: colors.mist, marginTop: 4 }}>
                      {e.date}
                      {e.note ? ' · ' + safeStr(e.note) : ''}
                    </div>
                  </div>
                  {!e.autoFrom && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button
                        size="small"
                        onClick={() => {
                          setEditExp(e);
                          setModal('edit');
                        }}
                      >
                        ✏️
                      </Button>
                      <Button variant="dan" size="small" onClick={() => delE(e.id)}>
                        ✕
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {modal === 'add' && (
        <ExpModal
          title="新增支出"
          init={{ currency: trip.currency || 'TWD' }}
          onClose={() => setModal(null)}
          onSave={e => {
            addE(e);
            setModal(null);
          }}
        />
      )}
      {modal === 'edit' && editExp && (
        <ExpModal
          title="編輯支出"
          init={editExp}
          onClose={() => setModal(null)}
          onSave={e => {
            upE(editExp.id, e);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function ExpModal({ title, init, onClose, onSave }: any) {
  const [f, setF] = useState({
    amount: '',
    currency: 'TWD',
    category: '餐飲',
    date: today(),
    note: '',
    imageData: null,
    files: [],
    ...init,
  });

  return (
    <Modal title={title} onClose={onClose} width={420}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
        <Field label="金額">
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
      <Field label="分類">
        <select style={Sty.inp} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>
          {EXP_CATS.map(c => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="日期">
        <input type="date" style={Sty.inp} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
      </Field>
      <Field label="備註">
        <input style={Sty.inp} value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
      </Field>
      <ModalFooter onClose={onClose} onSave={() => onSave(f)} />
    </Modal>
  );
}
