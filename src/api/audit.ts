import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { queryKeys } from './keys';
import { mapDatabaseError } from '../lib/errors';
import type { Database } from '../types/database';

export type AuditLogRow = Database['public']['Tables']['audit_log']['Row'];

export interface AuditCursor {
  created_at: string;
  id: number;
}

export function useAuditLog(
  cursor: AuditCursor | null,
  tableName?: string,
  recordId?: string,
  fromUtc?: string,
  toUtc?: string
) {
  const limit = 25;

  return useQuery({
    queryKey: [...queryKeys.audit.log(cursor, tableName, recordId), { fromUtc, toUtc }],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      try {
        let query = supabase
          .from('audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(limit);

        if (tableName) {
          query = query.eq('table_name', tableName);
        }

        if (recordId?.trim()) {
          query = query.eq('record_id', recordId.trim());
        }

        if (fromUtc) {
          query = query.gte('created_at', fromUtc);
        }

        if (toUtc) {
          query = query.lte('created_at', toUtc);
        }

        // Keyset pagination condition: records older than cursor
        if (cursor) {
          query = query.or(
            `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
          );
        }

        const { data, error } = await query;
        if (error) throw error;

        const items = data ?? [];
        const nextCursor: AuditCursor | null =
          items.length === limit && items[items.length - 1]
            ? {
                created_at: items[items.length - 1]!.created_at,
                id: items[items.length - 1]!.id,
              }
            : null;

        return { items, nextCursor };
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
    staleTime: 30 * 1000,
  });
}
