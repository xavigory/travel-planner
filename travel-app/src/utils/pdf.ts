import { Trip } from "../types";
import { getDays, safeStr, today } from "./helpers";

export function generatePDF(trip: Trip): void {
  const days = getDays(trip.startDate, trip.endDate);
  const exps = trip.expenses || [];
  const curs = [...new Set(exps.map(e => e.currency))];

  function getTot(cur: string, cat?: string): number {
    return exps
      .filter(e => e.currency === cur && (!cat || e.category === cat))
      .reduce((s, e) => s + (parseFloat(String(e.amount)) || 0), 0);
  }

  function autoItemsForDay(ds: string) {
    const items: any[] = [];
    (trip.accommodations || []).forEach(a => {
      if (a.checkIn === ds) {
        items.push({
          time: a.checkInTime || "14:00",
          name: "🏨 入住：" + safeStr(a.name),
        });
      }
      if (a.checkOut === ds) {
        items.push({
          time: a.checkOutTime || "11:00",
          name: "🏨 退房：" + safeStr(a.name),
        });
      }
    });
    (trip.transports || []).forEach(tr => {
      if (tr.date === ds) {
        const ic =
          tr.type === "機票"
            ? "✈"
            : tr.type === "火車"
            ? "🚆"
            : tr.type === "巴士"
            ? "🚌"
            : tr.type === "渡輪"
            ? "🚢"
            : "🚗";
        items.push({
          time: tr.depTime || "",
          name: ic + " " + safeStr(tr.from) + "→" + safeStr(tr.to),
        });
      }
    });
    return items;
  }

  const tripName =
    trip.name || (trip.startDate || "?") + " " + (trip.destination || "未命名");
  const EXP_CATS_LIST = ["餐飲", "交通", "住宿", "門票", "購物", "其他"];

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
  ${trip.startDate && trip.endDate ? trip.startDate + " ～ " + trip.endDate + "　·　" + days.length + "天" : ""}
  &nbsp;
  ${trip.currency ? '<span class="tag tag-v">' + trip.currency + "</span>" : ""}
  ${trip.localCurrency ? '<span class="tag tag-t">' + trip.localCurrency + "</span>" : ""}
</div>

${trip.memo ? `<h2>📋 備忘錄</h2><div class="memo-box">${trip.memo.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>` : ""}

<h2>🗓️ 行程</h2>
${days
  .map((ds, i) => {
    const autoItms = autoItemsForDay(ds);
    const userItms = (trip.itinerary || {})[ds] || [];
    const allItms = [...autoItms, ...userItms].sort(
      (a, b) => (a.time || "").localeCompare(b.time || "")
    );
    if (allItms.length === 0) {
      return `<div class="day-block"><div class="day-header">Day ${i + 1} · ${ds}</div><div class="day-body" style="padding:10px 14px;color:#8888AA;font-size:12px;">尚無行程</div></div>`;
    }
    return `<div class="day-block">
    <div class="day-header">Day ${i + 1} · ${ds}</div>
    <div class="day-body">
      ${allItms
        .map(item => {
          const isSpot = !!item.attrId;
          const attr = isSpot
            ? (trip.attractions || []).find(a => a.id === item.attrId)
            : null;
          const hours =
            item.overrideHours !== undefined
              ? item.overrideHours
              : safeStr(attr && attr.hours);
          const price =
            item.overridePrice !== undefined
              ? item.overridePrice
              : attr
              ? attr.price
              : "";
          const sub = [
            hours ? "🕐 " + hours : "",
            price !== undefined && price !== null && price !== ""
              ? "💴 " + String(price) + " " + (trip.localCurrency || "")
              : "",
            safeStr(item.note),
          ]
            .filter(Boolean)
            .join("　");
          return `<div class="item-row">
          <div class="item-time">${item.time || "--:--"}</div>
          <div class="item-name">
            ${isSpot ? '<span class="spot-tag">📍 </span>' : ""}${safeStr(item.name).replace(/</g, "&lt;")}
            ${sub ? `<div class="item-sub">${sub.replace(/</g, "&lt;")}</div>` : ""}
          </div>
        </div>`;
        })
        .join("")}
    </div>
  </div>`;
  })
  .join("")}

<h2>💰 記帳統計</h2>
${
  curs.length === 0
    ? '<p style="color:#8888AA">尚無支出記錄</p>'
    : `<table>
  <thead><tr><th style="text-align:left">幣別</th>${EXP_CATS_LIST.map(c => `<th>${c}</th>`).join("")}<th>總和</th></tr></thead>
  <tbody>
    ${curs
      .map(
        cur =>
          `<tr>
      <td class="cur">${cur}</td>
      ${EXP_CATS_LIST.map(cat => {
        const v = getTot(cur, cat);
        return `<td class="num">${v > 0 ? v.toLocaleString() : "—"}</td>`;
      }).join("")}
      <td class="total">${getTot(cur).toLocaleString()}</td>
    </tr>`
      )
      .join("")}
  </tbody>
</table>
<h3>明細</h3>
<table>
  <thead><tr><th style="text-align:left">日期</th><th style="text-align:left">分類</th><th style="text-align:left">備註</th><th>金額</th><th style="text-align:left">幣別</th></tr></thead>
  <tbody>
    ${exps
      .slice()
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .map(
        e =>
          `<tr>
      <td>${e.date || ""}</td><td>${e.category}</td><td>${safeStr(e.note).replace(/</g, "&lt;")}</td>
      <td class="num">${Number(e.amount).toLocaleString()}</td><td>${e.currency}</td>
    </tr>`
      )
      .join("")}
  </tbody>
</table>`
}

<div class="footer">由 Wanderlust 旅行規劃 App 匯出　·　${today()}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    tripName.replace(/[\/\\:*?"<>|]/g, "_") + ".html";
  a.click();
  URL.revokeObjectURL(url);
}
