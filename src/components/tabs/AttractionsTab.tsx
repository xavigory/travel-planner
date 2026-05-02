import { useState } from 'react';
import { Trip } from '../../types';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { Button } from '../Button';
import { uid, safeStr } from '../../utils/helpers';
import { Field } from '../Field';
import { Modal } from '../Modal';
import { ModalFooter } from '../ModalFooter';
import { queryAttraction, queryAttractions } from '../../utils/aiQuery';

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
  const [batchQueryAfter, setBatchQueryAfter] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // 正在查詢中的景點 ID
  const [querying, setQuerying] = useState<Set<string>>(new Set());
  // 全部查詢進行中
  const [batchQuerying, setBatchQuerying] = useState(false);

  const hasApiKey = !!import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

  function addA(a: any) {
    upTrip(t => ({
      ...t,
      attractions: [...(t.attractions || []), { id: uid(), ...a }],
    }));
  }

  function upA(id: string, a: any) {
    // 過濾 undefined：避免 undefined 欄位覆蓋現有值，也避免 Firestore 拒絕寫入
    const update = Object.fromEntries(
      Object.entries(a as object).filter(([, v]) => v !== undefined)
    );
    upTrip(t => ({
      ...t,
      attractions: (t.attractions || []).map(x => (x.id === id ? { ...x, ...update } : x)),
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

  /** 查詢單個景點 */
  async function queryOne(id: string, name: string) {
    setQuerying(prev => new Set(prev).add(id));
    const result = await queryAttraction(name, trip.destination, trip.localCurrency);
    if (result) {
      upA(id, {
        hours: result.hours || undefined,
        price: result.price !== '' ? result.price : undefined,
        website: result.website || undefined,
        mapsUrl: result.mapsUrl || undefined,
        note: result.note || undefined,
        queryOk: true,
      });
    } else {
      upA(id, { queryOk: false });
    }
    setQuerying(prev => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  }

  /** 查詢所有尚未查過的景點 */
  async function queryAll() {
    const targets = (trip.attractions || []).filter(
      a => a.queryOk === null || a.queryOk === undefined
    );
    if (targets.length === 0) return;
    setBatchQuerying(true);
    setQuerying(new Set(targets.map(a => a.id)));
    await queryAttractions(
      targets,
      trip.destination,
      trip.localCurrency,
      (id, result) => {
        if (result) {
          upA(id, {
            hours: result.hours || undefined,
            price: result.price !== '' ? result.price : undefined,
            website: result.website || undefined,
            mapsUrl: result.mapsUrl || undefined,
            note: result.note || undefined,
            queryOk: true,
          });
        } else {
          upA(id, { queryOk: false });
        }
        setQuerying(prev => {
          const s = new Set(prev);
          s.delete(id);
          return s;
        });
      },
    );
    setBatchQuerying(false);
  }

  function addBatch() {
    const names = batch
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    const newAttrs: any[] = names.map(name => ({
      id: uid(),
      name,
      hours: '',
      price: '',
      note: '',
      visited: false,
      queryOk: null,
      mapsUrl: '',
      website: '',
    }));
    upTrip(t => ({
      ...t,
      attractions: [...(t.attractions || []), ...newAttrs],
    }));
    setBatch('');
    setModal(null);
    if (batchQueryAfter && hasApiKey) {
      // 批次新增後立即查詢
      setTimeout(async () => {
        setBatchQuerying(true);
        setQuerying(new Set(newAttrs.map(a => a.id)));
        await queryAttractions(
          newAttrs,
          trip.destination,
          trip.localCurrency,
          (id, result) => {
            if (result) {
              upA(id, {
                hours: result.hours || undefined,
                price: result.price !== '' ? result.price : undefined,
                website: result.website || undefined,
                note: result.note || undefined,
                queryOk: true,
              });
            } else {
              upA(id, { queryOk: false });
            }
            setQuerying(prev => {
              const s = new Set(prev);
              s.delete(id);
              return s;
            });
          },
        );
        setBatchQuerying(false);
      }, 300);
    }
  }

  const sorted = (trip.attractions || [])
    .slice()
    .sort((a, b) =>
      safeStr(a.name).localeCompare(safeStr(b.name), 'zh-TW', { sensitivity: 'base' })
    );
  const allCollapsed = sorted.length > 0 && sorted.every(a => !expanded[a.id]);
  const unqueriedCount = sorted.filter(a => a.queryOk === null || a.queryOk === undefined).length;

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
        <Button variant="pri" onClick={() => { setEditAttr(null); setModal('add'); }}>
          ＋ 新增景點
        </Button>
        <Button onClick={() => setModal('batch')}>📋 批次新增</Button>
        {hasApiKey && unqueriedCount > 0 && (
          <Button
            variant="violet"
            onClick={queryAll}
            disabled={batchQuerying}
          >
            {batchQuerying
              ? `⏳ 查詢中（還剩 ${querying.size} 個）…`
              : `🔍 查詢景點資訊（${unqueriedCount} 個）`}
          </Button>
        )}
        {sorted.length > 0 && (
          <Button size="small" style={{ marginLeft: 'auto' }} onClick={toggleAll}>
            {allCollapsed ? '⊞ 展開全部' : '⊟ 收合全部'}
          </Button>
        )}
      </div>

      {!hasApiKey && sorted.length > 0 && (
        <div style={{ fontSize: 12, color: colors.mist, marginBottom: 10, padding: '8px 12px', background: colors.fog, borderRadius: 8 }}>
          💡 在 <code>.env.local</code> 加入 <code>VITE_GOOGLE_PLACES_API_KEY=...</code> 即可啟用 Google 景點資訊查詢
        </div>
      )}

      {sorted.length === 0 && (
        <p style={{ color: colors.mist, fontSize: 14 }}>
          尚無景點，新增後可拖曳至行程
        </p>
      )}

      {sorted.map(a => {
        const isOpen = !!expanded[a.id];
        const isQuerying = querying.has(a.id);
        return (
          <div
            key={a.id}
            style={{ ...Sty.card, cursor: 'grab', opacity: a.visited ? 0.65 : 1 }}
            draggable
            onDragStart={e => { e.dataTransfer?.setData('attrId', a.id); }}
          >
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={!!a.visited}
                  onChange={() => togA(a.id)}
                  style={{ marginTop: 3, flexShrink: 0, accentColor: colors.coral, width: 16, height: 16 }}
                />
                <div
                  style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={() => setExpanded(p => ({ ...p, [a.id]: !p[a.id] }))}
                >
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
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
                    {a.queryOk === false && (
                      <span style={{ fontSize: 11, color: colors.danger, background: colors.dangerLight, borderRadius: 999, padding: '1px 7px' }}>
                        查詢失敗
                      </span>
                    )}
                    {a.queryOk === true && !a.hours && !a.price && (
                      <span style={{ fontSize: 11, color: colors.mist }}>查無資料</span>
                    )}
                    <span style={{ fontSize: 11, color: colors.mist, marginLeft: 'auto' }}>
                      {isOpen ? '▾' : '▸'}
                    </span>
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: 6 }}>
                      {/* 營業時間：每天一行，用 pre-line 渲染 \n 換行 */}
                      {a.hours && (
                        <div style={{ fontSize: 12, color: colors.slate, whiteSpace: 'pre-line', lineHeight: 1.8, marginBottom: 6 }}>
                           {a.hours}
                        </div>
                      )}
                      {/* 票價 / 連結：單行並排 */}
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {(a.price !== undefined && a.price !== null && a.price !== '') && (
                          <span style={{ fontSize: 12, color: colors.slate }}>
                            💴 {a.price} {trip.localCurrency || ''}
                          </span>
                        )}
                        {a.website && (
                          <a href={a.website} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 12, color: colors.sky, fontWeight: 600 }}>
                            🌐 官網
                          </a>
                        )}
                        {a.mapsUrl && (
                          <a href={a.mapsUrl} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 12, color: colors.sky, fontWeight: 600 }}>
                            📍 地圖
                          </a>
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

                {/* 操作按鈕 */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {hasApiKey && (
                    <button
                      disabled={isQuerying}
                      onClick={() => queryOne(a.id, safeStr(a.name))}
                      title="查詢此景點的資訊（Google Places）"
                      style={{
                        padding: '4px 8px',
                        borderRadius: 8,
                        border: `1.5px solid ${colors.violetMid}`,
                        background: isQuerying ? colors.fog : colors.violetLight,
                        cursor: isQuerying ? 'wait' : 'pointer',
                        fontSize: 13,
                        lineHeight: 1,
                        color: colors.violetDark,
                      }}
                    >
                      {isQuerying ? '⏳' : '🤖'}
                    </button>
                  )}
                  <Button size="small" onClick={() => { setEditAttr(a); setModal('edit'); }}>
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

      {/* 新增景點 Modal */}
      {modal === 'add' && (
        <AttrModal
          title="新增景點"
          init={{}}
          local={trip.localCurrency}
          onClose={() => setModal(null)}
          onSave={a => { addA(a); setModal(null); }}
        />
      )}

      {/* 編輯景點 Modal */}
      {modal === 'edit' && editAttr && (
        <AttrModal
          title="編輯景點"
          init={editAttr}
          local={trip.localCurrency}
          onClose={() => setModal(null)}
          onSave={a => { upA(editAttr.id, a); setModal(null); }}
        />
      )}

      {/* 批次新增 Modal */}
      {modal === 'batch' && (
        <Modal title="批次新增景點" onClose={() => setModal(null)} width={400}>
          <p style={{ fontSize: 13, color: colors.mist, marginBottom: 10 }}>每行一個景點名稱</p>
          <textarea
            style={{ ...Sty.inp, height: 140, resize: 'vertical' as const }}
            value={batch}
            onChange={e => setBatch(e.target.value)}
            placeholder={'淺草寺\n上野動物園\n秋葉原'}
          />
          {hasApiKey && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <input
                type="checkbox"
                id="batchQuery"
                checked={batchQueryAfter}
                onChange={e => setBatchQueryAfter(e.target.checked)}
                style={{ accentColor: colors.violet, width: 16, height: 16 }}
              />
              <label htmlFor="batchQuery" style={{ fontSize: 13, color: colors.slate, cursor: 'pointer' }}>
                🔍 新增後立即查詢景點資訊（Google Places）
              </label>
            </div>
          )}
          <ModalFooter onClose={() => setModal(null)} onSave={addBatch} saveLabel="新增" />
        </Modal>
      )}
    </div>
  );
}

interface AttrFormData {
  name: string;
  hours: string;
  price: string;
  note: string;
  mapsUrl: string;
  website: string;
  manualPrice: boolean;
  ticketReminder: null;
}

interface AttrModalProps {
  title: string;
  init: Partial<AttrFormData>;
  local: string;
  onClose: () => void;
  onSave: (data: AttrFormData) => void;
}

function AttrModal({ title, init, local, onClose, onSave }: AttrModalProps) {
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
        <input style={Sty.inp} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      </Field>
      <Field label="營業時間（24小時制）">
        <input style={Sty.inp} value={f.hours} onChange={e => setF({ ...f, hours: e.target.value })} placeholder="09:00-17:00" />
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
        <input style={Sty.inp} value={f.mapsUrl} onChange={e => setF({ ...f, mapsUrl: e.target.value })} placeholder="https://maps.google.com/..." />
      </Field>
      <Field label="官方網站">
        <input style={Sty.inp} value={f.website} onChange={e => setF({ ...f, website: e.target.value })} placeholder="https://..." />
      </Field>
      <Field label="備註">
        <input style={Sty.inp} value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
      </Field>
      <ModalFooter onClose={onClose} onSave={() => onSave(f)} />
    </Modal>
  );
}
