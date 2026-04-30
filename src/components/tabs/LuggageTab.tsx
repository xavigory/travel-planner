import { useState } from 'react';
import { Trip } from '../../types';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { Button } from '../Button';
import { uid } from '../../utils/helpers';
import { Field } from '../Field';
import { Modal } from '../Modal';

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
};

interface LuggageTabProps {
  trip: Trip;
  upTrip: (fn: (t: Trip) => Trip) => void;
  tpls: string[];
  setTpls: (tpls: string[]) => void;
}

export default function LuggageTab({ trip, upTrip, tpls, setTpls }: LuggageTabProps) {
  const [newItem, setNewItem] = useState('');
  const [newTpl, setNewTpl] = useState('');
  const [modal, setModal] = useState<string | null>(null);

  const items = trip.luggage || [];
  const checked = items.filter(i => i.checked).length;
  const pct = items.length ? Math.round((checked / items.length) * 100) : 0;

  function tog(id: string) {
    upTrip(t => ({
      ...t,
      luggage: (t.luggage || []).map(i => (i.id === id ? { ...i, checked: !i.checked } : i)),
    }));
  }

  function addItem() {
    if (!newItem.trim()) return;
    upTrip(t => ({
      ...t,
      luggage: [...(t.luggage || []), { id: uid(), name: newItem.trim(), checked: false }],
    }));
    setNewItem('');
  }

  function delItem(id: string) {
    upTrip(t => ({
      ...t,
      luggage: (t.luggage || []).filter(i => i.id !== id),
    }));
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
          <span style={{ color: colors.slate, fontWeight: 600 }}>打包進度</span>
          <span style={{ fontWeight: 700, color: pct === 100 ? colors.tealDark : colors.coral }}>
            {checked} / {items.length} ({pct}%)
          </span>
        </div>
        <div style={{ background: colors.cloud, borderRadius: 6, height: 8, overflow: 'hidden' }}>
          <div
            style={{
              background: `linear-gradient(90deg,${colors.coral},${colors.violet})`,
              height: 8,
              width: pct + '%',
              borderRadius: 6,
              transition: 'width .4s',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          style={{ ...Sty.inp, flex: 1 }}
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          placeholder="新增行李項目"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button variant="pri" onClick={addItem}>
          新增
        </Button>
        <Button onClick={() => setModal('tpl')}>📋 模板</Button>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          minHeight: 40,
          padding: 6,
          borderRadius: 12,
          border: `1.5px dashed ${colors.cloud}`,
          transition: 'border .2s',
        }}
        onDragOver={e => {
          e.preventDefault();
        }}
        onDrop={e => {
          e.preventDefault();
          const name = e.dataTransfer?.getData('tplName');
          if (name && !items.find(i => i.name === name)) {
            upTrip(t => ({
              ...t,
              luggage: [...(t.luggage || []), { id: uid(), name, checked: false }],
            }));
          }
        }}
      >
        {items.length === 0 && (
          <p style={{ color: colors.mist, fontSize: 13, textAlign: 'center', margin: 10 }}>
            從模板拖曳或手動新增
          </p>
        )}
        {items.map(item => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              border: `1.5px solid ${colors.cloud}`,
              borderRadius: 10,
              background: colors.white,
            }}
          >
            <span style={{ color: colors.cloud, fontSize: 14, userSelect: 'none' }}>⠿</span>
            <input
              type="checkbox"
              checked={!!item.checked}
              onChange={() => tog(item.id)}
              style={{ accentColor: colors.coral, width: 16, height: 16 }}
            />
            <span
              style={{
                flex: 1,
                fontSize: 14,
                textDecoration: item.checked ? 'line-through' : 'none',
                color: item.checked ? colors.cloud : colors.ink,
              }}
            >
              {item.name}
            </span>
            <Button variant="dan" size="small" onClick={() => delItem(item.id)}>
              ✕
            </Button>
          </div>
        ))}
      </div>

      {modal === 'tpl' && (
        <Modal title="行李模板管理" onClose={() => setModal(null)}>
          <p style={{ fontSize: 12, color: colors.mist, margin: '0 0 12px' }}>
            可拖曳排序，也可直接拖曳到行李清單新增
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              style={{ ...Sty.inp, flex: 1 }}
              value={newTpl}
              onChange={e => setNewTpl(e.target.value)}
              placeholder="新增模板項目"
              onKeyDown={e => {
                if (e.key === 'Enter' && newTpl.trim()) {
                  e.preventDefault();
                  setTpls([...tpls, newTpl.trim()]);
                  setNewTpl('');
                }
              }}
            />
            <Button
              variant="pri"
              size="small"
              onClick={() => {
                if (newTpl.trim()) {
                  setTpls([...tpls, newTpl.trim()]);
                  setNewTpl('');
                }
              }}
            >
              新增
            </Button>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tpls.map((name, i) => (
              <div
                key={i}
                draggable
                onDragStart={e => {
                  e.dataTransfer?.setData('tplName', name);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  border: `1.5px solid ${colors.cloud}`,
                  borderRadius: 10,
                  background: colors.white,
                  cursor: 'grab',
                }}
              >
                <span style={{ color: colors.cloud, fontSize: 14 }}>⠿</span>
                <span style={{ flex: 1, fontSize: 13, color: colors.ink }}>{name}</span>
                <Button
                  variant="dan"
                  size="small"
                  onClick={() => setTpls(tpls.filter((_, j) => j !== i))}
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <Button size="small" onClick={() => setModal(null)}>
              關閉
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
