import { describe, expect, it } from 'vitest';
import { resolveWaiterAssignment } from '../../../src/modules/orders/domain/waiter-assignment';

describe('resolveWaiterAssignment', () => {
  it('prefers staff id over free-text name', () => {
    expect(
      resolveWaiterAssignment({
        waiterId: '11111111-1111-4111-8111-111111111111',
        waiterName: 'Ali',
      }),
    ).toEqual({
      waiterId: '11111111-1111-4111-8111-111111111111',
      customWaiterName: null,
    });
  });

  it('stores trimmed custom name when no staff id', () => {
    expect(resolveWaiterAssignment({ waiterName: '  Guest waiter  ' })).toEqual({
      waiterId: null,
      customWaiterName: 'Guest waiter',
    });
  });

  it('clears both when empty and no default', () => {
    expect(resolveWaiterAssignment({ waiterId: null, waiterName: null })).toEqual({
      waiterId: null,
      customWaiterName: null,
    });
  });

  it('uses default staff when nothing specified', () => {
    const staffId = '22222222-2222-4222-8222-222222222222';
    expect(
      resolveWaiterAssignment(
        { waiterId: null, waiterName: null },
        { defaultStaffId: staffId },
      ),
    ).toEqual({
      waiterId: staffId,
      customWaiterName: null,
    });
  });
});
