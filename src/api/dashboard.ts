import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { queryKeys } from './keys';
import { mapDatabaseError } from '../lib/errors';
import type { BookingStatus } from '../types/database';

export interface DashboardStats {
  bookings_total: number;
  bookings_confirmed: number;
  bookings_cancelled: number;
  revenue_minor: number;
}

export interface BookingsByDay {
  day: string;
  bookings: number;
  booked_value_minor: number;
}

export interface ExpiringHold {
  id: string;
  reference: string;
  starts_at: string;
  hold_expires_at: string | null;
  contact_name: string;
  service_name: string;
  resource_name: string;
  price_minor: number;
  currency: string;
}

export interface TodayBooking {
  id: string;
  reference: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  contact_name: string;
  service_name: string;
  resource_name: string;
  price_minor: number;
  currency: string;
}

export function useDashboardStats(fromUtc: string, toUtc: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(fromUtc, toUtc),
    queryFn: async (): Promise<DashboardStats> => {
      try {
        const { data, error } = await supabase.rpc('admin_dashboard_stats', {
          p_from: fromUtc,
          p_to: toUtc,
        });

        if (error) throw error;
        const row = data?.[0];
        return {
          bookings_total: Number(row?.bookings_total ?? 0),
          bookings_confirmed: Number(row?.bookings_confirmed ?? 0),
          bookings_cancelled: Number(row?.bookings_cancelled ?? 0),
          revenue_minor: Number(row?.revenue_minor ?? 0),
        };
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
    staleTime: 30 * 1000,
  });
}

export function useDashboardBookingsByDay(fromUtc: string, toUtc: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.bookingsByDay(fromUtc, toUtc),
    queryFn: async (): Promise<BookingsByDay[]> => {
      try {
        const { data, error } = await supabase.rpc('admin_bookings_by_day', {
          p_from: fromUtc,
          p_to: toUtc,
        });

        if (error) throw error;
        return (data ?? []).map((row) => ({
          day: row.day,
          bookings: Number(row.bookings),
          booked_value_minor: Number(row.booked_value_minor),
        }));
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
    staleTime: 30 * 1000,
  });
}

export function useTodayBookings(todayStartUtc: string, todayEndUtc: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.todayBookings(todayStartUtc, todayEndUtc),
    queryFn: async (): Promise<TodayBooking[]> => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id,
            reference,
            starts_at,
            ends_at,
            status,
            contact_name,
            price_minor,
            currency,
            services (name),
            resources (name)
          `)
          .gte('starts_at', todayStartUtc)
          .lte('starts_at', todayEndUtc)
          .order('starts_at', { ascending: true })
          .limit(50);

        if (error) throw error;

        return (data ?? []).map((b) => ({
          id: b.id,
          reference: b.reference,
          starts_at: b.starts_at,
          ends_at: b.ends_at,
          status: b.status,
          contact_name: b.contact_name,
          service_name: (b.services as { name: string } | null)?.name ?? '—',
          resource_name: (b.resources as { name: string } | null)?.name ?? '—',
          price_minor: b.price_minor,
          currency: b.currency,
        }));
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
    staleTime: 30 * 1000,
  });
}

export function useExpiringHolds() {
  return useQuery({
    queryKey: queryKeys.dashboard.expiringHolds(),
    queryFn: async (): Promise<ExpiringHold[]> => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id,
            reference,
            starts_at,
            hold_expires_at,
            contact_name,
            price_minor,
            currency,
            services (name),
            resources (name)
          `)
          .eq('status', 'pending')
          .not('hold_expires_at', 'is', null)
          .order('hold_expires_at', { ascending: true })
          .limit(10);

        if (error) throw error;

        return (data ?? []).map((b) => ({
          id: b.id,
          reference: b.reference,
          starts_at: b.starts_at,
          hold_expires_at: b.hold_expires_at,
          contact_name: b.contact_name,
          service_name: (b.services as { name: string } | null)?.name ?? '—',
          resource_name: (b.resources as { name: string } | null)?.name ?? '—',
          price_minor: b.price_minor,
          currency: b.currency,
        }));
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
    staleTime: 15 * 1000,
  });
}
