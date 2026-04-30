import { useState } from 'react';
import { Trip } from '../types';
import { CURRENCIES } from '../constants/data';
import { colors } from '../constants/colors';
import { fonts } from '../constants/fonts';
import { Modal } from './Modal';
import { Field } from './Field';
import { ModalFooter } from './ModalFooter';

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

interface TripModalProps {
  title: string;
  init: Partial<Trip> | {};
  onClose: () => void;
  onSave: (trip: any) => void;
}

export function TripModal({ title, init, onClose, onSave }: TripModalProps) {
  const [f, setF] = useState({
    name: '',
    destination: '',
    startDate: '',
    endDate: '',
    currency: 'TWD',
    localCurrency: 'JPY',
    ...init,
  });

  return (
    <Modal title={title} onClose={onClose}>
      <Field label="旅行名稱（可留空）">
        <input
          style={Sty.inp}
          value={f.name}
          onChange={e => setF({ ...f, name: e.target.value })}
          placeholder="留空則自動命名"
        />
      </Field>
      <Field label="目的地">
        <input
          style={Sty.inp}
          value={f.destination}
          onChange={e => setF({ ...f, destination: e.target.value })}
        />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="出發日期">
          <input
            type="date"
            style={Sty.inp}
            value={f.startDate}
            onChange={e => setF({ ...f, startDate: e.target.value })}
          />
        </Field>
        <Field label="結束日期">
          <input
            type="date"
            style={Sty.inp}
            value={f.endDate}
            onChange={e => setF({ ...f, endDate: e.target.value })}
          />
        </Field>
        <Field label="主要貨幣">
          <select
            style={Sty.inp}
            value={f.currency}
            onChange={e => setF({ ...f, currency: e.target.value })}
          >
            {CURRENCIES.map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="當地貨幣">
          <select
            style={Sty.inp}
            value={f.localCurrency}
            onChange={e => setF({ ...f, localCurrency: e.target.value })}
          >
            {CURRENCIES.map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <ModalFooter onClose={onClose} onSave={() => onSave(f)} />
    </Modal>
  );
}
