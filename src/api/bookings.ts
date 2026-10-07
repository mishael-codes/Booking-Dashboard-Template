import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { queryKeys } from './keys';
import { mapDatabaseError } from '../lib/errors';
import type { BookingStatus, PaymentStatus } from '../types/database';

export interface BookingListItem {
  id: string;
  reference: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  price_minor: number;
  currency: string;
  contact_name: string;
  service_name: string;
  resource_name: string;
  updated_at: string;
}

export interface BookingDetail {
  id: string;
  reference: string;
  customer_id: string | null;
  service_id: string;
  resource_id: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  hold_expires_at: string | null;
  price_minor: number;
  currency: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  notes: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  service_name: string;
  service_duration: number;
  resource_name: string;
}

export interface BookingFilters {
  page: number;
  pageSize?: number;
  status?: BookingStatus[];
  fromUtc?: string;
  toUtc?: string;
  serviceId?: string;
  resourceId?: string;
  searchReference?: string;
  searchContact?: string;
  sortBy?: 'starts_at' | 'created_at' | 'price_minor';
  sortOrder?: 'asc' | 'desc';
}

export function useBookingsList(filters: BookingFilters) {
  const pageSize = filters.pageSize ?? 25;

  return useQuery({
    queryKey: queryKeys.bookings.list({
      page: filters.page,
      pageSize,
      status: filters.status,
      from: filters.fromUtc,
      to: filters.toUtc,
      serviceId: filters.serviceId,
      resourceId: filters.resourceId,
      searchReference: filters.searchReference,
      searchContact: filters.searchContact,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    }),
    placeholderData: (prev) => prev,
    queryFn: async () => {
      try {
        let query = supabase
          .from('bookings')
          .select(
            `
            id,
            reference,
            starts_at,
            ends_at,
            status,
            price_minor,
            currency,
            contact_name,
            updated_at,
            services (name),
            resources (name)
          `,
            { count: 'planned' }
          );

        // Exact reference lookup uses indexed unique (reference)
        if (filters.searchReference?.trim()) {
          query = query.eq('reference', filters.searchReference.trim().toUpperCase());
        } else {
          // Bounded queries by date range
          if (filters.fromUtc) {
            query = query.gte('starts_at', filters.fromUtc);
          }
          if (filters.toUtc) {
            query = query.lte('starts_at', filters.toUtc);
          }

          // Status filter
          if (filters.status && filters.status.length > 0) {
            query = query.in('status', filters.status);
          }

          // Service and Resource filters
          if (filters.serviceId) {
            query = query.eq('service_id', filters.serviceId);
          }
          if (filters.resourceId) {
            query = query.eq('resource_id', filters.resourceId);
          }

          // Free-text contact search (must be combined with bounded range and returns at most 1 page)
          if (filters.searchContact?.trim()) {
            const term = filters.searchContact.trim();
            query = query.or(`contact_name.ilike.%${term}%,contact_email.ilike.%${term}%,contact_phone.ilike.%${term}%`);
          }
        }

        // Sorting
        const sortCol = filters.sortBy ?? 'starts_at';
        const isAsc = filters.sortOrder ? filters.sortOrder === 'asc' : false;
        query = query.order(sortCol, { ascending: isAsc });

        // Server-side pagination
        const fromIndex = (filters.page - 1) * pageSize;
        const toIndex = fromIndex + pageSize - 1;
        query = query.range(fromIndex, toIndex);

        const { data, count, error } = await query;
        if (error) throw error;

        const items: BookingListItem[] = (data ?? []).map((b) => ({
          id: b.id,
          reference: b.reference,
          starts_at: b.starts_at,
          ends_at: b.ends_at,
          status: b.status,
          price_minor: b.price_minor,
          currency: b.currency,
          contact_name: b.contact_name,
          service_name: (b.services as { name: string } | null)?.name ?? '—',
          resource_name: (b.resources as { name: string } | null)?.name ?? '—',
          updated_at: b.updated_at,
        }));

        return { items, totalCount: count ?? 0 };
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
    staleTime: 30 * 1000,
  });
}

export function useBookingDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(id),
    enabled: !!id,
    queryFn: async (): Promise<BookingDetail> => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            services (name, duration_minutes),
            resources (name)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        const svc = data.services as { name: string; duration_minutes: number } | null;
        const res = data.resources as { name: string } | null;

        return {
          id: data.id,
          reference: data.reference,
          customer_id: data.customer_id,
          service_id: data.service_id,
          resource_id: data.resource_id,
          starts_at: data.starts_at,
          ends_at: data.ends_at,
          status: data.status,
          hold_expires_at: data.hold_expires_at,
          price_minor: data.price_minor,
          currency: data.currency,
          contact_name: data.contact_name,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          notes: data.notes,
          cancelled_at: data.cancelled_at,
          cancellation_reason: data.cancellation_reason,
          created_at: data.created_at,
          updated_at: data.updated_at,
          service_name: svc?.name ?? '—',
          service_duration: svc?.duration_minutes ?? 0,
          resource_name: res?.name ?? '—',
        };
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
  });
}

export function useBookingNotes(bookingId: string) {
  return useQuery({
    queryKey: queryKeys.bookings.notes(bookingId),
    enabled: !!bookingId,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('booking_notes')
          .select('*')
          .eq('booking_id', bookingId)
          .maybeSingle();

        if (error) throw error;
        return data;
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
  });
}

export function useBookingPayments(bookingId: string) {
  return useQuery({
    queryKey: queryKeys.bookings.payments(bookingId),
    enabled: !!bookingId,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data ?? [];
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
  });
}

export function useBookingAuditHistory(bookingId: string) {
  return useQuery({
    queryKey: queryKeys.bookings.auditHistory(bookingId),
    enabled: !!bookingId,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('audit_log')
          .select('*')
          .eq('table_name', 'bookings')
          .eq('record_id', bookingId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data ?? [];
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
  });
}

// MUTATIONS

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      loadedUpdatedAt,
      cancellationReason,
    }: {
      id: string;
      status: BookingStatus;
      loadedUpdatedAt: string;
      cancellationReason?: string;
    }) => {
      // Build whitelist payload
      const payload: {
        status: BookingStatus;
        cancelled_at?: string | null;
        cancellation_reason?: string | null;
        hold_expires_at?: null;
      } = {
        status,
      };

      if (status === 'cancelled') {
        payload.cancelled_at = new Date().toISOString();
        payload.cancellation_reason = cancellationReason || null;
      } else if (status === 'confirmed') {
        payload.hold_expires_at = null;
      }

      // Optimistic concurrency check: .eq('id', id).eq('updated_at', loadedUpdatedAt)
      const { data, error } = await supabase
        .from('bookings')
        .update(payload)
        .eq('id', id)
        .eq('updated_at', loadedUpdatedAt)
        .select('id, updated_at, status');

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Concurrency conflict: This record changed while you were editing. Reload to see the latest version.');
      }

      return data[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
    onError: (err) => {
      const mapped = mapDatabaseError(err);
      throw new Error(mapped.message);
    },
  });
}

export function useRescheduleBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      resourceId,
      startsAt,
      endsAt,
      loadedUpdatedAt,
    }: {
      id: string;
      resourceId: string;
      startsAt: string;
      endsAt: string;
      loadedUpdatedAt: string;
    }) => {
      const payload = {
        resource_id: resourceId,
        starts_at: startsAt,
        ends_at: endsAt,
      };

      const { data, error } = await supabase
        .from('bookings')
        .update(payload)
        .eq('id', id)
        .eq('updated_at', loadedUpdatedAt)
        .select('id, updated_at');

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Concurrency conflict: This record changed while you were editing. Reload to see the latest version.');
      }

      return data[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      const mapped = mapDatabaseError(err);
      throw new Error(mapped.message);
    },
  });
}

export function useUpdateBookingContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      contactName,
      contactEmail,
      contactPhone,
      notes,
      loadedUpdatedAt,
    }: {
      id: string;
      contactName: string;
      contactEmail: string;
      contactPhone?: string | null;
      notes?: string | null;
      loadedUpdatedAt: string;
    }) => {
      const payload = {
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone || null,
        notes: notes || null,
      };

      const { data, error } = await supabase
        .from('bookings')
        .update(payload)
        .eq('id', id)
        .eq('updated_at', loadedUpdatedAt)
        .select('id, updated_at');

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Concurrency conflict: This record changed while you were editing. Reload to see the latest version.');
      }

      return data[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
    onError: (err) => {
      const mapped = mapDatabaseError(err);
      throw new Error(mapped.message);
    },
  });
}

export function useUpsertBookingNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      note,
    }: {
      bookingId: string;
      note: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('booking_notes')
        .upsert(
          {
            booking_id: bookingId,
            note: note.trim(),
            updated_by: user?.id ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'booking_id' }
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.notes(variables.bookingId) });
    },
    onError: (err) => {
      const mapped = mapDatabaseError(err);
      throw new Error(mapped.message);
    },
  });
}

export function useCreateWalkInBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serviceId,
      resourceId,
      startsAt,
      endsAt,
      priceMinor,
      currency,
      contactName,
      contactEmail,
      contactPhone,
      notes,
    }: {
      serviceId: string;
      resourceId: string;
      startsAt: string;
      endsAt: string;
      priceMinor: number;
      currency: string;
      contactName: string;
      contactEmail: string;
      contactPhone?: string | null;
      notes?: string | null;
    }) => {
      // Generate client-side reference if required or let DB default; DB has unique 8-char code.
      // Usually generated by DB trigger or sequence, but if DB expects reference:
      // Generating 8-char random alphanumeric code
      const reference = Math.random().toString(36).substring(2, 10).toUpperCase();

      const payload = {
        reference,
        customer_id: null, // walk-in / phone
        service_id: serviceId,
        resource_id: resourceId,
        starts_at: startsAt,
        ends_at: endsAt,
        status: 'confirmed' as BookingStatus,
        hold_expires_at: null,
        price_minor: priceMinor,
        currency,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone || null,
        notes: notes || null,
      };

      const { data, error } = await supabase
        .from('bookings')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      const mapped = mapDatabaseError(err);
      throw new Error(mapped.message);
    },
  });
}
