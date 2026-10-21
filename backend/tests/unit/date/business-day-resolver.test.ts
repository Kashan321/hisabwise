import {
  formatBusinessDateSuffix,
  resolveBusinessDateKey,
} from '../../../src/shared/date/business-day-resolver';

describe('resolveBusinessDateKey', () => {
  it('uses same calendar date when after business day start', () => {
    const key = resolveBusinessDateKey(
      new Date('2026-09-24T18:00:00+05:00'),
      '17:00',
      'Asia/Karachi',
    );
    expect(key).toBe('2026-09-24');
  });

  it('uses previous calendar date before business day start', () => {
    const key = resolveBusinessDateKey(
      new Date('2026-09-25T01:30:00+05:00'),
      '17:00',
      'Asia/Karachi',
    );
    expect(key).toBe('2026-09-24');
  });

  it('formats business date suffix for ticket prefix', () => {
    expect(formatBusinessDateSuffix('2026-09-24')).toBe('260924');
  });
});
