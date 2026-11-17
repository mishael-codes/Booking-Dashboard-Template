import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { queryKeys } from './keys';
import { mapDatabaseError } from '../lib/errors';
import { env } from '../lib/env';
import type { ServiceRow } from './services';
import type { ResourceRow } from './resources';
import type { AvailableSlot } from './slots';
import type { BookingStatus } from '../types/database';
import {
  isDemoActive,
  getMockServices,
  getMockResources,
  getMockAvailableSlots,
  createMockBooking,
  lookupMockBooking,
  cancelMockBooking,
  getMockSettings,
} from '../lib/demo';

function useMockStorefront(): boolean {
  return isDemoActive() || !env.isConfigured;
}

export interface PublicBookingConfirmation {
  id: string;
  reference: string;
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  price_minor: number;
  currency: string;
  hold_expires_at: string | null;
  service_name: string;
  resource_name: string;
}

export interface PublicBookingLookupResult extends PublicBookingConfirmation {
  contact_name: string;
  contact_email: string;
}

export function usePublicServices() {
  return useQuery({
    queryKey: [...queryKeys.services.all, 'public'],
    queryFn: async (): Promise<ServiceRow[]> => {
      if (useMockStorefront()) {
        return getMockServices().filter((s) => s.is_active);
      }

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        const mapped = mapDatabaseError(error);
        throw new Error(mapped.message);
      }
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function usePublicResources() {
  return useQuery({
    queryKey: [...queryKeys.resources.all, 'public'],
    queryFn: async (): Promise<ResourceRow[]> => {
      if (useMockStorefront()) {
        return getMockResources().filter((r) => r.is_active);
      }

      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        const mapped = mapDatabaseError(error);
        throw new Error(mapped.message);
      }
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function usePublicAvailableSlots(
  serviceId: string | undefined,
  dayDate: string | undefined,
  resourceId?: string | null
) {
  return useQuery({
    queryKey: [...queryKeys.slots.available(serviceId ?? '', dayDate ?? '', resourceId), 'public'],
    enabled: Boolean(serviceId && dayDate),
    queryFn: async (): Promise<AvailableSlot[]> => {
      if (!serviceId || !dayDate) return [];

      if (useMockStorefront()) {
        return getMockAvailableSlots(serviceId, dayDate, resourceId);
      }

      const { data, error } = await supabase.rpc('get_available_slots', {
        p_service_id: serviceId,
        p_day: dayDate,
        p_resource_id: resourceId || null,
      });

      if (error) {
        const mapped = mapDatabaseError(error);
        throw new Error(mapped.message);
      }
      return data ?? [];
    },
    staleTime: 15 * 1000,
  });
}

export function useCreatePublicBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serviceId,
      resourceId,
      startsAt,
      endsAt,
      contactName,
      contactEmail,
      contactPhone,
      notes,
    }: {
      serviceId: string;
      resourceId: string;
      startsAt: string;
      endsAt: string;
      contactName: string;
      contactEmail: string;
      contactPhone?: string;
      notes?: string;
    }): Promise<PublicBookingConfirmation> => {
      if (useMockStorefront()) {
        const settings = getMockSettings();
        const created = createMockBooking({
          service_id: serviceId,
          resource_id: resourceId,
          starts_at: startsAt,
          ends_at: endsAt,
          contact_name: contactName.trim(),
          contact_email: contactEmail.trim().toLowerCase(),
          contact_phone: contactPhone?.trim() || null,
          notes: notes?.trim() || null,
          status: settings.enable_online_payments ? 'pending' : 'confirmed',
        });

        return {
          id: created.id,
          reference: created.reference,
          status: created.status,
          starts_at: created.starts_at,
          ends_at: created.ends_at,
          price_minor: created.price_minor,
          currency: created.currency,
          hold_expires_at: created.hold_expires_at,
          service_name: created.service_name,
          resource_name: created.resource_name,
        };
      }

      const { data, error } = await supabase.rpc('create_public_booking', {
        p_service_id: serviceId,
        p_resource_id: resourceId,
        p_starts_at: startsAt,
        p_contact_name: contactName.trim(),
        p_contact_email: contactEmail.trim(),
        p_contact_phone: contactPhone?.trim() || null,
        p_notes: notes?.trim() || null,
      });

      if (error) {
        const mapped = mapDatabaseError(error);
        throw new Error(mapped.message);
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        throw new Error('Booking confirmation was not returned by server.');
      }
      return row;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
}

export function useLookupPublicBooking() {
  return useMutation({
    mutationFn: async ({
      reference,
      email,
    }: {
      reference: string;
      email: string;
    }): Promise<PublicBookingLookupResult> => {
      if (useMockStorefront()) {
        const found = lookupMockBooking(reference, email);
        if (!found) {
          throw new Error('No booking found matching that reference code and email address.');
        }
        return {
          id: found.id,
          reference: found.reference,
          status: found.status,
          starts_at: found.starts_at,
          ends_at: found.ends_at,
          price_minor: found.price_minor,
          currency: found.currency,
          contact_name: found.contact_name,
          contact_email: found.contact_email,
          service_name: found.service_name,
          resource_name: found.resource_name,
          hold_expires_at: found.hold_expires_at,
        };
      }

      const { data, error } = await supabase.rpc('lookup_booking_by_reference', {
        p_reference: reference.trim(),
        p_email: email.trim(),
      });

      if (error) {
        const mapped = mapDatabaseError(error);
        throw new Error(mapped.message);
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        throw new Error('No booking found matching that reference code and email address.');
      }
      return row;
    },
  });
}

export function useCancelPublicBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reference,
      email,
      reason,
    }: {
      reference: string;
      email: string;
      reason?: string;
    }): Promise<boolean> => {
      if (useMockStorefront()) {
        return cancelMockBooking(reference, email, reason);
      }

      const { data, error } = await supabase.rpc('cancel_public_booking', {
        p_reference: reference.trim(),
        p_email: email.trim(),
        p_reason: reason?.trim() || null,
      });

      if (error) {
        const mapped = mapDatabaseError(error);
        throw new Error(mapped.message);
      }
      return Boolean(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
  });
}
