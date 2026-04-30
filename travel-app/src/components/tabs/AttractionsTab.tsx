import { useState } from 'react';
import { Trip } from '../../types';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { Button } from '../Button';
import { uid, safeStr } from '../../utils/helpers';
import { Badge } from '../Badge';
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

interface AttractionsTabProps {
  trip: Trip;
  upTrip: (fn: (t: Trip) => Trip) => void;
}

export default function AttractionsTab({ trip, upTrip }: AttractionsTabProps) {
  const [modal, setModal] = useState<string | null>(null);
  const [editAttr, setEditAttr] = useState<any>(null);
  const [batch, setBatch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function addA(a: any) {
    upTrip(t => ({
      ...t,
      attractions: [...(t.attractions || []), { id: uid(), ...a }],
    }));
  }

  function upA(id: string, a: any) {
    upTrip(t => ({
      ...t,
      attractions: (t.attractions || []).map(x => (x.id === id ? { ...x, ...a } : x)),
    }));
  }

  function delA(id: string) {
    upTrip(t => ({
      ...t,
      attractions: (t.attractions || []).filter(x => x.id !== id),
    }));
  }

  function togA(id: string) {
    upTrip(t => ({
      ...t,
      attractions: (t.attractions || []).map(x =>
        x.id === id ? { ...x, visited: !x.visited } : x
      ),
    }));
  }

  function addBatch() {
    batch
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(name =>
        addA({
          name,
          hours: '',
          price: '',
          note: '',
          visited: false,
          queryOk: null,
          mapsUrl: '',
          website: '',
        })
      );
    setBatch('');
    setModal(null);
  }

  const sorted = (trip.attractions || [])
    .slice()
    .sort((a, b) =>
      safeStr(a.name).localeCompare(safeStr(b.name), 'zh-TW', {
        sensitivity: 'base',
      })
    );
  const allCollapsed = sorted.length > 0 && sorted.every(a => !expanded[a.id]);

  function toggleAll() {
    if (allCollapsed) {
      setExpanded(Object.fromEntries(sorted.map(a => [a.id, true])));
    } else {
      setExpanded({});
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button variant="pri" onClick={() => {
          setEditAttr(null);
          setModal('add');
        }}>
          ＋ 新增景點
        </Button>
        <Button onClick={() => setModal('batch')}>📋 批次新增</Button>
        {sorted.length > 0 && (
          <Button size="small" style={{ marginLeft: 'auto' }} onClick={toggleAll}>
            {allCollapsed ? '⊞ 展開全部' : '⊟ 收合全部'}
          </Button>
        )}
      </div>

      {sorted.length === 0 && (
        <p style={{ color: colors.mist, fontSize: 14 }}>
          尚無景點，新增後可拖曳至行程
        </p>
      )}

      {sorted.map(a => {
        const isOpen = !!expanded[a.id];
        return (
          <div
            key={a.id}
            style={{ ...Sty.card, cursor: 'grab', opacity: a.visited ? 0.65 : 1 }}
            draggable
            onDragStart={e => {
              e.dataTransfer?.setData('attrId', a.id);
            }}
          >
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={!!a.visited}
                  onChange={() => togA(a.id)}
                  style={{
                    marginTop: 3,
                    flexShrink: 0,
                    accentColor: colors.coral,
                    width: 16,
                    height: 16,
                  }}
                />
                <div
                  style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={() => setExpanded(p => ({ ...p, [a.id]: !p[a.id] }))}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: fonts.display,
                        fontSize: 15,
                        fontWeight: 500,
                        color: colors.ink,
                        textDecoration: a.visited ? 'line-through' : 'none',
                      }}
                    >
                      {safeStr(a.name)}
                    </span>
                    <span style={{ fontSize: 11, color: colors.mist, marginLeft: 'auto' }}>
                      {isOpen ? '▾' : '▸'}
                    </span>
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {a.hours && (
                          <span style={{ fontSize: 12, color: colors.slate }}>
                            🕐 {a.hours}
                          </span>
                        )}
                        {a.price && (
                          <span style={{ fontSize: 12, color: colors.slate }}>
                            💴 {a.price} {trip.localCurrency || ''}
                          </span>
                        )}
                      </div>
                      {a.note && (
                        <div style={{ fontSize: 12, color: colors.mist, marginTop: 4 }}>
                          {safeStr(a.note)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <Button
                    size="small"
                    onClick={() => {
                      setEditAttr(a);
                      setModal('edit');
                    }}
                  >
                    ✏️
                  </Button>
                  <Button variant="dan" size="small" onClick={() => delA(a.id)}>
                    ✕
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {modal === 'add' && (
        <AttrModal
          title="新增景點"
          init={{}}
          local={trip.localCurrency}
          onClose={() => setModal(null)}
          onSave={a => {
            addA(a);
            setModal(null);
          }}
        />
      )}
      {modal === 'edit' && editAttr && (
        <AttrModal
          title="編輯景點"
          init={editAttr}
          local={trip.localCurrency}
          onClose={() => setModal(null)}
          onSave={a => {
            upA(editAttr.id, a);
            setModal(null);
          }}
        />
      )}
      {modal === 'batch' && (
        <Modal title="批次新增景點" onClose={() => setModal(null)} width={400}>
          <p style={{ fontSize: 13, color: colors.mist, marginBottom: 10 }}>
            每行一個景點名稱
          </p>
          <textarea
            style={{
              ...Sty.inp,
              height: 140,
              resize: 'vertical' as const,
            }}
            value={batch}
            onChange={e => setBatch(e.target.value)}
            placeholder={'淺草寺\n上野動物園\n秋葉原'}
          />
          <ModalFooter
            onClose={() => setModal(null)}
            onSave={addBatch}
            saveLabel="新增"
          />
        </Modal>
      )}
    </div>
  );
}

function AttrModal({ title, init, local, onClose, onSave }: any) {
  const [f, setF] = useState({
    name: '',
    hours: '',
    price: '',
    note: '',
    mapsUrl: '',
    website: '',
    manualPrice: false,
    ticketReminder: null,
    ...init,
  });

  return (
    <Modal title={title} onClose={onClose} width={480}>
      <Field label="景點名稱">
        <input
          style={Sty.inp}
          value={f.name}
          onChange={e => setF({ ...f, name: e.target.value })}
        />
      </Field>
      <Field label="營業時間（24小時制）">
        <input
          style={Sty.inp}
          value={f.hours}
          onChange={e => setF({ ...f, hours: e.target.value })}
          placeholder="09:00-17:00"
        />
      </Field>
      <Field label={`成人票價（${local || ''}）`}>
        <input
          style={Sty.inp}
          value={String(f.price === null || f.price === undefined ? '' : f.price)}
          onChange={e => setF({ ...f, price: e.target.value, manualPrice: true })}
          placeholder="0"
        />
      </Field>
      <Field label="Google Maps 連結">
        <input
          style={Sty.inp}
          value={f.mapsUrl}
          onChange={e => setF({ ...f, mapsUrl: e.target.value })}
          placeholder="https://maps.google.com/..."
        />
      </Field>
      <Field label="官方網站">
        <input
          style={Sty.inp}
          value={f.website}
          onChange={e => setF({ ...f, website: e.target.value })}
          placeholder="https://..."
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
