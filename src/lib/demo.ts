import type {
  BookingListItem,
  BookingDetail,
  BookingFilters,
} from '../api/bookings';
import type { ServiceRow } from '../api/services';
import type { ResourceRow } from '../api/resources';
import type { PaymentListItem } from '../api/payments';
import type { ProfileRow } from '../api/customers';
import type { AuditLogRow } from '../api/audit';
import type { AdminListItem } from '../api/admins';
import type { AvailabilityRule, TimeOffRow } from '../api/availability';
import type { DashboardStats, BookingsByDay, TodayBooking, ExpiringHold } from '../api/dashboard';
import type { CalendarBookingItem, CalendarTimeOffItem } from '../api/calendar';
import type { BusinessSettings } from '../app/SettingsProvider';
import {
  MOCK_SERVICES,
  MOCK_RESOURCES,
  MOCK_BOOKINGS,
  MOCK_PAYMENTS,
  MOCK_CUSTOMERS,
  MOCK_ADMINS,
  MOCK_AUDIT_LOGS,
} from '../data/mockData';
import { format, subDays, addDays } from 'date-fns';

const DEMO_STORAGE_KEY = 'booking_admin_demo_mode';
const DEMO_STATE_KEY = 'booking_admin_demo_state_v1';

export function isDemoActive(): boolean {
  try {
    return localStorage.getItem(DEMO_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setDemoActive(active: boolean): void {
  try {
    if (active) {
      localStorage.setItem(DEMO_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(DEMO_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota/permission errors
  }
}

interface DemoState {
  services: ServiceRow[];
  resources: ResourceRow[];
  bookings: BookingDetail[];
  payments: PaymentListItem[];
  customers: ProfileRow[];
  admins: AdminListItem[];
  auditLogs: AuditLogRow[];
  availabilityRules: AvailabilityRule[];
  timeOff: (TimeOffRow & { resource_name?: string })[];
  settings: BusinessSettings;
}

const defaultAvailabilityRules: AvailabilityRule[] = [
  // Dr Sarah Jenkins (Mon-Fri 09:00 - 17:00)
  { id: 'ar-1', resource_id: '22222222-2222-2222-2222-222222222201', weekday: 1, start_time: '09:00:00', end_time: '17:00:00' },
  { id: 'ar-2', resource_id: '22222222-2222-2222-2222-222222222201', weekday: 2, start_time: '09:00:00', end_time: '17:00:00' },
  { id: 'ar-3', resource_id: '22222222-2222-2222-2222-222222222201', weekday: 3, start_time: '09:00:00', end_time: '17:00:00' },
  { id: 'ar-4', resource_id: '22222222-2222-2222-2222-222222222201', weekday: 4, start_time: '09:00:00', end_time: '17:00:00' },
  { id: 'ar-5', resource_id: '22222222-2222-2222-2222-222222222201', weekday: 5, start_time: '09:00:00', end_time: '17:00:00' },

  // Marcus Adebayo (Mon-Sat 08:30 - 16:30)
  { id: 'ar-6', resource_id: '22222222-2222-2222-2222-222222222202', weekday: 1, start_time: '08:30:00', end_time: '16:30:00' },
  { id: 'ar-7', resource_id: '22222222-2222-2222-2222-222222222202', weekday: 2, start_time: '08:30:00', end_time: '16:30:00' },
  { id: 'ar-8', resource_id: '22222222-2222-2222-2222-222222222202', weekday: 3, start_time: '08:30:00', end_time: '16:30:00' },
  { id: 'ar-9', resource_id: '22222222-2222-2222-2222-222222222202', weekday: 4, start_time: '08:30:00', end_time: '16:30:00' },
  { id: 'ar-10', resource_id: '22222222-2222-2222-2222-222222222202', weekday: 5, start_time: '08:30:00', end_time: '16:30:00' },
  { id: 'ar-11', resource_id: '22222222-2222-2222-2222-222222222202', weekday: 6, start_time: '09:00:00', end_time: '14:00:00' },
];

const defaultTimeOff: (TimeOffRow & { resource_name?: string })[] = [
  {
    id: 'to-1',
    resource_id: '22222222-2222-2222-2222-222222222201',
    starts_at: addDays(new Date(), 10).toISOString(),
    ends_at: addDays(new Date(), 12).toISOString(),
    reason: 'Annual medical wellness conference attendance',
    during: null,
    resource_name: 'Dr. Sarah Jenkins',
  },
];

const defaultSettings: BusinessSettings = {
  id: true,
  business_name: 'Apex Vitality & Wellness Clinic',
  timezone: 'Africa/Lagos',
  currency: 'NGN',
  slot_interval_minutes: 30,
  min_notice_minutes: 60,
  max_advance_days: 60,
  cancellation_window_hours: 24,
  hold_minutes: 15,
  max_pending_per_user: 3,
  tagline: 'Premier aesthetic wellness & medical practice',
  support_email: 'care@apexwellness.com',
  support_phone: '+234 800 000 1111',
  address: '14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
  logo_initials: 'AV',
  brand_color: '#0f172a',
  currency_symbol: '₦',
  cancellation_policy: 'Cancellations made at least 24 hours prior to the appointment incur no penalty. Within 24 hours, fees or deposits may be retained.',
  enable_online_payments: true,
  require_deposit: false,
  deposit_percentage: 20,
  updated_at: new Date().toISOString(),
};

function getInitialState(): DemoState {
  try {
    const raw = localStorage.getItem(DEMO_STATE_KEY);
    if (raw) {
      return JSON.parse(raw) as DemoState;
    }
  } catch {
    // Fall back to defaults
  }

  return {
    services: [...MOCK_SERVICES],
    resources: [...MOCK_RESOURCES],
    bookings: [...MOCK_BOOKINGS],
    payments: [...MOCK_PAYMENTS],
    customers: [...MOCK_CUSTOMERS],
    admins: [...MOCK_ADMINS],
    auditLogs: [...MOCK_AUDIT_LOGS],
    availabilityRules: defaultAvailabilityRules,
    timeOff: defaultTimeOff,
    settings: defaultSettings,
  };
}

let state: DemoState = getInitialState();

function persistState(): void {
  try {
    localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function resetDemoState(): void {
  try {
    localStorage.removeItem(DEMO_STATE_KEY);
  } catch {
    // ignore
  }
  state = getInitialState();
}

// ----------------- Dashboard -----------------

export function getMockDashboardStats(): DashboardStats {
  const confirmed = state.bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed');
  const cancelled = state.bookings.filter((b) => b.status === 'cancelled');
  const revenue = confirmed.reduce((acc, b) => acc + (b.price_minor || 0), 0);

  return {
    bookings_total: state.bookings.length,
    bookings_confirmed: confirmed.length,
    bookings_cancelled: cancelled.length,
    revenue_minor: revenue,
  };
}

export function getMockBookingsByDay(): BookingsByDay[] {
  const result: BookingsByDay[] = [];
  const today = new Date();

  for (let i = 13; i >= 0; i--) {
    const d = subDays(today, i);
    const dayStr = format(d, 'yyyy-MM-dd');
    const bookingsOnDay = state.bookings.filter((b) => b.starts_at.startsWith(dayStr));
    const count = bookingsOnDay.length > 0 ? bookingsOnDay.length : (i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1);
    const val = count * 4500000;

    result.push({
      day: dayStr,
      bookings: count,
      booked_value_minor: val,
    });
  }

  return result;
}

export function getMockTodayBookings(): TodayBooking[] {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  // Match bookings starting with todayStr, or pick top 3 bookings
  const todays = state.bookings.filter((b) => b.starts_at.includes(todayStr));
  const list = todays.length > 0 ? todays : state.bookings.slice(0, 3);

  return list.map((b) => ({
    id: b.id,
    reference: b.reference,
    starts_at: b.starts_at,
    ends_at: b.ends_at,
    status: b.status,
    contact_name: b.contact_name,
    service_name: b.service_name,
    resource_name: b.resource_name,
    price_minor: b.price_minor,
    currency: b.currency,
  }));
}

export function getMockExpiringHolds(): ExpiringHold[] {
  const holds = state.bookings.filter((b) => b.status === 'pending' && b.hold_expires_at);
  return holds.map((b) => ({
    id: b.id,
    reference: b.reference,
    starts_at: b.starts_at,
    hold_expires_at: b.hold_expires_at,
    contact_name: b.contact_name,
    service_name: b.service_name,
    resource_name: b.resource_name,
    price_minor: b.price_minor,
    currency: b.currency,
  }));
}

// ----------------- Bookings -----------------

export function getMockBookingsList(filters: BookingFilters): { items: BookingListItem[]; total: number } {
  let list = [...state.bookings];

  if (filters.status && filters.status.length > 0) {
    list = list.filter((b) => filters.status!.includes(b.status));
  }
  if (filters.serviceId) {
    list = list.filter((b) => b.service_id === filters.serviceId);
  }
  if (filters.resourceId) {
    list = list.filter((b) => b.resource_id === filters.resourceId);
  }
  if (filters.searchReference?.trim()) {
    const q = filters.searchReference.trim().toUpperCase();
    list = list.filter((b) => b.reference.toUpperCase().includes(q));
  }
  if (filters.searchContact?.trim()) {
    const q = filters.searchContact.trim().toLowerCase();
    list = list.filter((b) => b.contact_name.toLowerCase().includes(q) || b.contact_email.toLowerCase().includes(q));
  }

  const pageSize = filters.pageSize ?? 25;
  const start = (filters.page - 1) * pageSize;
  const paged = list.slice(start, start + pageSize);

  const items: BookingListItem[] = paged.map((b) => ({
    id: b.id,
    reference: b.reference,
    starts_at: b.starts_at,
    ends_at: b.ends_at,
    status: b.status,
    price_minor: b.price_minor,
    currency: b.currency,
    contact_name: b.contact_name,
    service_name: b.service_name,
    resource_name: b.resource_name,
    updated_at: b.updated_at,
  }));

  return { items, total: list.length };
}

export function getMockBookingDetail(id: string): BookingDetail | null {
  return state.bookings.find((b) => b.id === id) ?? null;
}

export function updateMockBookingStatus(
  id: string,
  newStatus: BookingDetail['status'],
  cancellationReason?: string
): BookingDetail {
  const index = state.bookings.findIndex((b) => b.id === id);
  if (index === -1) throw new Error('Booking not found');

  const prev = state.bookings[index]!;
  const updated: BookingDetail = {
    ...prev,
    status: newStatus,
    updated_at: new Date().toISOString(),
    hold_expires_at: newStatus === 'confirmed' ? null : prev.hold_expires_at,
    cancelled_at: newStatus === 'cancelled' ? new Date().toISOString() : prev.cancelled_at,
    cancellation_reason: newStatus === 'cancelled' ? (cancellationReason ?? 'Cancelled by administrator') : prev.cancellation_reason,
  };

  state.bookings[index] = updated;
  persistState();
  return updated;
}

export function createMockBooking(data: Partial<BookingDetail>): BookingDetail {
  const refNum = Math.floor(10000 + Math.random() * 90000);
  const service = state.services.find((s) => s.id === data.service_id) ?? state.services[0]!;
  const resource = state.resources.find((r) => r.id === data.resource_id) ?? state.resources[0]!;

  const newBooking: BookingDetail = {
    id: `demo-bk-${Date.now()}`,
    reference: `BK-${refNum}`,
    customer_id: data.customer_id ?? null,
    service_id: service.id,
    resource_id: resource.id,
    starts_at: data.starts_at ?? new Date().toISOString(),
    ends_at: data.ends_at ?? addDays(new Date(), 1).toISOString(),
    status: data.status ?? 'confirmed',
    hold_expires_at: data.status === 'pending' ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
    price_minor: service.price_minor,
    currency: service.currency,
    contact_name: data.contact_name ?? 'Guest Client',
    contact_email: data.contact_email ?? 'client@example.com',
    contact_phone: data.contact_phone ?? '+234 800 000 1111',
    notes: data.notes ?? '',
    cancelled_at: null,
    cancellation_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    service_name: service.name,
    service_duration: service.duration_minutes,
    resource_name: resource.name,
  };

  state.bookings.unshift(newBooking);
  persistState();
  return newBooking;
}

export function rescheduleMockBooking(id: string, startsAt: string, endsAt: string, resourceId?: string): BookingDetail {
  const index = state.bookings.findIndex((b) => b.id === id);
  if (index === -1) throw new Error('Booking not found');

  const prev = state.bookings[index]!;
  const resource = resourceId ? state.resources.find((r) => r.id === resourceId) : null;

  const updated: BookingDetail = {
    ...prev,
    starts_at: startsAt,
    ends_at: endsAt,
    resource_id: resourceId ?? prev.resource_id,
    resource_name: resource?.name ?? prev.resource_name,
    updated_at: new Date().toISOString(),
  };

  state.bookings[index] = updated;
  persistState();
  return updated;
}

// ----------------- Services -----------------

export function getMockServices(): ServiceRow[] {
  return [...state.services];
}

export function createMockService(input: Omit<ServiceRow, 'id' | 'updated_at'>): ServiceRow {
  const newService: ServiceRow = {
    ...input,
    id: `demo-srv-${Date.now()}`,
    updated_at: new Date().toISOString(),
  };
  state.services.push(newService);
  persistState();
  return newService;
}

export function updateMockService(id: string, input: Partial<ServiceRow>): ServiceRow {
  const index = state.services.findIndex((s) => s.id === id);
  if (index === -1) throw new Error('Service not found');

  const updated: ServiceRow = {
    ...state.services[index]!,
    ...input,
    updated_at: new Date().toISOString(),
  };
  state.services[index] = updated;
  persistState();
  return updated;
}

// ----------------- Resources -----------------

export function getMockResources(): ResourceRow[] {
  return [...state.resources];
}

export function createMockResource(input: Omit<ResourceRow, 'id' | 'updated_at'>): ResourceRow {
  const newResource: ResourceRow = {
    ...input,
    id: `demo-res-${Date.now()}`,
    updated_at: new Date().toISOString(),
  };
  state.resources.push(newResource);
  persistState();
  return newResource;
}

export function updateMockResource(id: string, input: Partial<ResourceRow>): ResourceRow {
  const index = state.resources.findIndex((r) => r.id === id);
  if (index === -1) throw new Error('Resource not found');

  const updated: ResourceRow = {
    ...state.resources[index]!,
    ...input,
    updated_at: new Date().toISOString(),
  };
  state.resources[index] = updated;
  persistState();
  return updated;
}

// ----------------- Calendar -----------------

export function getMockCalendarBookings(): CalendarBookingItem[] {
  return state.bookings.map((b) => ({
    id: b.id,
    reference: b.reference,
    service_id: b.service_id,
    resource_id: b.resource_id,
    starts_at: b.starts_at,
    ends_at: b.ends_at,
    status: b.status,
    contact_name: b.contact_name,
    service_name: b.service_name,
    price_minor: b.price_minor,
    currency: b.currency,
  }));
}

export function getMockCalendarTimeOff(): CalendarTimeOffItem[] {
  return state.timeOff.map((to) => ({
    id: to.id,
    resource_id: to.resource_id,
    starts_at: to.starts_at,
    ends_at: to.ends_at,
    reason: to.reason,
  }));
}

// ----------------- Availability & Time Off -----------------

export function getMockAvailabilityRules(resourceId: string): AvailabilityRule[] {
  return state.availabilityRules.filter((r) => r.resource_id === resourceId);
}

export function saveMockAvailabilityRules(resourceId: string, rules: { weekday: number; start_time: string; end_time: string }[]): boolean {
  state.availabilityRules = state.availabilityRules.filter((r) => r.resource_id !== resourceId);
  rules.forEach((r, idx) => {
    state.availabilityRules.push({
      id: `rule-${resourceId}-${idx}-${Date.now()}`,
      resource_id: resourceId,
      weekday: r.weekday,
      start_time: r.start_time.length === 5 ? `${r.start_time}:00` : r.start_time,
      end_time: r.end_time.length === 5 ? `${r.end_time}:00` : r.end_time,
    });
  });
  persistState();
  return true;
}

export function getMockTimeOffList(resourceId?: string): (TimeOffRow & { resource_name?: string })[] {
  if (resourceId && resourceId !== 'all') {
    return state.timeOff.filter((to) => to.resource_id === resourceId);
  }
  return [...state.timeOff];
}

export function addMockTimeOff(data: { resource_id: string; starts_at: string; ends_at: string; reason: string | null }): TimeOffRow {
  const resource = state.resources.find((r) => r.id === data.resource_id);
  const row: TimeOffRow & { resource_name?: string } = {
    id: `to-${Date.now()}`,
    resource_id: data.resource_id,
    starts_at: data.starts_at,
    ends_at: data.ends_at,
    reason: data.reason,
    during: null,
    resource_name: resource?.name,
  };
  state.timeOff.unshift(row);
  persistState();
  return row;
}

export function deleteMockTimeOff(id: string): boolean {
  state.timeOff = state.timeOff.filter((to) => to.id !== id);
  persistState();
  return true;
}

// ----------------- Payments -----------------

export function getMockPayments(): PaymentListItem[] {
  return [...state.payments];
}

export function createMockPayment(input: { booking_id: string; provider: string; provider_reference: string; amount_minor: number; currency: string }): PaymentListItem {
  const booking = state.bookings.find((b) => b.id === input.booking_id);
  const newPay: PaymentListItem = {
    id: `pay-${Date.now()}`,
    booking_id: input.booking_id,
    provider: input.provider,
    provider_reference: input.provider_reference,
    amount_minor: input.amount_minor,
    currency: input.currency,
    status: 'succeeded',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    booking_reference: booking?.reference ?? 'BK-NEW',
    booking_contact_name: booking?.contact_name ?? 'Client',
    booking_status: booking?.status ?? 'confirmed',
  };
  state.payments.unshift(newPay);
  persistState();
  return newPay;
}

// ----------------- Customers -----------------

export function getMockCustomers(): ProfileRow[] {
  return [...state.customers];
}

// ----------------- Admins -----------------

export function getMockAdmins(): AdminListItem[] {
  return [...state.admins];
}

export function addMockAdmin(userId: string): AdminListItem {
  const newAdmin: AdminListItem = {
    user_id: userId,
    full_name: 'Newly Appointed Admin',
    phone: null,
    created_at: new Date().toISOString(),
  };
  state.admins.push(newAdmin);
  persistState();
  return newAdmin;
}

// ----------------- Audit Log -----------------

export function getMockAuditLogs(): AuditLogRow[] {
  return [...state.auditLogs];
}

// ----------------- Settings -----------------

export function getMockSettings(): BusinessSettings {
  return { ...state.settings };
}

export function updateMockSettings(updated: Partial<BusinessSettings>): BusinessSettings {
  state.settings = {
    ...state.settings,
    ...updated,
    updated_at: new Date().toISOString(),
  };
  persistState();
  return { ...state.settings };
}

// ----------------- Available Slots & Public Storefront Mock RPC -----------------

export function getMockAvailableSlots(
  serviceId: string,
  dayStr: string,
  resourceId?: string | null
): { resource_id: string; starts_at: string; ends_at: string }[] {
  const service = state.services.find((s) => s.id === serviceId);
  const duration = service?.duration_minutes ?? 45;
  const activeResources = state.resources.filter((r) => r.is_active);
  const targetResources = resourceId
    ? activeResources.filter((r) => r.id === resourceId)
    : activeResources.slice(0, 2);

  const fallbackRes = state.resources[0]?.id ?? '22222222-2222-2222-2222-222222222201';
  const resourcesToUse = targetResources.length > 0 ? targetResources : [{ id: fallbackRes }];

  const hours = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'];
  const slots: { resource_id: string; starts_at: string; ends_at: string }[] = [];

  for (const res of resourcesToUse) {
    for (const h of hours) {
      const start = `${dayStr}T${h}:00.000Z`;
      const startMs = new Date(start).getTime();
      const endMs = startMs + duration * 60 * 1000;
      const end = new Date(endMs).toISOString();

      const hasConflict = state.bookings.some((b) => {
        if (b.resource_id !== res.id) return false;
        if (b.status !== 'pending' && b.status !== 'confirmed') return false;
        const bStart = new Date(b.starts_at).getTime();
        const bEnd = new Date(b.ends_at).getTime();
        return startMs < bEnd && endMs > bStart;
      });

      if (!hasConflict) {
        slots.push({
          resource_id: res.id,
          starts_at: start,
          ends_at: end,
        });
      }
    }
  }

  return slots.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export function lookupMockBooking(reference: string, email: string): BookingDetail | null {
  const cleanRef = reference.trim().toUpperCase();
  const cleanEmail = email.trim().toLowerCase();
  return (
    state.bookings.find(
      (b) =>
        b.reference.toUpperCase() === cleanRef &&
        b.contact_email.toLowerCase() === cleanEmail
    ) ?? null
  );
}

export function cancelMockBooking(reference: string, email: string, reason?: string): boolean {
  const booking = lookupMockBooking(reference, email);
  if (!booking) {
    throw new Error('No matching booking found for that reference and email.');
  }
  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    throw new Error('This booking can no longer be cancelled.');
  }
  updateMockBookingStatus(
    booking.id,
    'cancelled',
    reason?.trim() || 'Cancelled by customer via storefront'
  );
  return true;
}

