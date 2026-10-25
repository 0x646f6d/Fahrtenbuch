export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
}

export function fmtDateTime(ts: number): string {
  return `${fmtDate(ts)} ${fmtTime(ts)}`;
}
