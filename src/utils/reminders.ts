import { Trip, Reminder } from '../types';
import { safeStr, cancelLeft } from './helpers';

export function collectReminders(trips: Trip[]): Reminder[] {
  const rem: Reminder[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  trips.forEach(trip => {
    const tname = trip.name || (trip.startDate || '?') + ' ' + (trip.destination || '未命名');

    (trip.attractions || []).forEach(a => {
      const tr = a.ticketReminder;
      if (tr && tr.date) {
        const diff = Math.round((new Date(tr.date + 'T00:00:00').getTime() - now.getTime()) / 86400000);
        if (diff < 0) return;
        rem.push({
          type: 'ticket',
          tripName: tname,
          label: '搶票提醒：' + safeStr(a.name),
          date: tr.date,
          time: tr.time || '',
          tz: tr.tz || '',
          diff,
          tripId: trip.id,
        });
      }
    });

    (trip.accommodations || []).forEach(a => {
      if (a.freeCancel) {
        const diff = cancelLeft(a.freeCancel);
        if (diff !== null && diff >= 0 && diff <= 14) {
          rem.push({
            type: 'cancel',
            tripName: tname,
            label: '免費取消截止：' + safeStr(a.name),
            date: a.freeCancel,
            diff,
            tripId: trip.id,
          });
        }
      }
    });

    (trip.transports || []).forEach(tr => {
      if (tr.freeCancel) {
        const diff = cancelLeft(tr.freeCancel);
        if (diff !== null && diff >= 0 && diff <= 14) {
          rem.push({
            type: 'cancel',
            tripName: tname,
            label: '免費取消截止：' + safeStr(tr.type) + ' ' + safeStr(tr.from) + '→' + safeStr(tr.to),
            date: tr.freeCancel,
            diff,
            tripId: trip.id,
          });
        }
      }
    });
  });

  rem.sort((a, b) => a.diff - b.diff);
  return rem;
}
