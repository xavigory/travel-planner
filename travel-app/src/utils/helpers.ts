export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function safeStr(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    return Object.entries(v)
      .map(([k, val]) => `${k}: ${val}`)
      .join("、");
  }
  return String(v);
}

export function getDays(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate) return [];
  const days: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  let current = new Date(start);
  while (current <= end) {
    days.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function cancelLeft(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr + "T00:00:00");
  return Math.round((targetDate.getTime() - today.getTime()) / 86400000);
}

export function sanitizeAttr(a: any): any {
  return {
    ...a,
    hours: safeStr(a.hours),
    price: a.price !== undefined && a.price !== null ? a.price : "",
    mapsUrl: safeStr(a.mapsUrl),
    website: safeStr(a.website),
    source: safeStr(a.source),
    name: safeStr(a.name),
    note: safeStr(a.note),
  };
}

export function sanitizeData(d: any): any {
  if (!d) return null;
  return {
    ...d,
    trips: (d.trips || []).map((t: any) => ({
      ...t,
      attractions: (t.attractions || []).map(sanitizeAttr),
    })),
  };
}
