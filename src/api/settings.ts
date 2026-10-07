import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { queryKeys } from './keys';
import { mapDatabaseError } from '../lib/errors';
import type { Database } from '../types/database';

export type BusinessSettingsRow = Database['public']['Tables']['business_settings']['Row'];

export function useUpdateBusinessSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      business_name: string;
      timezone: string;
      currency: string;
      slot_interval_minutes: number;
      min_notice_minutes: number;
      max_advance_days: number;
      cancellation_window_hours: number;
      hold_minutes: number;
      max_pending_per_user: number;
    }) => {
      const explicitPayload = {
        business_name: payload.business_name.trim(),
        timezone: payload.timezone.trim(),
        currency: payload.currency.trim().toUpperCase(),
        slot_interval_minutes: payload.slot_interval_minutes,
        min_notice_minutes: payload.min_notice_minutes,
        max_advance_days: payload.max_advance_days,
        cancellation_window_hours: payload.cancellation_window_hours,
        hold_minutes: payload.hold_minutes,
        max_pending_per_user: payload.max_pending_per_user,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('business_settings')
        .update(explicitPayload)
        .eq('id', true)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
    onError: (err) => {
      const mapped = mapDatabaseError(err);
      throw new Error(mapped.message);
    },
  });
}
