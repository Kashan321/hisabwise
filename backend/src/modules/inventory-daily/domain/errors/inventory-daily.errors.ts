export class InventoryDailySessionNotFoundError extends Error {
  constructor(message = 'Daily inventory session not found') {
    super(message);
    this.name = 'InventoryDailySessionNotFoundError';
  }
}

export class InventoryDailySessionAlreadyOpenError extends Error {
  constructor(message = 'A daily inventory session is already open') {
    super(message);
    this.name = 'InventoryDailySessionAlreadyOpenError';
  }
}

export class InventoryDailySessionClosedError extends Error {
  constructor(message = 'Daily inventory session is closed') {
    super(message);
    this.name = 'InventoryDailySessionClosedError';
  }
}
