import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { queryKeys } from './keys';
import { mapDatabaseError } from '../lib/errors';
import type { Database, BookingStatus } from '../types/database';
import { isDemoActive, getMockCustomers } from '../lib/demo';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export interface CustomerBookingItem {
  id: string;
  reference: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  price_minor: number;
  currency: string;
  service_name: string;
  resource_name: string;
}

export function useCustomersList(page = 1, search?: string) {
  const pageSize = 25;

  return useQuery({
    queryKey: queryKeys.customers.list(page, search),
    placeholderData: (prev) => prev,
    queryFn: async () => {
      if (isDemoActive()) {
        let list = getMockCustomers();
        if (search?.trim()) {
          const q = search.trim().toLowerCase();
          list = list.filter((c) => (c.full_name?.toLowerCase().includes(q)) || (c.phone?.includes(q)));
        }
        return {
          customers: list,
          totalCount: list.length,
        };
      }

      try {
        let query = supabase
          .from('profiles')
          .select('id, full_name, phone, created_at, updated_at', { count: 'planned' });

        if (search?.trim()) {
          const term = search.trim();
          query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);
        }

        query = query.order('created_at', { ascending: false });

        const fromIndex = (page - 1) * pageSize;
        const toIndex = fromIndex + pageSize - 1;
        query = query.range(fromIndex, toIndex);

        const { data, count, error } = await query;
        if (error) throw error;

        return {
          customers: (data ?? []) as ProfileRow[],
          totalCount: count ?? 0,
        };
      } catch (err) {
        if (isDemoActive()) {
          const list = getMockCustomers();
          return {
            customers: list,
            totalCount: list.length,
          };
        }
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
    staleTime: 60 * 1000,
  });
}

export function useCustomerBookings(customerId: string | null) {
  return useQuery({
    queryKey: queryKeys.customers.bookings(customerId ?? ''),
    enabled: !!customerId,
    queryFn: async (): Promise<CustomerBookingItem[]> => {
      if (isDemoActive()) {
        return [
          {
            id: '33333333-3333-3333-3333-333333333301',
            reference: 'BK-87291',
            starts_at: new Date().toISOString(),
            ends_at: new Date().toISOString(),
            status: 'confirmed',
            price_minor: 4500000,
            currency: 'NGN',
            service_name: 'Executive Wellness Consultation',
            resource_name: 'Dr. Sarah Jenkins',
          },
        ];
      }

      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id,
            reference,
            starts_at,
            ends_at,
            status,
            price_minor,
            currency,
            services (name),
            resources (name)
          `)
          .eq('customer_id', customerId!)
          .order('starts_at', { ascending: false });

        if (error) throw error;

        return (data ?? []).map((b) => ({
          id: b.id,
          reference: b.reference,
          starts_at: b.starts_at,
          ends_at: b.ends_at,
          status: b.status,
          price_minor: b.price_minor,
          currency: b.currency,
          service_name: (b.services as { name: string } | null)?.name ?? '—',
          resource_name: (b.resources as { name: string } | null)?.name ?? '—',
        }));
      } catch (err) {
        if (isDemoActive()) {
          return [
            {
              id: '33333333-3333-3333-3333-333333333301',
              reference: 'BK-87291',
              starts_at: new Date().toISOString(),
              ends_at: new Date().toISOString(),
              status: 'confirmed',
              price_minor: 4500000,
              currency: 'NGN',
              service_name: 'Executive Wellness Consultation',
              resource_name: 'Dr. Sarah Jenkins',
            },
          ];
        }
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
    staleTime: 30 * 1000,
  });
}
