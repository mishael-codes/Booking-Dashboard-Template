import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../api/supabase';
import { queryKeys } from '../api/keys';
import type { Database } from '../types/database';

export type BusinessSettings = Database['public']['Tables']['business_settings']['Row'];

export const DEFAULT_FALLBACK_SETTINGS: BusinessSettings = {
  id: true,
  business_name: 'Booking Business',
  timezone: 'Africa/Lagos',
  currency: 'NGN',
  slot_interval_minutes: 30,
  min_notice_minutes: 60,
  max_advance_days: 60,
  cancellation_window_hours: 24,
  hold_minutes: 15,
  max_pending_per_user: 3,
  updated_at: new Date().toISOString(),
};

interface SettingsContextValue {
  settings: BusinessSettings;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: async () => {
      const { data: row, error: fetchErr } = await supabase
        .from('business_settings')
        .select('*')
        .eq('id', true)
        .maybeSingle();

      if (fetchErr) {
        throw fetchErr;
      }

      return row ?? DEFAULT_FALLBACK_SETTINGS;
    },
    staleTime: 5 * 60 * 1000, // 5 min for reference data per section 6
  });

  const value: SettingsContextValue = {
    settings: data ?? DEFAULT_FALLBACK_SETTINGS,
    isLoading,
    error: error as Error | null,
    refetch,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useBusinessSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useBusinessSettings must be used within SettingsProvider');
  }
  return context;
}
