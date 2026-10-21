export const AUTH = {
  ACCESS_TOKEN_TTL_SECONDS: 7 * 24 * 60 * 60,
  REFRESH_TOKEN_TTL_SECONDS: 7 * 24 * 60 * 60,
  REFRESH_COOKIE_NAME: 'refresh_token',
  BCRYPT_NOT_USED: true,
} as const;

export const PASSWORD = {
  MIN_LENGTH: 8,
} as const;

export const ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  CHEF: 'chef',
  WAITER: 'waiter',
  RIDER: 'rider',
} as const;

export type SystemRole = (typeof ROLES)[keyof typeof ROLES];

export const ORDER = {
  DEFAULT_TAX_RATE: 0,
  DEFAULT_SERVICE_RATE: 0,
  DEFAULT_DELIVERY_CHARGE: 0,
} as const;

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ['PREPARING', 'READY', 'CANCELLED'],
  PREPARING: ['RECEIVED', 'READY', 'CANCELLED'],
  READY: ['RECEIVED', 'PREPARING', 'COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const DELIVERY_STATUS_TRANSITIONS: Record<string, string[]> = {
  ASSIGNED: ['PICKED_UP'],
  PICKED_UP: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
};

export const RESERVATION = {
  DEFAULT_DURATION_MINUTES: 120,
} as const;

export const RESERVATION_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SEATED', 'CANCELLED', 'NO_SHOW'],
  SEATED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export const LOYALTY = {
  POINTS_PER_DOLLAR: 1,
} as const;
