import React, { createContext, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../api/supabase';
import { queryKeys } from '../api/keys';
import type { Database } from '../types/database';
import { isDemoActive, getMockSettings } from '../lib/demo';
import { env } from '../lib/env';

export type BusinessSettings = Database['public']['Tables']['business_settings']['Row'];

export const DEFAULT_FALLBACK_SETTINGS: BusinessSettings = {
  id: true,
  business_name: 'Apex Vitality & Wellness Clinic',
  timezone: 'Africa/Lagos',
  currency: 'NGN',
  slot_interval_minutes: 30,
  min_notice_minutes: 60,
  max_advance_days: 60,
  cancellation_window_hours: 24,
  hold_minutes: 15,
  max_pending_per_user: 3,
  tagline: 'Premier aesthetic wellness & medical practice',
  support_email: 'care@apexwellness.com',
  support_phone: '+234 800 000 1111',
  address: '14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
  logo_initials: 'AV',
  brand_color: '#0f172a',
  currency_symbol: '₦',
  cancellation_policy:
    'Cancellations made at least 24 hours prior to the appointment incur no penalty. Within 24 hours, fees or deposits may be retained.',
  enable_online_payments: true,
  require_deposit: false,
  deposit_percentage: 20,
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
      if (isDemoActive() || !env.isConfigured) {
        return getMockSettings();
      }

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
    staleTime: 5 * 60 * 1000,
  });

  const activeSettings = data ?? DEFAULT_FALLBACK_SETTINGS;

  useEffect(() => {
    if (activeSettings.business_name) {
      document.title = `${activeSettings.business_name} — Appointments & Booking`;
    }
  }, [activeSettings.business_name]);

  const value: SettingsContextValue = {
    settings: activeSettings,
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
