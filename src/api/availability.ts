import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { queryKeys } from './keys';
import { mapDatabaseError } from '../lib/errors';
import type { Database } from '../types/database';

export type AvailabilityRule = Database['public']['Tables']['availability_rules']['Row'];
export type TimeOffRow = Database['public']['Tables']['time_off']['Row'];

export interface RuleInput {
  weekday: number;
  start_time: string; // HH:mm or HH:mm:ss
  end_time: string;
}

export function useAvailabilityRules(resourceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.availability.rules(resourceId ?? ''),
    enabled: !!resourceId,
    queryFn: async (): Promise<AvailabilityRule[]> => {
      try {
        const { data, error } = await supabase
          .from('availability_rules')
          .select('*')
          .eq('resource_id', resourceId!)
          .order('weekday', { ascending: true })
          .order('start_time', { ascending: true });

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

export function useSaveAvailabilityRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resourceId,
      rules,
    }: {
      resourceId: string;
      rules: RuleInput[];
    }) => {
      // 1. Delete existing rules for this resource
      const { error: delErr } = await supabase
        .from('availability_rules')
        .delete()
        .eq('resource_id', resourceId);

      if (delErr) throw delErr;

      // 2. Insert new rules
      if (rules.length > 0) {
        const insertRows = rules.map((r) => ({
          resource_id: resourceId,
          weekday: r.weekday,
          start_time: r.start_time.length === 5 ? `${r.start_time}:00` : r.start_time,
          end_time: r.end_time.length === 5 ? `${r.end_time}:00` : r.end_time,
        }));

        const { error: insErr } = await supabase
          .from('availability_rules')
          .insert(insertRows);

        if (insErr) throw insErr;
      }

      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.rules(variables.resourceId) });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
    onError: (err) => {
      const mapped = mapDatabaseError(err);
      throw new Error(mapped.message);
    },
  });
}

export function useTimeOffList(resourceId?: string) {
  return useQuery({
    queryKey: queryKeys.availability.timeOff(resourceId ?? 'all'),
    queryFn: async (): Promise<(TimeOffRow & { resource_name?: string })[]> => {
      try {
        let query = supabase
          .from('time_off')
          .select(`
            *,
            resources (name)
          `)
          .order('starts_at', { ascending: false });

        if (resourceId) {
          query = query.eq('resource_id', resourceId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data ?? []).map((row) => ({
          ...row,
          resource_name: (row.resources as { name: string } | null)?.name ?? '—',
        }));
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
    staleTime: 30 * 1000,
  });
}

export function useCheckTimeOffConflicts() {
  return useMutation({
    mutationFn: async ({
      resourceId,
      startsAtUtc,
      endsAtUtc,
    }: {
      resourceId: string;
      startsAtUtc: string;
      endsAtUtc: string;
    }) => {
      // Find overlapping confirmed or pending bookings on this resource
      const { data, error } = await supabase
        .from('bookings')
        .select('id, reference, starts_at, ends_at, contact_name, status')
        .eq('resource_id', resourceId)
        .in('status', ['pending', 'confirmed'])
        .lt('starts_at', endsAtUtc)
        .gt('ends_at', startsAtUtc);

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resourceId,
      startsAtUtc,
      endsAtUtc,
      reason,
    }: {
      resourceId: string;
      startsAtUtc: string;
      endsAtUtc: string;
      reason?: string | null;
    }) => {
      const payload = {
        resource_id: resourceId,
        starts_at: startsAtUtc,
        ends_at: endsAtUtc,
        reason: reason?.trim() || null,
      };

      const { data, error } = await supabase
        .from('time_off')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
    onError: (err) => {
      const mapped = mapDatabaseError(err);
      throw new Error(mapped.message);
    },
  });
}

export function useDeleteTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timeOffId: string) => {
      const { error } = await supabase
        .from('time_off')
        .delete()
        .eq('id', timeOffId);

      if (error) throw error;
      return timeOffId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
    onError: (err) => {
      const mapped = mapDatabaseError(err);
      throw new Error(mapped.message);
    },
  });
}
