import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { queryKeys } from './keys';
import { mapDatabaseError } from '../lib/errors';
import type { BookingStatus } from '../types/database';

export interface CalendarBookingItem {
  id: string;
  reference: string;
  service_id: string;
  resource_id: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  contact_name: string;
  service_name: string;
  price_minor: number;
  currency: string;
}

export interface CalendarTimeOffItem {
  id: string;
  resource_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

export function useCalendarBookings(fromUtc: string, toUtc: string) {
  return useQuery({
    queryKey: queryKeys.calendar.range(fromUtc, toUtc),
    enabled: Boolean(fromUtc && toUtc),
    queryFn: async (): Promise<CalendarBookingItem[]> => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id,
            reference,
            service_id,
            resource_id,
            starts_at,
            ends_at,
            status,
            contact_name,
            price_minor,
            currency,
            services (name)
          `)
          .gte('starts_at', fromUtc)
          .lte('starts_at', toUtc)
          .order('starts_at', { ascending: true });

        if (error) throw error;

        return (data ?? []).map((b) => ({
          id: b.id,
          reference: b.reference,
          service_id: b.service_id,
          resource_id: b.resource_id,
          starts_at: b.starts_at,
          ends_at: b.ends_at,
          status: b.status,
          contact_name: b.contact_name,
          service_name: (b.services as { name: string } | null)?.name ?? '—',
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

export function useCalendarTimeOff(fromUtc: string, toUtc: string) {
  return useQuery({
    queryKey: queryKeys.calendar.timeOff(fromUtc, toUtc),
    enabled: Boolean(fromUtc && toUtc),
    queryFn: async (): Promise<CalendarTimeOffItem[]> => {
      try {
        const { data, error } = await supabase
          .from('time_off')
          .select('id, resource_id, starts_at, ends_at, reason')
          .lte('starts_at', toUtc)
          .gte('ends_at', fromUtc);

        if (error) throw error;
        return data ?? [];
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
    staleTime: 60 * 1000,
  });
}
