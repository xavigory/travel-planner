import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "travel_app_v4";
const CURRENCIES = ["TWD","USD","JPY","EUR","GBP","AUD","CAD","HKD","KRW","SGD","THB","CNY","MXN","CHF","NZD"];
const EXP_CATS = ["餐飲","交通","住宿","門票","購物","其他"];
const DEF_PACK = ["護照","信用卡","現金","充電線","轉接頭","行動電源","盥洗用品","浴巾","拖鞋","藥品","口罩","雨傘","防曬乳","相機"];
const ACC_PLAT = ["Booking.com","Airbnb","Agoda","Hotels.com","Expedia","官方網站","其他"];
const TRANS_TYPES = ["機票","火車","巴士","渡輪","租車","其他"];
const TABS = [["🗓️","行程"],["📍","景點"],["🏨","住宿交通"],["💰","記帳"],["🧳","行李"]];
const TIMEZONES = ["Asia/Taipei","Asia/Tokyo","Asia/Seoul","Asia/Bangkok","Asia/Singapore","Asia/Hong_Kong","Asia/Shanghai","Asia/Dubai","Europe/London","Europe/Paris","America/New_York","America/Los_Angeles","America/Chicago","Australia/Sydney","Pacific/Auckland"];

const C = {
  coral:"#FF6B47",coralDark:"#CC4A28",coralLight:"#FFF0EC",coralMid:"#FFCDC0",
  teal:"#00C9A7",tealDark:"#008F77",tealLight:"#E0FBF5",
  violet:"#7C5CE4",violetDark:"#5A3EC8",violetLight:"#F0ECFF",violetMid:"#D5C9FF",
  sun:"#FFB830",sunDark:"#CC8F00",sunLight:"#FFF8E7",
  sky:"#3EA8FF",
  ink:"#1A1A2E",slate:"#3D3D5C",mist:"#8888AA",cloud:"#C8C8DC",fog:"#F4F4F8",white:"#FFFFFF",page:"#F7F7FB",
  danger:"#E24B4A",dangerLight:"#FFF0F0",dangerDark:"#9B1C1C",
};
const F = { display:"'Fraunces',Georgia,serif", body:"'Plus Jakarta Sans',system-ui,sans-serif" };

function uid() { return Math.random().toString(36).slice(2,10); }
function today() { return new Date().toISOString().slice(0,10); }

// ── PDF Generator ─────────────────────────────────────────────────────────────
function generatePDF(trip) {
  const days = getDays(trip.startDate, trip.endDate);
  const exps = trip.expenses || [];
  const curs = [...new Set(exps.map(e => e.currency))];

  function getTot(cur, cat) {
    return exps.filter(e => e.currency===cur && (!cat||e.category===cat)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
  }

  function autoItemsForDay(ds) {
    const items = [];
    (trip.accommodations||[]).forEach(a => {
      if (a.checkIn===ds) items.push({time:a.checkInTime||"14:00", name:"🏨 入住："+safeStr(a.name)});
      if (a.checkOut===ds) items.push({time:a.checkOutTime||"11:00", name:"🏨 退房："+safeStr(a.name)});
    });
    (trip.transports||[]).forEach(tr => {
      if (tr.date===ds) {
        const ic=tr.type==="機票"?"✈":tr.type==="火車"?"🚆":tr.type==="巴士"?"🚌":tr.type==="渡輪"?"🚢":"🚗";
        items.push({time:tr.depTime||"", name:ic+" "+safeStr(tr.from)+"→"+safeStr(tr.to)});
      }
    });
    return items;
  }

  const tripName = trip.name || ((trip.startDate||"?")+" "+(trip.destination||"未命名"));
  const EXP_CATS_LIST = ["餐飲","交通","住宿","門票","購物","其他"];

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>${tripName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif; color: #1A1A2E; font-size: 13px; line-height: 1.6; background: #fff; padding: 32px; }
  h1 { font-size: 24px; font-weight: 700; color: #FF6B47; margin-bottom: 4px; }
  h2 { font-size: 16px; font-weight: 700; color: #1A1A2E; margin: 24px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #FF6B47; }
  h3 { font-size: 14px; font-weight: 600; color: #3D3D5C; margin: 14px 0 6px; }
  .meta { font-size: 12px; color: #8888AA; margin-bottom: 20px; }
  .tag { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 999px; margin-right: 4px; }
  .tag-v { background: #F0ECFF; color: #5A3EC8; }
  .tag-t { background: #E0FBF5; color: #008F77; }
  .day-block { margin-bottom: 18px; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; page-break-inside: avoid; }
  .day-header { background: #f7f7f7; padding: 8px 14px; font-weight: 600; font-size: 14px; color: #1A1A2E; }
  .day-body { padding: 6px 14px; }
  .item-row { display: flex; gap: 10px; padding: 5px 0; border-bottom: 1px solid #f4f4f8; }
  .item-row:last-child { border-bottom: none; }
  .item-time { min-width: 44px; color: #8888AA; font-size: 12px; padding-top: 1px; flex-shrink: 0; }
  .item-name { flex: 1; font-size: 13px; }
  .item-sub { font-size: 11px; color: #8888AA; margin-top: 2px; }
  .spot-tag { font-size: 11px; color: #7C5CE4; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f4f4f8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 10px; border: 1px solid #C8C8DC; color: #3D3D5C; }
  td { padding: 7px 10px; border: 1px solid #C8C8DC; font-size: 13px; }
  td.num { text-align: right; }
  td.total { background: #F0ECFF; color: #5A3EC8; font-weight: 700; text-align: right; }
  td.cur { font-weight: 700; }
  .memo-box { background: #f9f9ff; border: 1px solid #C8C8DC; border-radius: 8px; padding: 12px 14px; font-size: 13px; white-space: pre-wrap; color: #3D3D5C; }
  .footer { margin-top: 32px; font-size: 11px; color: #C8C8DC; text-align: center; }
  @media print { body { padding: 16px; } .day-block { page-break-inside: avoid; } }
</style>
</head>
<body>
<h1>${tripName}</h1>
<div class="meta">
  ${trip.startDate&&trip.endDate?trip.startDate+" ～ "+trip.endDate+"　·　"+days.length+"天":""}
  &nbsp;
  ${trip.currency?'<span class="tag tag-v">'+trip.currency+'</span>':""}
  ${trip.localCurrency?'<span class="tag tag-t">'+trip.localCurrency+'</span>':""}
</div>

${trip.memo?`<h2>📋 備忘錄</h2><div class="memo-box">${trip.memo.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>`:""}

<h2>🗓️ 行程</h2>
${days.map((ds,i) => {
  const autoItms = autoItemsForDay(ds);
  const userItms = ((trip.itinerary||{})[ds]||[]);
  const allItms = [
    ...autoItms,
    ...userItms
  ].sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  if (allItms.length===0) return `<div class="day-block"><div class="day-header">Day ${i+1} · ${ds}</div><div class="day-body" style="padding:10px 14px;color:#8888AA;font-size:12px;">尚無行程</div></div>`;
  return `<div class="day-block">
    <div class="day-header">Day ${i+1} · ${ds}</div>
    <div class="day-body">
      ${allItms.map(item => {
        const isSpot = !!item.attrId;
        const attr = isSpot ? (trip.attractions||[]).find(a=>a.id===item.attrId) : null;
        const hours = item.overrideHours!==undefined?item.overrideHours:safeStr(attr&&attr.hours);
        const price = item.overridePrice!==undefined?item.overridePrice:(attr?attr.price:"");
        const sub = [
          hours?("🕐 "+hours):"",
          (price!==undefined&&price!==null&&price!=="")?"💴 "+String(price)+" "+(trip.localCurrency||""):"",
          safeStr(item.note)
        ].filter(Boolean).join("　");
        return `<div class="item-row">
          <div class="item-time">${item.time||"--:--"}</div>
          <div class="item-name">
            ${isSpot?'<span class="spot-tag">📍 </span>':""}${safeStr(item.name).replace(/</g,"&lt;")}
            ${sub?`<div class="item-sub">${sub.replace(/</g,"&lt;")}</div>`:""}
          </div>
        </div>`;
      }).join("")}
    </div>
  </div>`;
}).join("")}

<h2>💰 記帳統計</h2>
${curs.length===0?'<p style="color:#8888AA">尚無支出記錄</p>':
`<table>
  <thead><tr><th style="text-align:left">幣別</th>${EXP_CATS_LIST.map(c=>`<th>${c}</th>`).join("")}<th>總和</th></tr></thead>
  <tbody>
    ${curs.map(cur => `<tr>
      <td class="cur">${cur}</td>
      ${EXP_CATS_LIST.map(cat => { const v=getTot(cur,cat); return `<td class="num">${v>0?v.toLocaleString():"—"}</td>`; }).join("")}
      <td class="total">${getTot(cur).toLocaleString()}</td>
    </tr>`).join("")}
  </tbody>
</table>
<h3>明細</h3>
<table>
  <thead><tr><th style="text-align:left">日期</th><th style="text-align:left">分類</th><th style="text-align:left">備註</th><th>金額</th><th style="text-align:left">幣別</th></tr></thead>
  <tbody>
    ${exps.slice().sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(e=>`<tr>
      <td>${e.date||""}</td><td>${e.category}</td><td>${safeStr(e.note).replace(/</g,"&lt;")}</td>
      <td class="num">${Number(e.amount).toLocaleString()}</td><td>${e.currency}</td>
    </tr>`).join("")}
  </tbody>
</table>`}

<div class="footer">由 Wanderlust 旅行規劃 App 匯出　·　${today()}</div>
</body>
</html>`;

  const blob = new Blob([html], {type:"text/html;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = tripName.replace(/[\/\\:*?"<>|]/g,"_")+".html";
  a.click();
  URL.revokeObjectURL(url);
}
function safeStr(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return Object.entries(v).map(([k,val]) => k+": "+val).join("、");
  return String(v);
}
function sanitizeAttr(a) {
  return { ...a, hours:safeStr(a.hours), price:(a.price!==undefined&&a.price!==null)?a.price:"", mapsUrl:safeStr(a.mapsUrl), website:safeStr(a.website), source:safeStr(a.source), name:safeStr(a.name), note:safeStr(a.note) };
}
function sanitizeData(d) {
  if (!d) return null;
  return { ...d, trips:(d.trips||[]).map(t => ({ ...t, attractions:(t.attractions||[]).map(sanitizeAttr) })) };
}
function loadData() { try { const r=localStorage.getItem(STORAGE_KEY); return r?JSON.parse(r):null; } catch { return null; } }
function saveData(d) { try { localStorage.setItem(STORAGE_KEY,JSON.stringify(d)); } catch {} }
function getDays(s,e) {
  if (!s||!e) return [];
  const days=[]; let d=new Date(s+"T00:00:00"),en=new Date(e+"T00:00:00");
  while (d<=en) { days.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1); }
  return days;
}
function cancelLeft(ds) {
  if (!ds) return null;
  const t=new Date(); t.setHours(0,0,0,0);
  return Math.round((new Date(ds+"T00:00:00")-t)/86400000);
}
function collectReminders(trips) {
  const rem=[]; const now=new Date(); now.setHours(0,0,0,0);
  trips.forEach(trip => {
    const tname=trip.name||((trip.startDate||"?")+" "+(trip.destination||"未命名"));
    (trip.attractions||[]).forEach(a => {
      const tr=a.ticketReminder;
      if (tr&&tr.date) {
        const diff=Math.round((new Date(tr.date+"T00:00:00")-now)/86400000);
        rem.push({type:"ticket",tripName:tname,label:"搶票提醒："+safeStr(a.name),date:tr.date,time:tr.time||"",tz:tr.tz||"",diff,tripId:trip.id});
      }
    });
    (trip.accommodations||[]).forEach(a => {
      if (a.freeCancel) { const diff=cancelLeft(a.freeCancel); if (diff!==null&&diff>=0&&diff<=14) rem.push({type:"cancel",tripName:tname,label:"免費取消截止："+safeStr(a.name),date:a.freeCancel,diff,tripId:trip.id}); }
    });
    (trip.transports||[]).forEach(tr => {
      if (tr.freeCancel) { const diff=cancelLeft(tr.freeCancel); if (diff!==null&&diff>=0&&diff<=14) rem.push({type:"cancel",tripName:tname,label:"免費取消截止："+safeStr(tr.type)+" "+safeStr(tr.from)+"→"+safeStr(tr.to),date:tr.freeCancel,diff,tripId:trip.id}); }
    });
  });
  rem.sort((a,b)=>a.diff-b.diff);
  return rem;
}

const Sty = {
  inp:{width:"100%",boxSizing:"border-box",border:"1.5px solid "+C.cloud,borderRadius:10,padding:"10px 14px",fontSize:14,color:C.ink,background:C.white,fontFamily:F.body,outline:"none"},
  card:{background:C.white,borderRadius:14,border:"1px solid rgba(0,0,0,0.07)",marginBottom:10,overflow:"hidden"},
  lbl:{fontSize:13,fontWeight:600,color:C.ink,marginBottom:6,display:"block",fontFamily:F.body},
};
function btn(v, sm) {
  const base={padding:sm?"7px 16px":"10px 22px",borderRadius:10,fontSize:sm?12:14,cursor:"pointer",fontWeight:600,border:"none",fontFamily:F.body,transition:"all .15s",display:"inline-flex",alignItems:"center",gap:6};
  if (v==="pri") return {...base,background:C.coral,color:C.white};
  if (v==="dan") return {...base,background:C.danger,color:C.white};
  if (v==="teal") return {...base,background:C.teal,color:C.white};
  if (v==="violet") return {...base,background:C.violet,color:C.white};
  return {...base,background:C.white,color:C.slate,border:"1px solid "+C.cloud};
}
function Bdg({fc,bg,text}) { return <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:999,background:bg,color:fc}}>{text}</span>; }
function Field({label,children,style}) { return <div style={{marginBottom:16,...style}}><div style={Sty.lbl}>{label}</div>{children}</div>; }

function Modal({title,onClose,children,width}) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:48,pointerEvents:"none"}}>
      <div style={{pointerEvents:"all",background:C.white,border:"1.5px solid "+C.cloud,borderRadius:20,boxShadow:"0 16px 48px rgba(26,26,46,0.14)",width:Math.min(width||540,680),maxWidth:"95vw",maxHeight:"86vh",overflowY:"auto",padding:"22px 26px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <span style={{fontFamily:F.display,fontSize:18,fontWeight:500,color:C.ink}}>{title}</span>
          <button onClick={onClose} style={{background:C.fog,border:"none",cursor:"pointer",fontSize:14,color:C.mist,padding:"6px 10px",borderRadius:8,fontWeight:700}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({onClose,onSave,saveLabel,extra}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20,paddingTop:16,borderTop:"1px solid "+C.fog}}>
      <div>{extra||null}</div>
      <div style={{display:"flex",gap:8}}>
        <button style={btn("def",true)} onClick={onClose}>取消</button>
        <button style={btn("pri",true)} onClick={onSave}>{saveLabel||"儲存"}</button>
      </div>
    </div>
  );
}

function TripModal({title,init,onClose,onSave}) {
  const [f,setF] = useState({name:"",destination:"",startDate:"",endDate:"",currency:"TWD",localCurrency:"JPY",...init});
  return (
    <Modal title={title} onClose={onClose}>
      <Field label="旅行名稱（可留空）"><input style={Sty.inp} value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="留空則自動命名"/></Field>
      <Field label="目的地"><input style={Sty.inp} value={f.destination} onChange={e=>setF({...f,destination:e.target.value})}/></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <Field label="出發日期"><input type="date" style={Sty.inp} value={f.startDate} onChange={e=>setF({...f,startDate:e.target.value})}/></Field>
        <Field label="結束日期"><input type="date" style={Sty.inp} value={f.endDate} onChange={e=>setF({...f,endDate:e.target.value})}/></Field>
        <Field label="主要貨幣"><select style={Sty.inp} value={f.currency} onChange={e=>setF({...f,currency:e.target.value})}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></Field>
        <Field label="當地貨幣"><select style={Sty.inp} value={f.localCurrency} onChange={e=>setF({...f,localCurrency:e.target.value})}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></Field>
      </div>
      <ModalFooter onClose={onClose} onSave={()=>onSave(f)}/>
    </Modal>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [data,setData] = useState(() => sanitizeData(loadData()) || {trips:[],lugTpls:[...DEF_PACK]});
  const [sel,setSel] = useState(null);
  const [tab,setTab] = useState(0);
  const [modal,setModal] = useState(null);
  const [editTripId,setEditTripId] = useState(null);
  const [showMemo,setShowMemo] = useState(false);

  useEffect(() => { saveData(data); }, [data]);

  function upTrip(id,fn) { setData(d => ({...d,trips:d.trips.map(t=>t.id===id?fn(t):t)})); }
  function tripName(t) { return t.name||((t.startDate||"?")+" "+(t.destination||"未命名")); }

  const trip = sel ? data.trips.find(t=>t.id===sel)||null : null;
  const editTrip = editTripId ? data.trips.find(t=>t.id===editTripId)||null : null;
  const reminders = collectReminders(data.trips);

  if (!sel) {
    return (
      <div style={{minHeight:"100vh",background:C.page,fontFamily:F.body}}>
        <div style={{maxWidth:680,margin:"0 auto",padding:"24px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
            <div>
              <div style={{fontFamily:F.display,fontSize:28,fontWeight:700,background:"linear-gradient(135deg,"+C.coral+","+C.violet+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.1}}>Wanderlust</div>
              <div style={{fontSize:12,color:C.mist,letterSpacing:"0.06em",textTransform:"uppercase",marginTop:2}}>我的旅行</div>
            </div>
            <button style={btn("pri")} onClick={()=>setModal("new")}>＋ 新增旅行</button>
          </div>

          {reminders.length>0 && (
            <div style={{...Sty.card,marginBottom:20}}>
              <div style={{padding:"14px 18px"}}>
                <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:C.coral,marginBottom:12}}>⏰ 即將到來的提醒</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {reminders.map((r,i) => {
                    const isT=r.type==="ticket";
                    const bg=isT?C.violetLight:r.diff<=3?C.dangerLight:r.diff<=7?C.sunLight:C.tealLight;
                    const fc=isT?C.violetDark:r.diff<=3?C.dangerDark:r.diff<=7?C.sunDark:C.tealDark;
                    const dl=r.diff===0?"今天":r.diff===1?"明天":r.diff+"天後";
                    return (
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:bg,borderRadius:10,cursor:"pointer"}} onClick={()=>{setSel(r.tripId);setTab(isT?1:2);}}>
                        <span style={{fontSize:16}}>{isT?"🎫":"🔔"}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:600,color:fc}}>{r.label}</div>
                          <div style={{fontSize:11,color:fc,opacity:0.8}}>{r.tripName} · {r.date}{r.time?" "+r.time:""}{r.tz?" ("+r.tz+")":""}</div>
                        </div>
                        <div style={{fontSize:12,fontWeight:700,color:fc,background:C.white,borderRadius:999,padding:"3px 10px",whiteSpace:"nowrap"}}>{dl}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {data.trips.length===0 && (
            <div style={{textAlign:"center",padding:"48px 32px",background:C.white,borderRadius:20,border:"2px dashed "+C.cloud}}>
              <div style={{fontSize:48,marginBottom:14,opacity:0.5}}>✈️</div>
              <div style={{fontFamily:F.display,fontSize:20,fontWeight:500,color:C.ink,marginBottom:8}}>尚未規劃任何行程</div>
              <div style={{fontSize:14,color:C.mist}}>點擊右上角「新增旅行」開始規劃</div>
            </div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {data.trips.map(t => {
              const days=getDays(t.startDate,t.endDate);
              return (
                <div key={t.id} style={{...Sty.card,cursor:"pointer",marginBottom:0}} onClick={()=>{setSel(t.id);setTab(0);}}>
                  <div style={{padding:"16px 18px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontFamily:F.display,fontSize:18,fontWeight:500,color:C.ink}}>{tripName(t)}</div>
                        <div style={{fontSize:13,color:C.mist,marginTop:4}}>{t.startDate&&t.endDate?t.startDate+" ～ "+t.endDate+"  ·  "+days.length+"天":"日期未設定"}</div>
                        <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                          {t.currency&&<Bdg fc={C.violetDark} bg={C.violetLight} text={t.currency}/>}
                          {t.localCurrency&&<Bdg fc={C.tealDark} bg={C.tealLight} text={t.localCurrency}/>}
                        </div>
                      </div>
                      <button style={{...btn("def",true),flexShrink:0}} onClick={e=>{e.stopPropagation();setEditTripId(t.id);setModal("editTrip");}}>✏️ 編輯</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {modal==="new" && (
            <TripModal title="新增旅行" init={{}} onClose={()=>setModal(null)} onSave={f=>{
              const id=uid();
              setData(d=>({...d,trips:[...d.trips,{id,itinerary:{},attractions:[],accommodations:[],transports:[],expenses:[],luggage:d.lugTpls.map(n=>({id:uid(),name:n,checked:false})),memo:"",...f}]}));
              setModal(null);
            }}/>
          )}
          {modal==="editTrip" && editTrip && (
            <TripModal title="編輯旅行" init={editTrip} onClose={()=>{setModal(null);setEditTripId(null);}} onSave={f=>{upTrip(editTripId,t=>({...t,...f}));setModal(null);setEditTripId(null);}}/>
          )}
        </div>
      </div>
    );
  }

  if (!trip) { setSel(null); return null; }

  return (
    <div style={{minHeight:"100vh",background:C.page,fontFamily:F.body}}>
      <div style={{maxWidth:680,margin:"0 auto",padding:"16px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
          <button style={{...btn("def",true),padding:"7px 14px"}} onClick={()=>setSel(null)}>← 返回</button>
          <div style={{flex:1}}>
            <div style={{fontFamily:F.display,fontSize:17,fontWeight:500,color:C.ink}}>{tripName(trip)}</div>
            {trip.startDate&&trip.endDate&&<div style={{fontSize:12,color:C.mist}}>{trip.startDate} ～ {trip.endDate}</div>}
          </div>
          <button style={btn("def",true)} onClick={()=>setShowMemo(true)}>📋 備忘錄</button>
          <button style={btn("def",true)} onClick={()=>setModal("editTrip")}>✏️ 編輯</button>
        </div>

        <div style={{display:"flex",background:C.white,borderRadius:14,border:"1px solid rgba(0,0,0,0.07)",padding:4,marginBottom:16,overflowX:"auto",gap:2}}>
          {TABS.map(([ic,lb],i) => (
            <button key={i} onClick={()=>setTab(i)} style={{flex:1,padding:"8px 10px",border:"none",borderRadius:10,background:i===tab?C.coral:"transparent",cursor:"pointer",fontSize:12,color:i===tab?C.white:C.mist,whiteSpace:"nowrap",fontWeight:i===tab?700:500,fontFamily:F.body,transition:"all .15s",minWidth:56}}>
              {ic} {lb}
            </button>
          ))}
        </div>

        {tab===0 && <ItineraryTab trip={trip} upTrip={fn=>upTrip(trip.id,fn)}/>}
        {tab===1 && <AttractionsTab trip={trip} upTrip={fn=>upTrip(trip.id,fn)}/>}
        {tab===2 && <AccomTransTab trip={trip} upTrip={fn=>upTrip(trip.id,fn)}/>}
        {tab===3 && <ExpensesTab trip={trip} upTrip={fn=>upTrip(trip.id,fn)}/>}
        {tab===4 && <LuggageTab trip={trip} upTrip={fn=>upTrip(trip.id,fn)} tpls={data.lugTpls} setTpls={tpls=>setData(d=>({...d,lugTpls:tpls}))}/>}

        {modal==="editTrip" && (
          <TripModal title="編輯旅行" init={trip} onClose={()=>setModal(null)} onSave={f=>{upTrip(trip.id,t=>({...t,...f}));setModal(null);}}/>
        )}
        {showMemo && (
          <Modal title="📋 旅行備忘錄" onClose={()=>setShowMemo(false)} width={520}>
            <textarea style={{...Sty.inp,height:280,resize:"vertical",lineHeight:1.7}}
              placeholder={"記錄整個行程的備忘事項...\n例如：緊急聯絡電話、常用翻譯、兌換匯率、重要提醒等"}
              value={trip.memo||""}
              onChange={e=>upTrip(trip.id,t=>({...t,memo:e.target.value}))}
            />
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:14}}>
              <button style={btn("pri",true)} onClick={()=>setShowMemo(false)}>完成</button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

// ── Itinerary ─────────────────────────────────────────────────────────────────
function ItineraryTab({trip,upTrip}) {
  const [col,setCol] = useState({});
  const [modal,setModal] = useState(null);
  const [ctx,setCtx] = useState(null);
  const [dragOverDay,setDragOverDay] = useState(null);
  const [dragOverPanelIdx,setDragOverPanelIdx] = useState(null);
  const [panelPos,setPanelPos] = useState(null);
  const dragRef = useRef(null);
  const [dropTargetId,setDropTargetId] = useState(null);
  const isPanelDrag = useRef(false);

  const days = getDays(trip.startDate,trip.endDate);
  const attrs = trip.attractions||[];
  const placedIds = new Set(Object.values(trip.itinerary||{}).flat().map(i=>i.attrId).filter(Boolean));
  const unplaced = attrs.filter(a=>!placedIds.has(a.id));

  const allCollapsed = days.length>0 && days.every(d=>col[d]===true);

  function toggleAllDays() {
    if (allCollapsed) setCol({});
    else setCol(Object.fromEntries(days.map(d=>[d,true])));
  }

  function autoItems(ds) {
    const items=[];
    (trip.accommodations||[]).forEach(a=>{
      if(a.checkIn===ds)items.push({id:"ai"+a.id,time:a.checkInTime||"14:00",name:"🏨 入住："+safeStr(a.name),auto:true,status:!a.amount?"pending":a.freeCancel?"free":"paid"});
      if(a.checkOut===ds)items.push({id:"ao"+a.id,time:a.checkOutTime||"11:00",name:"🏨 退房："+safeStr(a.name),auto:true,status:!a.amount?"pending":a.freeCancel?"free":"paid"});
    });
    (trip.transports||[]).forEach(tr=>{
      if(tr.date===ds){
        const ic=tr.type==="機票"?"✈️":tr.type==="火車"?"🚆":tr.type==="巴士"?"🚌":tr.type==="渡輪"?"🚢":"🚗";
        items.push({id:"tr"+tr.id,time:tr.depTime||"",name:ic+" "+safeStr(tr.from)+"→"+safeStr(tr.to),auto:true,status:!tr.amount?"pending":tr.freeCancel?"free":"paid"});
      }
    });
    return items;
  }

  function uItems(ds){return(trip.itinerary||{})[ds]||[];}
  function addItem(ds,item){upTrip(t=>({...t,itinerary:{...t.itinerary,[ds]:[...(t.itinerary[ds]||[]),{id:uid(),...item}]}}));}
  function editItemData(ds,id,item){upTrip(t=>({...t,itinerary:{...t.itinerary,[ds]:(t.itinerary[ds]||[]).map(x=>x.id===id?{...x,...item}:x)}}));}
  function delItem(ds,id){upTrip(t=>({...t,itinerary:{...t.itinerary,[ds]:(t.itinerary[ds]||[]).filter(x=>x.id!==id)}}));}
  function reorder(ds,fromId,toId){
    if(fromId===toId)return;
    upTrip(t=>{
      const arr=[...(t.itinerary[ds]||[])];
      const fi=arr.findIndex(x=>x.id===fromId),ti=arr.findIndex(x=>x.id===toId);
      if(fi<0||ti<0)return t;
      const[m]=arr.splice(fi,1);arr.splice(ti,0,m);
      return{...t,itinerary:{...t.itinerary,[ds]:arr}};
    });
  }
  function saveSpot(ds,item,ed){
    editItemData(ds,item.id,{time:ed.time,note:ed.note,overrideHours:ed.hours,overridePrice:ed.price,overrideWebsite:ed.website,overrideMapsUrl:ed.mapsUrl});
    upTrip(t=>({...t,attractions:(t.attractions||[]).map(a=>a.id!==item.attrId?a:{...a,hours:ed.hours,price:ed.price,website:ed.website,mapsUrl:ed.mapsUrl})}));
  }
  const sColor=s=>s==="pending"?C.danger:s==="free"?C.tealDark:C.ink;

  function ChipPanel() {
    return (
      <div draggable onDragStart={e=>{isPanelDrag.current=true;e.dataTransfer.setData("chipPanel","1");}} onDragEnd={()=>{isPanelDrag.current=false;setDragOverPanelIdx(null);}}
        style={{...Sty.card,marginBottom:14,border:"1.5px solid "+C.violetMid}}>
        <div style={{padding:"12px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <span style={{fontSize:14,color:C.cloud,cursor:"grab"}}>⠿</span>
            <span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:C.coral}}>📍 拖曳景點加入行程（可移動此面板）</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {unplaced.map(a=>(
              <div key={a.id} draggable onDragStart={e=>{e.stopPropagation();e.dataTransfer.setData("attrId",a.id);isPanelDrag.current=false;}} onDragEnd={()=>{setDragOverDay(null);}}
                style={{padding:"5px 14px",borderRadius:999,border:"1.5px solid "+C.violetMid,background:C.violetLight,cursor:"grab",fontSize:12,fontWeight:600,userSelect:"none",color:C.violetDark,opacity:a.visited?0.5:1}}>
                {a.visited?"✓ ":"📍 "}{safeStr(a.name)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function SpotInline({item,ds}) {
    const attr=attrs.find(a=>a.id===item.attrId);
    const[editing,setEditing]=useState(false);
    const[ed,setEd]=useState({});
    const hours=item.overrideHours!==undefined?item.overrideHours:safeStr(attr&&attr.hours);
    const price=item.overridePrice!==undefined?item.overridePrice:(attr?attr.price:"");
    const website=item.overrideWebsite!==undefined?item.overrideWebsite:safeStr(attr&&attr.website);
    const mapsUrl=item.overrideMapsUrl!==undefined?item.overrideMapsUrl:safeStr(attr&&attr.mapsUrl);
    const noteStr=safeStr(item.note);
    const isDragging=dragRef.current&&dragRef.current.ds===ds&&dragRef.current.id===item.id;
    const isOver=dropTargetId===item.id;
    return (
      <div draggable
        onDragStart={e=>{e.stopPropagation();e.dataTransfer.setData("reorder",item.id);dragRef.current={ds,id:item.id};isPanelDrag.current=false;}}
        onDragOver={e=>{e.preventDefault();e.stopPropagation();setDropTargetId(item.id);}}
        onDrop={e=>{e.stopPropagation();e.preventDefault();if(dragRef.current&&dragRef.current.ds===ds)reorder(ds,dragRef.current.id,item.id);dragRef.current=null;setDropTargetId(null);}}
        onDragEnd={()=>{dragRef.current=null;setDropTargetId(null);}}
        style={{marginBottom:8,border:"1.5px solid "+(isOver?C.coral:C.cloud),borderRadius:12,background:isDragging?"#f0f5ff":C.white,cursor:"grab",opacity:isDragging?0.4:1}}>
        {!editing ? (
          <div style={{padding:"10px 12px"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
              <span style={{fontSize:14,color:C.cloud,flexShrink:0,paddingTop:2}}>⠿</span>
              <span style={{fontSize:12,color:C.mist,minWidth:42,paddingTop:2,flexShrink:0}}>{item.time||"--:--"}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:F.display,fontSize:15,fontWeight:500,color:C.ink,marginBottom:2}}>📍 {safeStr(item.name)}</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {safeStr(hours)&&<span style={{fontSize:12,color:C.slate}}>🕐 {safeStr(hours)}</span>}
                  {(price!==undefined&&price!==null&&price!=="")&&<span style={{fontSize:12,color:C.slate}}>💴 {String(price)} {trip.localCurrency||""}</span>}
                </div>
                <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
                  {safeStr(mapsUrl)&&<a href={safeStr(mapsUrl)} style={{fontSize:12,color:C.sky,fontWeight:600}}>📍 地圖</a>}
                  {safeStr(website)&&<a href={safeStr(website)} style={{fontSize:12,color:C.sky,fontWeight:600}}>🌐 官網</a>}
                </div>
                {noteStr&&<div style={{fontSize:12,color:C.mist,marginTop:4}}>{noteStr}</div>}
                {(item.overrideHours||item.overridePrice)&&<div style={{fontSize:11,color:C.sunDark,marginTop:2}}>✏️ 含手動修改</div>}
              </div>
              <div style={{display:"flex",gap:4,flexShrink:0}}>
                <button style={{...btn("def",true),padding:"3px 8px",fontSize:11}} onClick={()=>{setEd({time:item.time||"",note:noteStr,hours:safeStr(hours),price:price!==null&&price!==undefined?String(price):"",website:safeStr(website),mapsUrl:safeStr(mapsUrl)});setEditing(true);}}>✏️</button>
                <button style={{...btn("dan",true),padding:"3px 8px",fontSize:11}} onClick={()=>delItem(ds,item.id)}>✕</button>
              </div>
            </div>
          </div>
        ):(
          <div style={{padding:"12px 14px",background:C.fog}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <Field label="時間"><input type="time" style={Sty.inp} value={ed.time} onChange={e=>setEd(p=>({...p,time:e.target.value}))}/></Field>
              <Field label={"票價（"+trip.localCurrency+")"}><input style={Sty.inp} value={ed.price} onChange={e=>setEd(p=>({...p,price:e.target.value}))}/></Field>
              <Field label="營業時間" style={{gridColumn:"1/-1"}}><input style={Sty.inp} value={ed.hours} onChange={e=>setEd(p=>({...p,hours:e.target.value}))}/></Field>
              <Field label="官方網站" style={{gridColumn:"1/-1"}}><input style={Sty.inp} value={ed.website} onChange={e=>setEd(p=>({...p,website:e.target.value}))}/></Field>
              <Field label="地圖連結" style={{gridColumn:"1/-1"}}><input style={Sty.inp} value={ed.mapsUrl} onChange={e=>setEd(p=>({...p,mapsUrl:e.target.value}))}/></Field>
              <Field label="備註" style={{gridColumn:"1/-1"}}><input style={Sty.inp} value={ed.note} onChange={e=>setEd(p=>({...p,note:e.target.value}))}/></Field>
            </div>
            <div style={{fontSize:11,color:C.mist,marginBottom:10}}>儲存後將同步更新景點資料</div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button style={btn("def",true)} onClick={()=>setEditing(false)}>取消</button>
              <button style={btn("pri",true)} onClick={()=>{saveSpot(ds,item,ed);setEditing(false);}}>儲存</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function DropZone({idx}) {
    const isOver=dragOverPanelIdx===idx;
    return (
      <div
        onDragOver={e=>{if(isPanelDrag.current){e.preventDefault();setDragOverPanelIdx(idx);}}}
        onDragLeave={()=>setDragOverPanelIdx(null)}
        onDrop={e=>{if(e.dataTransfer.getData("chipPanel")==="1"){e.preventDefault();setPanelPos(idx);setDragOverPanelIdx(null);}}}
        style={{height:isOver?8:4,background:isOver?C.coral:"transparent",borderRadius:4,marginBottom:isOver?8:2,transition:"all .15s"}}
      />
    );
  }

  return (
    <div>
      {unplaced.length>0 && panelPos===null && <ChipPanel/>}

      {days.length>0 && (
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
          <button style={btn("def",true)} onClick={toggleAllDays}>
            {allCollapsed ? "⊞ 展開全部" : "⊟ 收合全部"}
          </button>
        </div>
      )}

      {days.length===0 && <p style={{color:C.mist,fontSize:14}}>請先設定旅行日期</p>}

      {days.map((ds,i) => {
        const open = col[ds]!==true;
        const autoItms=autoItems(ds);
        const uitms=uItems(ds);
        const total=autoItms.length+uitms.length;
        const isOver=dragOverDay===ds;
        return (
          <div key={ds}>
            {unplaced.length>0 && <DropZone idx={i}/>}
            {unplaced.length>0 && panelPos===i && <ChipPanel/>}
            <div style={{...Sty.card,border:"1.5px solid "+(isOver?C.coral:"rgba(0,0,0,0.07)"),background:isOver?"#fff8f6":C.white}}
              onDragOver={e=>{if(!isPanelDrag.current){e.preventDefault();setDragOverDay(ds);}}}
              onDragLeave={()=>setDragOverDay(null)}
              onDrop={e=>{
                e.preventDefault();
                if(isPanelDrag.current)return;
                const attrId=e.dataTransfer.getData("attrId");
                if(attrId){const attr=attrs.find(a=>a.id===attrId);if(attr)addItem(ds,{time:"",name:safeStr(attr.name),note:"",attrId:attr.id});}
                setDragOverDay(null);
              }}>
              <div style={{display:"flex",alignItems:"center",padding:"12px 16px",cursor:"pointer",userSelect:"none",borderBottom:open?"1px solid "+C.fog:"none"}} onClick={()=>setCol(c=>({...c,[ds]:open}))}>
                <span style={{fontFamily:F.display,fontSize:15,fontWeight:500,color:C.ink,flex:1}}>Day {i+1} <span style={{fontSize:13,color:C.mist,fontFamily:F.body}}>· {ds}</span></span>
                <span style={{fontSize:12,color:C.mist,marginRight:8}}>{total} 項</span>
                <span style={{fontSize:12,color:C.mist}}>{open?"▾":"▸"}</span>
              </div>
              {open && (
                <div style={{padding:"10px 14px"}}>
                  {autoItms.map(item=>(
                    <div key={item.id} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 0",borderBottom:"1px solid "+C.fog}}>
                      <span style={{fontSize:12,color:C.mist,minWidth:42,paddingTop:2}}>{item.time||"--:--"}</span>
                      <span style={{fontSize:13,color:sColor(item.status),flex:1}}>{item.name}</span>
                    </div>
                  ))}
                  {uitms.map(item => {
                    if (item.attrId) return <SpotInline key={item.id} item={item} ds={ds}/>;
                    const isDrag=dragRef.current&&dragRef.current.ds===ds&&dragRef.current.id===item.id;
                    const isDrop=dropTargetId===item.id;
                    return (
                      <div key={item.id} draggable
                        onDragStart={e=>{e.stopPropagation();e.dataTransfer.setData("reorder",item.id);dragRef.current={ds,id:item.id};isPanelDrag.current=false;}}
                        onDragOver={e=>{e.preventDefault();e.stopPropagation();setDropTargetId(item.id);}}
                        onDrop={e=>{e.stopPropagation();e.preventDefault();if(dragRef.current&&dragRef.current.ds===ds)reorder(ds,dragRef.current.id,item.id);dragRef.current=null;setDropTargetId(null);}}
                        onDragEnd={()=>{dragRef.current=null;setDropTargetId(null);}}
                        style={{display:"flex",alignItems:"flex-start",gap:8,padding:"7px 6px",marginBottom:4,border:"1.5px solid "+(isDrop?C.coral:"transparent"),borderRadius:8,cursor:"grab",opacity:isDrag?0.4:1,background:isDrop?"#fff0ec":C.white}}>
                        <span style={{fontSize:14,color:C.cloud,flexShrink:0,paddingTop:1}}>⠿</span>
                        <span style={{fontSize:12,color:C.mist,minWidth:42,paddingTop:2}}>{item.time||"--:--"}</span>
                        <div style={{flex:1}}>
                          <span style={{fontSize:13,color:C.ink}}>{safeStr(item.name)}</span>
                          {item.note&&<div style={{fontSize:12,color:C.mist}}>{safeStr(item.note)}</div>}
                        </div>
                        <div style={{display:"flex",gap:4}}>
                          <button style={{...btn("def",true),padding:"2px 8px",fontSize:11}} onClick={()=>{setCtx({ds,item});setModal("edit");}}>✏️</button>
                          <button style={{...btn("dan",true),padding:"2px 8px",fontSize:11}} onClick={()=>delItem(ds,item.id)}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                  {isOver&&<div style={{textAlign:"center",fontSize:12,color:C.coral,padding:"8px 0",fontWeight:600}}>放開以加入此天 ✈️</div>}
                  <button style={{...btn("def",true),marginTop:10,fontSize:12}} onClick={()=>{setCtx({ds});setModal("add");}}>＋ 新增項目</button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {modal==="add"&&ctx&&<ItinItemModal title="新增行程" init={{}} onClose={()=>setModal(null)} onSave={item=>{addItem(ctx.ds,item);setModal(null);}}/>}
      {modal==="edit"&&ctx&&<ItinItemModal title="編輯行程" init={ctx.item} onClose={()=>setModal(null)} onSave={item=>{editItemData(ctx.ds,ctx.item.id,item);setModal(null);}}/>}
    </div>
  );
}

function ItinItemModal({title,init,onClose,onSave}) {
  const [f,setF]=useState({time:"",name:"",note:"",...init});
  return (
    <Modal title={title} onClose={onClose} width={400}>
      <Field label="時間（24小時制）"><input type="time" style={Sty.inp} value={f.time} onChange={e=>setF({...f,time:e.target.value})}/></Field>
      <Field label="名稱"><input style={Sty.inp} value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field>
      <Field label="備註"><input style={Sty.inp} value={f.note} onChange={e=>setF({...f,note:e.target.value})}/></Field>
      <ModalFooter onClose={onClose} onSave={()=>onSave(f)}/>
    </Modal>
  );
}

// ── Attractions ───────────────────────────────────────────────────────────────
function AttractionsTab({trip,upTrip}) {
  const [modal,setModal]=useState(null);
  const [editAttr,setEditAttr]=useState(null);
  const [batch,setBatch]=useState("");
  const [qing,setQing]=useState({});
  const [qAll,setQAll]=useState(false);
  const [expanded,setExpanded]=useState({});

  function addA(a){upTrip(t=>({...t,attractions:[...(t.attractions||[]),{id:uid(),...a}]}));}
  function upA(id,a){upTrip(t=>({...t,attractions:(t.attractions||[]).map(x=>x.id===id?{...x,...a}:x)}));}
  function delA(id){upTrip(t=>({...t,attractions:(t.attractions||[]).filter(x=>x.id!==id)}));}
  function togA(id){upTrip(t=>({...t,attractions:(t.attractions||[]).map(x=>x.id===id?{...x,visited:!x.visited}:x)}));}

  async function queryOne(id,name,local,mapsUrl,website) {
    setQing(q=>({...q,[id]:true}));
    const prompt="你是旅遊資訊助手。景點：「"+name+"」。Google Maps："+(mapsUrl||"無")+"，官網："+(website||"無")+"。根據知識（優先官網/Google Maps），回傳JSON：hours（營業時間24h制，純字串），price（"+local+"純數字，免費=0，不確定=null），mapsUrl（連結），website（官網或null），source（來源一句話）。只回JSON。";
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:500,messages:[{role:"user",content:prompt}]})});
      const d=await res.json();
      const txt=d.content&&d.content.find(c=>c.type==="text")?d.content.find(c=>c.type==="text").text:"{}";
      const info=JSON.parse(txt.replace(/```json|```/g,"").trim());
      upA(id,{hours:safeStr(info.hours),mapsUrl:safeStr(info.mapsUrl||mapsUrl),website:safeStr(info.website||website),source:safeStr(info.source),queryOk:true,manualPrice:false,price:(info.price!==undefined&&info.price!==null)?info.price:""});
    } catch { upA(id,{queryOk:false}); }
    setQing(q=>({...q,[id]:false}));
  }

  async function queryAll(){setQAll(true);for(const a of(trip.attractions||[]))await queryOne(a.id,a.name,trip.localCurrency,a.mapsUrl,a.website);setQAll(false);}

  function addBatch(){batch.split("\n").map(s=>s.trim()).filter(Boolean).forEach(name=>addA({name,hours:"",price:"",note:"",visited:false,queryOk:null,mapsUrl:"",website:""}));setBatch("");setModal(null);}

  const sorted=(trip.attractions||[]).slice().sort((a,b)=>safeStr(a.name).localeCompare(safeStr(b.name),"zh-TW",{sensitivity:"base"}));
  const allCollapsed=sorted.length>0&&sorted.every(a=>!expanded[a.id]);

  function toggleAll() {
    if (allCollapsed) setExpanded(Object.fromEntries(sorted.map(a=>[a.id,true])));
    else setExpanded({});
  }

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <button style={btn("pri")} onClick={()=>{setEditAttr(null);setModal("add");}}>＋ 新增景點</button>
        <button style={btn()} onClick={()=>setModal("batch")}>📋 批次新增</button>
        <button style={btn()} onClick={queryAll} disabled={qAll}>{qAll?"⏳ 查詢中...":"🔍 全部查詢"}</button>
        {sorted.length>0 && (
          <button style={{...btn("def",true),marginLeft:"auto"}} onClick={toggleAll}>
            {allCollapsed?"⊞ 展開全部":"⊟ 收合全部"}
          </button>
        )}
      </div>

      {sorted.length===0&&<p style={{color:C.mist,fontSize:14}}>尚無景點，新增後可拖曳至行程</p>}

      {sorted.map(a => {
        const isOpen=!!expanded[a.id];
        const ticketDate=a.ticketReminder&&typeof a.ticketReminder==="object"?a.ticketReminder.date:null;
        const hoursStr=safeStr(a.hours);
        const priceVal=(a.price!==undefined&&a.price!==null&&a.price!=="")?""+a.price:null;
        const noteStr=safeStr(a.note);
        const sourceStr=safeStr(a.source);
        return (
          <div key={a.id} draggable onDragStart={e=>e.dataTransfer.setData("attrId",a.id)} style={{...Sty.card,opacity:a.visited?0.65:1,cursor:"grab"}}>
            <div style={{padding:"12px 14px"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                <input type="checkbox" checked={!!a.visited} onChange={()=>togA(a.id)} style={{marginTop:3,flexShrink:0,accentColor:C.coral,width:16,height:16}}/>
                <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>setExpanded(p=>({...p,[a.id]:!p[a.id]}))}>
                  <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:6}}>
                    <span style={{fontFamily:F.display,fontSize:15,fontWeight:500,color:C.ink,textDecoration:a.visited?"line-through":"none"}}>{safeStr(a.name)}</span>
                    {a.queryOk===false&&<span style={{fontSize:11,color:C.danger}}>⚠️ 查無資料</span>}
                    {ticketDate&&<Bdg fc={C.violetDark} bg={C.violetLight} text={"🎫 "+ticketDate}/>}
                    <span style={{fontSize:11,color:C.mist,marginLeft:"auto"}}>{isOpen?"▾":"▸"}</span>
                  </div>
                  {isOpen && (
                    <div style={{marginTop:6}}>
                      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                        {hoursStr&&<span style={{fontSize:12,color:C.slate}}>🕐 {hoursStr}</span>}
                        {priceVal&&<span style={{fontSize:12,color:C.slate}}>💴 {priceVal} {trip.localCurrency||""}{a.manualPrice?" (手動)":""}</span>}
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
                        {a.mapsUrl&&<a href={a.mapsUrl} style={{fontSize:12,color:C.sky,fontWeight:600}} onClick={e=>e.stopPropagation()}>📍 地圖</a>}
                        {a.website&&<a href={a.website} style={{fontSize:12,color:C.sky,fontWeight:600}} onClick={e=>e.stopPropagation()}>🌐 官網</a>}
                      </div>
                      {sourceStr&&<div style={{fontSize:11,color:C.mist,marginTop:4}}>來源：{sourceStr}</div>}
                      {noteStr&&<div style={{fontSize:12,color:C.mist,marginTop:4}}>{noteStr}</div>}
                    </div>
                  )}
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0}}>
                  <button style={{...btn("def",true),padding:"4px 8px",fontSize:11}} disabled={!!qing[a.id]} onClick={()=>queryOne(a.id,a.name,trip.localCurrency,a.mapsUrl,a.website)}>{qing[a.id]?"⏳":"🔍"}</button>
                  <button style={{...btn("def",true),padding:"4px 8px",fontSize:11}} onClick={()=>{setEditAttr(a);setModal("edit");}}>✏️</button>
                  <button style={{...btn("dan",true),padding:"4px 8px",fontSize:11}} onClick={()=>delA(a.id)}>✕</button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {modal==="add"&&<AttrModal title="新增景點" init={{}} local={trip.localCurrency} onClose={()=>setModal(null)} onSave={a=>{addA(a);setModal(null);}}/>}
      {modal==="edit"&&editAttr&&<AttrModal title="編輯景點" init={editAttr} local={trip.localCurrency} onClose={()=>setModal(null)} onSave={a=>{upA(editAttr.id,a);setModal(null);}} onRequery={()=>queryOne(editAttr.id,editAttr.name,trip.localCurrency,editAttr.mapsUrl,editAttr.website)}/>}
      {modal==="batch"&&(
        <Modal title="批次新增景點" onClose={()=>setModal(null)} width={400}>
          <p style={{fontSize:13,color:C.mist,marginBottom:10}}>每行一個景點名稱</p>
          <textarea style={{...Sty.inp,height:140,resize:"vertical"}} value={batch} onChange={e=>setBatch(e.target.value)} placeholder={"淺草寺\n上野動物園\n秋葉原"}/>
          <ModalFooter onClose={()=>setModal(null)} onSave={addBatch} saveLabel="新增"/>
        </Modal>
      )}
    </div>
  );
}

function AttrModal({title,init,local,onClose,onSave,onRequery}) {
  const [f,setF]=useState({name:"",hours:"",price:"",note:"",mapsUrl:"",website:"",manualPrice:false,ticketReminder:null,...init});
  const [qing,setQing]=useState(false);
  const [showR,setShowR]=useState(!!(init&&init.ticketReminder));
  const [rem,setRem]=useState((init&&init.ticketReminder)||{date:"",time:"",tz:"Asia/Taipei"});

  async function requery() {
    setQing(true);
    const prompt="景點「"+f.name+"」，Google Maps："+(f.mapsUrl||"無")+"，官網："+(f.website||"無")+"。優先官網/Google Maps，JSON：hours（純字串），price（"+local+"純數字或null），source。只回JSON。";
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:400,messages:[{role:"user",content:prompt}]})});
      const d=await res.json();
      const txt=d.content&&d.content.find(c=>c.type==="text")?d.content.find(c=>c.type==="text").text:"{}";
      const info=JSON.parse(txt.replace(/```json|```/g,"").trim());
      setF(prev=>({...prev,hours:safeStr(info.hours)||prev.hours,source:safeStr(info.source||prev.source),...(!prev.manualPrice&&info.price!==undefined?{price:info.price}:{})}));
    } catch {}
    setQing(false);
  }

  return (
    <Modal title={title} onClose={onClose} width={480}>
      <Field label="景點名稱"><input style={Sty.inp} value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field>
      <Field label="營業時間（24小時制）"><input style={Sty.inp} value={f.hours} onChange={e=>setF({...f,hours:e.target.value})} placeholder="09:00-17:00"/></Field>
      <Field label={"成人票價（"+(local||"")+"）"}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input style={{...Sty.inp,flex:1}} value={String(f.price===null||f.price===undefined?"":f.price)} onChange={e=>setF({...f,price:e.target.value,manualPrice:true})} placeholder="0"/>
          {f.manualPrice&&<span style={{fontSize:11,color:C.mist,whiteSpace:"nowrap"}}>(手動)</span>}
        </div>
      </Field>
      <Field label="Google Maps 連結"><input style={Sty.inp} value={f.mapsUrl} onChange={e=>setF({...f,mapsUrl:e.target.value})} placeholder="https://maps.google.com/..."/></Field>
      <Field label="官方網站"><input style={Sty.inp} value={f.website} onChange={e=>setF({...f,website:e.target.value})} placeholder="https://..."/></Field>
      <Field label="備註"><input style={Sty.inp} value={f.note} onChange={e=>setF({...f,note:e.target.value})}/></Field>
      {f.source&&<div style={{fontSize:11,color:C.mist,marginBottom:12}}>資料來源：{safeStr(f.source)}</div>}
      <div style={{borderTop:"1px solid "+C.fog,paddingTop:14,marginBottom:8}}>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,fontWeight:600,cursor:"pointer",color:C.ink}}>
          <input type="checkbox" checked={showR} onChange={e=>setShowR(e.target.checked)} style={{accentColor:C.coral,width:16,height:16}}/>
          🎫 設定搶票提醒
        </label>
        {showR&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
            <Field label="提醒日期"><input type="date" style={Sty.inp} value={rem.date} onChange={e=>setRem({...rem,date:e.target.value})}/></Field>
            <Field label="提醒時間（24小時制）"><input type="time" style={Sty.inp} value={rem.time} onChange={e=>setRem({...rem,time:e.target.value})}/></Field>
            <Field label="時區" style={{gridColumn:"1/-1"}}><select style={Sty.inp} value={rem.tz} onChange={e=>setRem({...rem,tz:e.target.value})}>{TIMEZONES.map(z=><option key={z}>{z}</option>)}</select></Field>
          </div>
        )}
      </div>
      <ModalFooter onClose={onClose} onSave={()=>onSave({...f,ticketReminder:showR&&rem.date?rem:null})}
        extra={<button style={{...btn("def",true),fontSize:12}} disabled={qing} onClick={requery}>{qing?"⏳ 查詢中...":"🔍 重新查詢"}</button>}/>
    </Modal>
  );
}

// ── Accommodation & Transport ─────────────────────────────────────────────────
function AccomTransTab({trip,upTrip}) {
  const [modal,setModal]=useState(null);
  const [ctx,setCtx]=useState(null);

  function autoExp(t2,type,id,amount,currency,date,note){const exps=(t2.expenses||[]).filter(e=>e.autoFrom!==type+id);if(amount)exps.push({id:uid(),amount,currency,category:type==="accom"?"住宿":"交通",date:date||"",note,autoFrom:type+id});return exps;}
  function addAccom(f){const id=uid();upTrip(t=>{const t2={...t,accommodations:[...(t.accommodations||[]),{id,...f}]};t2.expenses=autoExp(t2,"accom",id,f.amount,f.currency||t.currency,f.checkIn,f.name);return t2;});}
  function upAccom(id,f){upTrip(t=>{const t2={...t,accommodations:(t.accommodations||[]).map(x=>x.id===id?{...x,...f}:x)};t2.expenses=autoExp(t2,"accom",id,f.amount,f.currency||t.currency,f.checkIn,f.name);return t2;});}
  function delAccom(id){upTrip(t=>({...t,accommodations:(t.accommodations||[]).filter(x=>x.id!==id),expenses:(t.expenses||[]).filter(e=>e.autoFrom!=="accom"+id)}));}
  function addTrans(f){const id=uid();upTrip(t=>{const t2={...t,transports:[...(t.transports||[]),{id,...f}]};t2.expenses=autoExp(t2,"trans",id,f.amount,f.currency||t.currency,f.date,f.type+" "+f.from+"→"+f.to);return t2;});}
  function upTrans(id,f){upTrip(t=>{const t2={...t,transports:(t.transports||[]).map(x=>x.id===id?{...x,...f}:x)};t2.expenses=autoExp(t2,"trans",id,f.amount,f.currency||t.currency,f.date,f.type+" "+f.from+"→"+f.to);return t2;});}
  function delTrans(id){upTrip(t=>({...t,transports:(t.transports||[]).filter(x=>x.id!==id),expenses:(t.expenses||[]).filter(e=>e.autoFrom!=="trans"+id)}));}

  function CancelTag({ds}) {
    const n=cancelLeft(ds); if(n===null)return null;
    const[bg,fc]=n<=3?[C.dangerLight,C.dangerDark]:n<=7?[C.sunLight,C.sunDark]:[C.tealLight,C.tealDark];
    return <Bdg fc={fc} bg={bg} text={"取消截止 "+(n===0?"今天":n===1?"明天":n+"天後")}/>;
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontFamily:F.display,fontSize:16,fontWeight:500,color:C.ink}}>🏨 住宿</div>
        <button style={btn("pri",true)} onClick={()=>{setCtx({type:"accom"});setModal("add");}}>＋ 新增住宿</button>
      </div>
      {(trip.accommodations||[]).length===0&&<p style={{fontSize:13,color:C.mist,marginBottom:16}}>尚無住宿</p>}
      {(trip.accommodations||[]).map(a=>(
        <div key={a.id} style={Sty.card}>
          <div style={{padding:"12px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontFamily:F.display,fontSize:15,fontWeight:500,color:C.ink}}>{safeStr(a.name)}</div>
                <div style={{fontSize:12,color:C.mist,marginTop:2}}>{a.platform}</div>
                <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap",alignItems:"center"}}>
                  {!a.amount&&<Bdg fc={C.dangerDark} bg={C.dangerLight} text="待訂"/>}
                  {a.amount&&a.freeCancel&&<Bdg fc={C.tealDark} bg={C.tealLight} text="✓ 可免費取消"/>}
                  <CancelTag ds={a.freeCancel}/>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button style={{...btn("def",true),padding:"4px 10px",fontSize:11}} onClick={()=>{setCtx({type:"accom",item:a});setModal("edit");}}>✏️</button>
                <button style={{...btn("dan",true),padding:"4px 10px",fontSize:11}} onClick={()=>delAccom(a.id)}>✕</button>
              </div>
            </div>
            <div style={{fontSize:12,color:C.slate,marginTop:8,display:"flex",gap:12,flexWrap:"wrap"}}>
              {a.checkIn&&<span>入住 {a.checkIn} {a.checkInTime}</span>}
              {a.checkOut&&<span>退房 {a.checkOut} {a.checkOutTime}</span>}
              {a.amount&&<span style={{fontWeight:600,color:a.freeCancel?C.tealDark:C.ink}}>{Number(a.amount).toLocaleString()} {a.currency}</span>}
            </div>
            {a.orderId&&<div style={{fontSize:11,color:C.mist,marginTop:4}}>訂單：{a.orderId}</div>}
            {a.note&&<div style={{fontSize:12,color:C.mist,marginTop:4}}>{safeStr(a.note)}</div>}
          </div>
        </div>
      ))}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"20px 0 12px"}}>
        <div style={{fontFamily:F.display,fontSize:16,fontWeight:500,color:C.ink}}>🚆 交通</div>
        <button style={btn("pri",true)} onClick={()=>{setCtx({type:"trans"});setModal("add");}}>＋ 新增交通</button>
      </div>
      {(trip.transports||[]).length===0&&<p style={{fontSize:13,color:C.mist}}>尚無交通</p>}
      {(trip.transports||[]).map(tr=>(
        <div key={tr.id} style={Sty.card}>
          <div style={{padding:"12px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontFamily:F.display,fontSize:15,fontWeight:500,color:C.ink}}>{safeStr(tr.type)} · {safeStr(tr.from)} → {safeStr(tr.to)}</div>
                <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap",alignItems:"center"}}>
                  {!tr.amount&&<Bdg fc={C.dangerDark} bg={C.dangerLight} text="待訂"/>}
                  {tr.amount&&tr.freeCancel&&<Bdg fc={C.tealDark} bg={C.tealLight} text="✓ 可免費取消"/>}
                  <CancelTag ds={tr.freeCancel}/>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button style={{...btn("def",true),padding:"4px 10px",fontSize:11}} onClick={()=>{setCtx({type:"trans",item:tr});setModal("edit");}}>✏️</button>
                <button style={{...btn("dan",true),padding:"4px 10px",fontSize:11}} onClick={()=>delTrans(tr.id)}>✕</button>
              </div>
            </div>
            <div style={{fontSize:12,color:C.slate,marginTop:8,display:"flex",gap:12,flexWrap:"wrap"}}>
              {tr.date&&<span>{tr.date}</span>}
              {tr.depTime&&<span>{tr.depTime}→{tr.arrTime||""}</span>}
              {tr.amount&&<span style={{fontWeight:600}}>{Number(tr.amount).toLocaleString()} {tr.currency}</span>}
            </div>
            {tr.orderId&&<div style={{fontSize:11,color:C.mist,marginTop:4}}>訂單：{tr.orderId}</div>}
            {tr.note&&<div style={{fontSize:12,color:C.mist,marginTop:4}}>{safeStr(tr.note)}</div>}
          </div>
        </div>
      ))}

      {modal==="add"&&ctx&&ctx.type==="accom"&&<AccomModal title="新增住宿" init={{platform:"Booking.com",currency:trip.currency||"TWD"}} onClose={()=>setModal(null)} onSave={f=>{addAccom(f);setModal(null);}}/>}
      {modal==="edit"&&ctx&&ctx.type==="accom"&&<AccomModal title="編輯住宿" init={ctx.item} onClose={()=>setModal(null)} onSave={f=>{upAccom(ctx.item.id,f);setModal(null);}}/>}
      {modal==="add"&&ctx&&ctx.type==="trans"&&<TransModal title="新增交通" init={{type:"機票",currency:trip.currency||"TWD"}} onClose={()=>setModal(null)} onSave={f=>{addTrans(f);setModal(null);}}/>}
      {modal==="edit"&&ctx&&ctx.type==="trans"&&<TransModal title="編輯交通" init={ctx.item} onClose={()=>setModal(null)} onSave={f=>{upTrans(ctx.item.id,f);setModal(null);}}/>}
    </div>
  );
}

function AccomModal({title,init,onClose,onSave}) {
  const [f,setF]=useState({name:"",platform:"Booking.com",checkIn:"",checkInTime:"14:00",checkOut:"",checkOutTime:"11:00",freeCancel:"",amount:"",currency:"TWD",orderId:"",note:"",...init});
  return (
    <Modal title={title} onClose={onClose}>
      <Field label="名稱"><input style={Sty.inp} value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field>
      <Field label="訂房平台"><select style={Sty.inp} value={f.platform} onChange={e=>setF({...f,platform:e.target.value})}>{ACC_PLAT.map(p=><option key={p}>{p}</option>)}</select></Field>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Field label="入住日期"><input type="date" style={Sty.inp} value={f.checkIn} onChange={e=>setF({...f,checkIn:e.target.value})}/></Field>
        <Field label="Check-in 時間"><input type="time" style={Sty.inp} value={f.checkInTime} onChange={e=>setF({...f,checkInTime:e.target.value})}/></Field>
        <Field label="退房日期"><input type="date" style={Sty.inp} value={f.checkOut} onChange={e=>setF({...f,checkOut:e.target.value})}/></Field>
        <Field label="Check-out 時間"><input type="time" style={Sty.inp} value={f.checkOutTime} onChange={e=>setF({...f,checkOutTime:e.target.value})}/></Field>
      </div>
      <Field label="免費取消截止日"><input type="date" style={Sty.inp} value={f.freeCancel} onChange={e=>setF({...f,freeCancel:e.target.value})}/></Field>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
        <Field label="金額（留空=待訂）"><input style={Sty.inp} value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/></Field>
        <Field label="幣別"><select style={Sty.inp} value={f.currency} onChange={e=>setF({...f,currency:e.target.value})}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></Field>
      </div>
      <Field label="訂單編號"><input style={Sty.inp} value={f.orderId} onChange={e=>setF({...f,orderId:e.target.value})}/></Field>
      <Field label="備註"><input style={Sty.inp} value={f.note} onChange={e=>setF({...f,note:e.target.value})}/></Field>
      <ModalFooter onClose={onClose} onSave={()=>onSave(f)}/>
    </Modal>
  );
}

function TransModal({title,init,onClose,onSave}) {
  const [f,setF]=useState({type:"機票",from:"",to:"",date:"",depTime:"",arrTime:"",freeCancel:"",amount:"",currency:"TWD",orderId:"",note:"",...init});
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        <Field label="類型"><select style={Sty.inp} value={f.type} onChange={e=>setF({...f,type:e.target.value})}>{TRANS_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
        <Field label="出發地"><input style={Sty.inp} value={f.from} onChange={e=>setF({...f,from:e.target.value})}/></Field>
        <Field label="目的地"><input style={Sty.inp} value={f.to} onChange={e=>setF({...f,to:e.target.value})}/></Field>
        <Field label="日期"><input type="date" style={Sty.inp} value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></Field>
        <Field label="出發時間"><input type="time" style={Sty.inp} value={f.depTime} onChange={e=>setF({...f,depTime:e.target.value})}/></Field>
        <Field label="抵達時間"><input type="time" style={Sty.inp} value={f.arrTime} onChange={e=>setF({...f,arrTime:e.target.value})}/></Field>
      </div>
      <Field label="免費取消截止日"><input type="date" style={Sty.inp} value={f.freeCancel} onChange={e=>setF({...f,freeCancel:e.target.value})}/></Field>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
        <Field label="金額（留空=待訂）"><input style={Sty.inp} value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/></Field>
        <Field label="幣別"><select style={Sty.inp} value={f.currency} onChange={e=>setF({...f,currency:e.target.value})}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></Field>
      </div>
      <Field label="訂單編號"><input style={Sty.inp} value={f.orderId} onChange={e=>setF({...f,orderId:e.target.value})}/></Field>
      <Field label="備註"><input style={Sty.inp} value={f.note} onChange={e=>setF({...f,note:e.target.value})}/></Field>
      <ModalFooter onClose={onClose} onSave={()=>onSave(f)}/>
    </Modal>
  );
}

// ── Expenses ──────────────────────────────────────────────────────────────────
function ExpensesTab({trip,upTrip}) {
  const [modal,setModal]=useState(null);
  const [editExp,setEditExp]=useState(null);
  const [view,setView]=useState("list");

  function addE(e){upTrip(t=>({...t,expenses:[...(t.expenses||[]),{id:uid(),...e}]}));}
  function upE(id,e){upTrip(t=>({...t,expenses:(t.expenses||[]).map(x=>x.id===id?{...x,...e}:x)}));}
  function delE(id){upTrip(t=>({...t,expenses:(t.expenses||[]).filter(x=>x.id!==id)}));}

  const exps=trip.expenses||[];
  const curs=[...new Set(exps.map(e=>e.currency))];
  function getTot(cur,cat){return exps.filter(e=>e.currency===cur&&(!cat||e.category===cat)).reduce((s,e)=>s+(parseFloat(e.amount)||0),0);}

  const tdS={padding:"8px 12px",border:"1px solid "+C.cloud,fontSize:13,textAlign:"right"};
  const thS={...tdS,background:C.fog,fontWeight:700,textAlign:"center",color:C.slate,fontSize:11,textTransform:"uppercase",letterSpacing:"0.05em"};

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
        <button style={btn("pri")} onClick={()=>{setEditExp(null);setModal("add");}}>＋ 新增支出</button>
        <div style={{marginLeft:"auto",display:"flex",gap:4,background:C.fog,borderRadius:10,padding:4}}>
          <button style={{padding:"5px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:view==="list"?C.white:"transparent",color:view==="list"?C.coral:C.mist,fontFamily:F.body}} onClick={()=>setView("list")}>清單</button>
          <button style={{padding:"5px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:view==="table"?C.white:"transparent",color:view==="table"?C.coral:C.mist,fontFamily:F.body}} onClick={()=>setView("table")}>統計表</button>
        </div>
      </div>
      {view==="table" && (
        <div style={{overflowX:"auto",marginBottom:16}}>
          <table style={{borderCollapse:"collapse",width:"100%",minWidth:400,background:C.white,borderRadius:14,overflow:"hidden"}}>
            <thead><tr><th style={{...thS,textAlign:"left"}}>幣別</th>{EXP_CATS.map(c=><th key={c} style={thS}>{c}</th>)}<th style={{...thS,background:C.violetLight,color:C.violetDark}}>總和</th></tr></thead>
            <tbody>
              {curs.length===0&&<tr><td colSpan={EXP_CATS.length+2} style={{...tdS,textAlign:"center",color:C.mist}}>尚無支出</td></tr>}
              {curs.map(cur=>(
                <tr key={cur}>
                  <td style={{...tdS,textAlign:"left",fontWeight:700,color:C.ink}}>{cur}</td>
                  {EXP_CATS.map(cat=>{const v=getTot(cur,cat);return <td key={cat} style={{...tdS,color:v>0?C.ink:C.cloud}}>{v>0?v.toLocaleString():"—"}</td>;})}
                  <td style={{...tdS,background:C.violetLight,fontWeight:700,color:C.violetDark}}>{getTot(cur).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {view==="list" && (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {exps.length===0&&<p style={{color:C.mist,fontSize:14}}>尚無支出</p>}
          {exps.slice().reverse().map(e=>(
            <div key={e.id} style={{...Sty.card,marginBottom:0}}>
              <div style={{padding:"12px 14px",display:"flex",alignItems:"flex-start",gap:10}}>
                {e.imageData&&<img src={e.imageData} alt="" style={{width:52,height:52,objectFit:"cover",borderRadius:10,flexShrink:0}}/>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontFamily:F.display,fontSize:16,fontWeight:500,color:C.ink}}>{Number(e.amount).toLocaleString()} {e.currency}</span>
                    <Bdg fc={C.slate} bg={C.fog} text={e.category}/>
                    {e.autoFrom&&<Bdg fc={C.mist} bg={C.fog} text="自動"/>}
                  </div>
                  <div style={{fontSize:12,color:C.mist,marginTop:4}}>{e.date}{e.note?" · "+safeStr(e.note):""}</div>
                  {e.files&&e.files.length>0&&<div style={{fontSize:11,color:C.sky,marginTop:3}}>📎 {e.files.map(f=>f.name).join(", ")}</div>}
                </div>
                {!e.autoFrom&&(
                  <div style={{display:"flex",gap:6}}>
                    <button style={{...btn("def",true),padding:"4px 10px",fontSize:11}} onClick={()=>{setEditExp(e);setModal("edit");}}>✏️</button>
                    <button style={{...btn("dan",true),padding:"4px 10px",fontSize:11}} onClick={()=>delE(e.id)}>✕</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {modal==="add"&&<ExpModal title="新增支出" init={{currency:trip.currency||"TWD"}} onClose={()=>setModal(null)} onSave={e=>{addE(e);setModal(null);}}/>}
      {modal==="edit"&&editExp&&<ExpModal title="編輯支出" init={editExp} onClose={()=>setModal(null)} onSave={e=>{upE(editExp.id,e);setModal(null);}}/>}
    </div>
  );
}

function ExpModal({title,init,onClose,onSave}) {
  const [f,setF]=useState({amount:"",currency:"TWD",category:"餐飲",date:today(),note:"",imageData:null,files:[],...init});
  const fileRef=useRef(); const camRef=useRef();
  function onFile(e){const file=e.target.files&&e.target.files[0];if(!file)return;if(file.type.startsWith("image/")){const r=new FileReader();r.onload=ev=>setF(p=>({...p,imageData:ev.target.result}));r.readAsDataURL(file);}else{setF(p=>({...p,files:[...(p.files||[]),{name:file.name}]}));}e.target.value="";}
  function onCam(e){const file=e.target.files&&e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>setF(p=>({...p,imageData:ev.target.result}));r.readAsDataURL(file);e.target.value="";}
  return (
    <Modal title={title} onClose={onClose} width={420}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
        <Field label="金額"><input style={Sty.inp} value={f.amount} onChange={e=>setF({...f,amount:e.target.value})}/></Field>
        <Field label="幣別"><select style={Sty.inp} value={f.currency} onChange={e=>setF({...f,currency:e.target.value})}>{CURRENCIES.map(c=><option key={c}>{c}</option>)}</select></Field>
      </div>
      <Field label="分類"><select style={Sty.inp} value={f.category} onChange={e=>setF({...f,category:e.target.value})}>{EXP_CATS.map(c=><option key={c}>{c}</option>)}</select></Field>
      <Field label="日期"><input type="date" style={Sty.inp} value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></Field>
      <Field label="備註"><input style={Sty.inp} value={f.note} onChange={e=>setF({...f,note:e.target.value})}/></Field>
      <div style={{border:"1px solid "+C.cloud,borderRadius:12,padding:"12px 14px",marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:600,color:C.slate,marginBottom:10}}>附件 / 照片</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button style={btn("def",true)} onClick={()=>{fileRef.current.removeAttribute("accept");fileRef.current.click();}}>📎 選取檔案</button>
          <button style={btn("def",true)} onClick={()=>{fileRef.current.setAttribute("accept","image/*");fileRef.current.click();}}>🖼️ 照片</button>
          <button style={btn("def",true)} onClick={()=>camRef.current.click()}>📷 相機</button>
        </div>
        <input ref={fileRef} type="file" style={{display:"none"}} onChange={onFile}/>
        <input ref={camRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={onCam}/>
        {f.imageData&&<div style={{marginTop:10,position:"relative",display:"inline-block"}}><img src={f.imageData} alt="" style={{maxWidth:"100%",maxHeight:120,borderRadius:10,objectFit:"cover"}}/><button onClick={()=>setF({...f,imageData:null})} style={{position:"absolute",top:4,right:4,background:"rgba(26,26,46,0.6)",color:C.white,border:"none",borderRadius:6,cursor:"pointer",padding:"2px 7px",fontSize:11}}>✕</button></div>}
        {(f.files||[]).length>0&&<div style={{marginTop:8}}>{f.files.map((fl,i)=><div key={i} style={{fontSize:12,color:C.slate,display:"flex",alignItems:"center",gap:6,marginTop:4}}>📄 {fl.name}<button onClick={()=>setF({...f,files:f.files.filter((_,j)=>j!==i)})} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",fontSize:12}}>✕</button></div>)}</div>}
      </div>
      <ModalFooter onClose={onClose} onSave={()=>onSave(f)}/>
    </Modal>
  );
}

// ── Luggage ───────────────────────────────────────────────────────────────────
function LuggageTab({trip,upTrip,tpls,setTpls}) {
  const [newItem,setNewItem]=useState(""); const [newTpl,setNewTpl]=useState(""); const [modal,setModal]=useState(null);
  const [dragIdx,setDragIdx]=useState(null); const [tplDragIdx,setTplDragIdx]=useState(null); const [dropOver,setDropOver]=useState(null);
  const items=trip.luggage||[]; const checked=items.filter(i=>i.checked).length; const pct=items.length?Math.round(checked/items.length*100):0;
  function tog(id){upTrip(t=>({...t,luggage:(t.luggage||[]).map(i=>i.id===id?{...i,checked:!i.checked}:i)}));}
  function addItem(){if(!newItem.trim())return;upTrip(t=>({...t,luggage:[...(t.luggage||[]),{id:uid(),name:newItem.trim(),checked:false}]}));setNewItem("");}
  function delItem(id){upTrip(t=>({...t,luggage:(t.luggage||[]).filter(i=>i.id!==id)}));}
  function onDragStart(i){setDragIdx(i);}
  function onDragOverItem(e,i){e.preventDefault();setDropOver({list:"lug",i});}
  function onDropItem(i){if(dragIdx===null)return;upTrip(t=>{const lug=[...(t.luggage||[])];const[m]=lug.splice(dragIdx,1);lug.splice(i,0,m);return{...t,luggage:lug};});setDragIdx(null);setDropOver(null);}
  function onTplDragStart(i){setTplDragIdx(i);}
  function onTplDragOver(e,i){e.preventDefault();setDropOver({list:"tpl",i});}
  function onTplDrop(i){if(tplDragIdx===null)return;const t=[...tpls];const[m]=t.splice(tplDragIdx,1);t.splice(i,0,m);setTpls(t);setTplDragIdx(null);setDropOver(null);}
  function onTplDragToTrip(e,name){e.dataTransfer.setData("tplName",name);}
  function onTripDrop(e){e.preventDefault();const name=e.dataTransfer.getData("tplName");if(name&&!items.find(i=>i.name===name))upTrip(t=>({...t,luggage:[...(t.luggage||[]),{id:uid(),name,checked:false}]}));setDropOver(null);}

  return (
    <div>
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8}}>
          <span style={{color:C.slate,fontWeight:600}}>打包進度</span>
          <span style={{fontWeight:700,color:pct===100?C.tealDark:C.coral}}>{checked} / {items.length} ({pct}%)</span>
        </div>
        <div style={{background:C.cloud,borderRadius:6,height:8,overflow:"hidden"}}>
          <div style={{background:"linear-gradient(90deg,"+C.coral+","+C.violet+")",height:8,width:pct+"%",borderRadius:6,transition:"width .4s"}}/>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <input style={{...Sty.inp,flex:1}} value={newItem} onChange={e=>setNewItem(e.target.value)} placeholder="新增行李項目" onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addItem();}}}/>
        <button style={btn("pri")} onClick={addItem}>新增</button>
        <button style={btn()} onClick={()=>setModal("tpl")}>📋 模板</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6,minHeight:40,padding:6,borderRadius:12,border:"1.5px dashed "+(dropOver&&dropOver.list==="trip"?C.coral:C.cloud),transition:"border .2s"}}
        onDragOver={e=>{e.preventDefault();setDropOver({list:"trip"});}} onDrop={onTripDrop} onDragLeave={()=>setDropOver(null)}>
        {items.length===0&&<p style={{color:C.mist,fontSize:13,textAlign:"center",margin:10}}>從模板拖曳或手動新增</p>}
        {items.map((item,i)=>(
          <div key={item.id} draggable onDragStart={()=>onDragStart(i)} onDragOver={e=>onDragOverItem(e,i)} onDrop={()=>onDropItem(i)} onDragEnd={()=>{setDragIdx(null);setDropOver(null);}}
            style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",border:"1.5px solid "+(dropOver&&dropOver.list==="lug"&&dropOver.i===i?C.coral:C.cloud),borderRadius:10,background:C.white,cursor:"grab",opacity:dragIdx===i?0.4:1}}>
            <span style={{color:C.cloud,fontSize:14,userSelect:"none"}}>⠿</span>
            <input type="checkbox" checked={!!item.checked} onChange={()=>tog(item.id)} style={{accentColor:C.coral,width:16,height:16}}/>
            <span style={{flex:1,fontSize:14,textDecoration:item.checked?"line-through":"none",color:item.checked?C.cloud:C.ink}}>{item.name}</span>
            <button style={{...btn("dan",true),padding:"3px 8px",fontSize:11}} onClick={()=>delItem(item.id)}>✕</button>
          </div>
        ))}
      </div>
      {modal==="tpl" && (
        <Modal title="行李模板管理" onClose={()=>setModal(null)}>
          <p style={{fontSize:12,color:C.mist,margin:"0 0 12px"}}>可拖曳排序，也可直接拖曳到行李清單新增</p>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <input style={{...Sty.inp,flex:1}} value={newTpl} onChange={e=>setNewTpl(e.target.value)} placeholder="新增模板項目" onKeyDown={e=>{if(e.key==="Enter"&&newTpl.trim()){setTpls([...tpls,newTpl.trim()]);setNewTpl("");}}}/>
            <button style={btn("pri",true)} onClick={()=>{if(newTpl.trim()){setTpls([...tpls,newTpl.trim()]);setNewTpl("");}}}>新增</button>
          </div>
          <div style={{maxHeight:320,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
            {tpls.map((name,i)=>(
              <div key={i} draggable onDragStart={e=>{onTplDragStart(i);onTplDragToTrip(e,name);}} onDragOver={e=>onTplDragOver(e,i)} onDrop={()=>onTplDrop(i)} onDragEnd={()=>{setTplDragIdx(null);setDropOver(null);}}
                style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",border:"1.5px solid "+(dropOver&&dropOver.list==="tpl"&&dropOver.i===i?C.coral:C.cloud),borderRadius:10,background:C.white,cursor:"grab",opacity:tplDragIdx===i?0.4:1}}>
                <span style={{color:C.cloud,fontSize:14}}>⠿</span>
                <span style={{flex:1,fontSize:13,color:C.ink}}>{name}</span>
                <button style={{...btn("dan",true),padding:"3px 8px",fontSize:11}} onClick={()=>setTpls(tpls.filter((_,j)=>j!==i))}>✕</button>
              </div>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:14}}>
            <button style={btn("def",true)} onClick={()=>setModal(null)}>關閉</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
