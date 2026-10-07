import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { queryKeys } from './keys';
import { mapDatabaseError } from '../lib/errors';

export interface AvailableSlot {
  resource_id: string;
  starts_at: string;
  ends_at: string;
}

export function useAvailableSlots(
  serviceId: string | undefined,
  dayDate: string | undefined, // YYYY-MM-DD
  resourceId?: string | null
) {
  return useQuery({
    queryKey: queryKeys.slots.available(serviceId ?? '', dayDate ?? '', resourceId),
    enabled: Boolean(serviceId && dayDate),
    queryFn: async (): Promise<AvailableSlot[]> => {
      if (!serviceId || !dayDate) return [];

      try {
        const { data, error } = await supabase.rpc('get_available_slots', {
          p_service_id: serviceId,
          p_day: dayDate,
          p_resource_id: resourceId || null,
        });

        if (error) throw error;
        return data ?? [];
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
    staleTime: 15 * 1000,
  });
}
