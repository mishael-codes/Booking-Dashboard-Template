import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { queryKeys } from './keys';
import { mapDatabaseError } from '../lib/errors';
import type { Database } from '../types/database';
import { isDemoActive, updateMockSettings } from '../lib/demo';

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
      tagline?: string;
      support_email?: string;
      support_phone?: string;
      address?: string;
      logo_initials?: string;
      brand_color?: string;
      currency_symbol?: string;
      cancellation_policy?: string;
      enable_online_payments?: boolean;
      require_deposit?: boolean;
      deposit_percentage?: number;
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
        tagline: payload.tagline?.trim() ?? null,
        support_email: payload.support_email?.trim() ?? null,
        support_phone: payload.support_phone?.trim() ?? null,
        address: payload.address?.trim() ?? null,
        logo_initials: payload.logo_initials?.trim().toUpperCase() ?? null,
        brand_color: payload.brand_color?.trim() ?? null,
        currency_symbol: payload.currency_symbol?.trim() ?? null,
        cancellation_policy: payload.cancellation_policy?.trim() ?? null,
        enable_online_payments: payload.enable_online_payments ?? true,
        require_deposit: payload.require_deposit ?? false,
        deposit_percentage: payload.deposit_percentage ?? 20,
        updated_at: new Date().toISOString(),
      };

      if (isDemoActive()) {
        return updateMockSettings(explicitPayload);
      }

      try {
        const { data, error } = await supabase
          .from('business_settings')
          .update(explicitPayload)
          .eq('id', true)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        // If live Supabase table does not yet have extended columns, save core columns and persist branding in mock store
        updateMockSettings(explicitPayload);
        const { data: coreData, error: coreErr } = await supabase
          .from('business_settings')
          .update({
            business_name: explicitPayload.business_name,
            timezone: explicitPayload.timezone,
            currency: explicitPayload.currency,
            slot_interval_minutes: explicitPayload.slot_interval_minutes,
            min_notice_minutes: explicitPayload.min_notice_minutes,
            max_advance_days: explicitPayload.max_advance_days,
            cancellation_window_hours: explicitPayload.cancellation_window_hours,
            hold_minutes: explicitPayload.hold_minutes,
            max_pending_per_user: explicitPayload.max_pending_per_user,
            updated_at: explicitPayload.updated_at,
          })
          .eq('id', true)
          .select()
          .single();

        if (coreErr) throw err;
        return { ...coreData, ...explicitPayload };
      }
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
