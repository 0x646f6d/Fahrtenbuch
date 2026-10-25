import type { LogEntry, Trip } from '../db/db';
import { describeData, entryLabel } from '../entries/entryTypes';
import { formatCourse, formatDuration, formatPosition, formatSpeed } from '../gps/nav';
import { fmtDate, fmtDateTime, fmtTime } from './format';

/** Standard PDF fonts only cover WinAnsi – replace characters outside it. */
const pdfSafe = (s: string) => s.replace(/′/g, "'").replace(/–/g, '-');

export async function tripToPdf(trip: Trip, entries: LogEntry[], boatName: string): Promise<Blob> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(18);
  doc.text(pdfSafe(`Fahrtenbuch${boatName ? ' – ' + boatName : ''}`), 14, 16);
  doc.setFontSize(11);
  const end = trip.endedAt ?? Date.now();
  const meta = [
    `Fahrt: ${trip.name}`,
    `Beginn: ${fmtDateTime(trip.startedAt)}   Ende: ${trip.endedAt ? fmtDateTime(trip.endedAt) : 'laufend'}`,
    `Dauer: ${formatDuration(end - trip.startedAt)}   Distanz: ${trip.distanceNm.toFixed(1)} sm   Einträge: ${entries.length}`,
  ];
  meta.forEach((line, i) => doc.text(pdfSafe(line), 14, 24 + i * 6));

  const sorted = [...entries].sort((a, b) => a.ts - b.ts);
  autoTable(doc, {
    startY: 44,
    head: [['Datum', 'Zeit', 'Ereignis', 'Position', 'Kurs', 'Fahrt', 'Details / Bemerkung']],
    body: sorted.map((e) => [
      fmtDate(e.ts),
      fmtTime(e.ts),
      entryLabel(e.type),
      formatPosition(e.lat, e.lon),
      formatCourse(e.cog),
      formatSpeed(e.sog),
      [describeData(e.type, e.data), e.note].filter(Boolean).join(' – '),
    ].map(pdfSafe)),
    styles: { fontSize: 9, cellPadding: 1.5 },
    headStyles: { fillColor: [11, 37, 69] },
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 14 }, 2: { cellWidth: 32 }, 3: { cellWidth: 52 }, 4: { cellWidth: 14 }, 5: { cellWidth: 16 } },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(`Seite ${page}`, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    },
  });
  return doc.output('blob');
}
