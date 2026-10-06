/**
 * Standardized Query Key Factory for TanStack Query v5.
 * Enables targeted query cache invalidation without global refetches.
 */

export const queryKeys = {
  auth: {
    adminStatus: (userId: string | undefined) => ['auth', 'admin', userId] as const,
    mfaLevel: () => ['auth', 'mfa-level'] as const,
    factors: () => ['auth', 'factors'] as const,
  },
  settings: {
    all: ['business_settings'] as const,
  },
  dashboard: {
    stats: (from: string, to: string) => ['dashboard', 'stats', from, to] as const,
    bookingsByDay: (from: string, to: string) => ['dashboard', 'bookings-by-day', from, to] as const,
    expiringHolds: () => ['dashboard', 'expiring-holds'] as const,
    todayBookings: (todayStartUtc: string, todayEndUtc: string) =>
      ['dashboard', 'today-bookings', todayStartUtc, todayEndUtc] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    list: (filters: {
      page: number;
      pageSize: number;
      status?: string[];
      from?: string;
      to?: string;
      serviceId?: string;
      resourceId?: string;
      searchReference?: string;
      searchContact?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }) => ['bookings', 'list', filters] as const,
    detail: (id: string) => ['bookings', 'detail', id] as const,
    notes: (bookingId: string) => ['bookings', 'notes', bookingId] as const,
    payments: (bookingId: string) => ['bookings', 'payments', bookingId] as const,
    auditHistory: (bookingId: string) => ['bookings', 'audit', bookingId] as const,
  },
  calendar: {
    range: (fromUtc: string, toUtc: string) => ['calendar', 'range', fromUtc, toUtc] as const,
    timeOff: (fromUtc: string, toUtc: string) => ['calendar', 'time-off', fromUtc, toUtc] as const,
  },
  slots: {
    available: (serviceId: string, dayDate: string, resourceId?: string | null) =>
      ['slots', serviceId, dayDate, resourceId] as const,
  },
  services: {
    all: ['services'] as const,
    detail: (id: string) => ['services', 'detail', id] as const,
  },
  resources: {
    all: ['resources'] as const,
    detail: (id: string) => ['resources', 'detail', id] as const,
    staff: (resourceId: string) => ['resources', 'staff', resourceId] as const,
    linkedServices: (resourceId: string) => ['resources', 'linked-services', resourceId] as const,
  },
  availability: {
    rules: (resourceId: string) => ['availability', 'rules', resourceId] as const,
    timeOff: (resourceId: string) => ['availability', 'time-off', resourceId] as const,
  },
  payments: {
    all: ['payments'] as const,
    list: (filters: {
      page: number;
      pageSize: number;
      status?: string;
      from?: string;
      to?: string;
      provider?: string;
    }) => ['payments', 'list', filters] as const,
  },
  customers: {
    all: ['customers'] as const,
    list: (page: number, search?: string) => ['customers', 'list', page, search] as const,
    bookings: (customerId: string) => ['customers', 'bookings', customerId] as const,
  },
  audit: {
    log: (cursor?: { created_at: string; id: number } | null, tableName?: string, recordId?: string) =>
      ['audit-log', cursor, tableName, recordId] as const,
  },
  admins: {
    all: ['admins'] as const,
  },
};
