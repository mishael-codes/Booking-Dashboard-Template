import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { queryKeys } from './keys';
import { mapDatabaseError } from '../lib/errors';
import type { Database, PaymentStatus, BookingStatus } from '../types/database';

export type PaymentRow = Database['public']['Tables']['payments']['Row'];

export interface PaymentListItem extends PaymentRow {
  booking_reference: string;
  booking_contact_name: string;
  booking_status: BookingStatus;
}

export interface PaymentFilters {
  page: number;
  pageSize?: number;
  status?: PaymentStatus;
  provider?: string;
  fromUtc?: string;
  toUtc?: string;
}

export function usePaymentsList(filters: PaymentFilters) {
  const pageSize = filters.pageSize ?? 25;

  return useQuery({
    queryKey: queryKeys.payments.list({
      page: filters.page,
      pageSize,
      status: filters.status,
      provider: filters.provider,
      from: filters.fromUtc,
      to: filters.toUtc,
    }),
    placeholderData: (prev) => prev,
    queryFn: async () => {
      try {
        let query = supabase
          .from('payments')
          .select(
            `
            id,
            booking_id,
            provider,
            provider_reference,
            amount_minor,
            currency,
            status,
            created_at,
            updated_at,
            bookings (reference, contact_name, status)
          `,
            { count: 'planned' }
          );

        if (filters.status) {
          query = query.eq('status', filters.status);
        }

        if (filters.provider?.trim()) {
          query = query.ilike('provider', `%${filters.provider.trim()}%`);
        }

        if (filters.fromUtc) {
          query = query.gte('created_at', filters.fromUtc);
        }

        if (filters.toUtc) {
          query = query.lte('created_at', filters.toUtc);
        }

        query = query.order('created_at', { ascending: false });

        const fromIndex = (filters.page - 1) * pageSize;
        const toIndex = fromIndex + pageSize - 1;
        query = query.range(fromIndex, toIndex);

        const { data, count, error } = await query;
        if (error) throw error;

        const items: PaymentListItem[] = (data ?? []).map((p) => {
          const b = p.bookings as {
            reference: string;
            contact_name: string;
            status: BookingStatus;
          } | null;

          return {
            id: p.id,
            booking_id: p.booking_id,
            provider: p.provider,
            provider_reference: p.provider_reference,
            amount_minor: p.amount_minor,
            currency: p.currency,
            status: p.status,
            created_at: p.created_at,
            updated_at: p.updated_at,
            booking_reference: b?.reference ?? '—',
            booking_contact_name: b?.contact_name ?? '—',
            booking_status: b?.status ?? 'pending',
          };
        });

        return { items, totalCount: count ?? 0 };
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
    staleTime: 30 * 1000,
  });
}

export function useRecordManualPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      amountMinor,
      currency,
      confirmPendingBooking = true,
      bookingUpdatedAt,
    }: {
      bookingId: string;
      amountMinor: number;
      currency: string;
      confirmPendingBooking?: boolean;
      bookingUpdatedAt?: string;
    }) => {
      // 1. Insert manual payment record
      const providerRef = `manual-${crypto.randomUUID()}`;

      const paymentPayload = {
        booking_id: bookingId,
        provider: 'manual',
        provider_reference: providerRef,
        amount_minor: amountMinor,
        currency: currency.toUpperCase(),
        status: 'succeeded' as PaymentStatus,
      };

      const { data: newPayment, error: payErr } = await supabase
        .from('payments')
        .insert(paymentPayload)
        .select()
        .single();

      if (payErr) throw payErr;

      // 2. If user chose to confirm a pending booking
      if (confirmPendingBooking && bookingUpdatedAt) {
        const { error: bookErr } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            hold_expires_at: null,
          })
          .eq('id', bookingId)
          .eq('status', 'pending')
          .eq('updated_at', bookingUpdatedAt);

        // Note: if booking was already confirmed or updated, payment still succeeds
        if (bookErr) {
          console.warn('Booking status was not updated:', bookErr.message);
        }
      }

      return newPayment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(variables.bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      const mapped = mapDatabaseError(err);
      throw new Error(mapped.message);
    },
  });
}
