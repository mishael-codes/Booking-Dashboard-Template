import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { queryKeys } from './keys';
import { mapDatabaseError } from '../lib/errors';

export interface AdminListItem {
  user_id: string;
  created_at: string;
  full_name: string | null;
  phone: string | null;
}

export function useAdminsList() {
  return useQuery({
    queryKey: queryKeys.admins.all,
    queryFn: async (): Promise<AdminListItem[]> => {
      try {
        const { data, error } = await supabase
          .from('admins')
          .select(`
            user_id,
            created_at,
            profiles (full_name, phone)
          `)
          .order('created_at', { ascending: true });

        if (error) throw error;

        return (data ?? []).map((row) => {
          const prof = row.profiles as { full_name: string | null; phone: string | null } | null;
          return {
            user_id: row.user_id,
            created_at: row.created_at,
            full_name: prof?.full_name ?? null,
            phone: prof?.phone ?? null,
          };
        });
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}
