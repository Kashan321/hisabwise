export type WaiterAssignmentInput = {
  waiterId?: string | null;
  waiterName?: string | null;
};

export type ResolvedWaiterAssignment = {
  waiterId: string | null;
  customWaiterName: string | null;
};

export type ResolveWaiterAssignmentOptions = {
  /** When no waiter is specified, link this staff user (e.g. order puncher). */
  defaultStaffId?: string | null;
};

/** Staff link takes precedence over free-text name. */
export function resolveWaiterAssignment(
  input: WaiterAssignmentInput,
  options?: ResolveWaiterAssignmentOptions,
): ResolvedWaiterAssignment {
  const id =
    input.waiterId === null || input.waiterId === undefined || input.waiterId === ''
      ? null
      : String(input.waiterId).trim();
  const name =
    input.waiterName === null || input.waiterName === undefined || input.waiterName === ''
      ? null
      : String(input.waiterName).trim();

  if (id) {
    return { waiterId: id, customWaiterName: null };
  }
  if (name) {
    return { waiterId: null, customWaiterName: name.slice(0, 120) };
  }

  const fallbackId = options?.defaultStaffId?.trim();
  if (fallbackId) {
    return { waiterId: fallbackId, customWaiterName: null };
  }

  return { waiterId: null, customWaiterName: null };
}
