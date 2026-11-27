import test from 'node:test';
import assert from 'node:assert/strict';
import { getDashboardWeek } from '../src/services/dashboardWeek.js';

const session = (date, durationSeconds) => ({ startedAt: date, durationSeconds });
test('dashboard groups real focus sessions by local Monday–Sunday dates, sums repeats and scales to peak', () => {
  const result = getDashboardWeek([
    session('2026-11-23T10:00:00', 3600), session('2026-11-23T15:00:00', 1800),
    session('2026-11-27T09:00:00', 25320), session('2026-11-22T12:00:00', 3600),
    session('2026-11-30T12:00:00', 3600), session('invalid', 3600),
    session('2026-11-25T09:00:00', -500),
  ], new Date(2026, 10, 27, 12));
  assert.equal(result.days[0].key, '2026-11-23');
  assert.equal(result.days[6].key, '2026-11-29');
  assert.deepEqual(result.days.map(d => d.seconds), [5400, 0, 0, 0, 25320, 0, 0]);
  assert.equal(result.axisHours, 8);
});
test('empty weeks and year boundaries have seven zero-focus days and a finite scale', () => {
  const result = getDashboardWeek([], new Date(2027, 0, 1, 12));
  assert.equal(result.days[0].key, '2026-12-28');
  assert.equal(result.days[6].key, '2027-01-03');
  assert.equal(result.days.every(d => d.seconds === 0), true);
  assert.equal(result.axisHours, 2);
});
