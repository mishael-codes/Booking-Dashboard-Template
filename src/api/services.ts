import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { queryKeys } from './keys';
import { mapDatabaseError } from '../lib/errors';
import type { Database } from '../types/database';

export type ServiceRow = Database['public']['Tables']['services']['Row'];

export interface ServiceDetailWithResources extends ServiceRow {
  resource_ids: string[];
}

export function useServicesList(activeOnly = false) {
  return useQuery({
    queryKey: [...queryKeys.services.all, { activeOnly }],
    queryFn: async (): Promise<ServiceRow[]> => {
      try {
        let query = supabase
          .from('services')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });

        if (activeOnly) {
          query = query.eq('is_active', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data ?? [];
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useServiceDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.services.detail(id),
    enabled: !!id,
    queryFn: async (): Promise<ServiceDetailWithResources> => {
      try {
        const { data: service, error: svcErr } = await supabase
          .from('services')
          .select('*')
          .eq('id', id)
          .single();

        if (svcErr) throw svcErr;

        const { data: sr, error: srErr } = await supabase
          .from('service_resources')
          .select('resource_id')
          .eq('service_id', id);

        if (srErr) throw srErr;

        return {
          ...service,
          resource_ids: (sr ?? []).map((r) => r.resource_id),
        };
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      slug,
      description,
      durationMinutes,
      priceMinor,
      currency,
      imageUrl,
      isActive,
      sortOrder,
      resourceIds,
    }: {
      name: string;
      slug: string;
      description?: string | null;
      durationMinutes: number;
      priceMinor: number;
      currency: string;
      imageUrl?: string | null;
      isActive: boolean;
      sortOrder: number;
      resourceIds: string[];
    }) => {
      // 1. Insert service
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        description: description?.trim() || null,
        duration_minutes: durationMinutes,
        price_minor: priceMinor,
        currency: currency.toUpperCase(),
        image_url: imageUrl?.trim() || null,
        is_active: isActive,
        sort_order: sortOrder,
      };

      const { data: newService, error: svcErr } = await supabase
        .from('services')
        .insert(payload)
        .select()
        .single();

      if (svcErr) throw svcErr;

      // 2. Insert service_resources if any
      if (resourceIds.length > 0) {
        const srRows = resourceIds.map((resId) => ({
          service_id: newService.id,
          resource_id: resId,
        }));

        const { error: srErr } = await supabase.from('service_resources').insert(srRows);
        if (srErr) throw srErr;
      }

      return newService;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    },
    onError: (err) => {
      const mapped = mapDatabaseError(err);
      throw new Error(mapped.message);
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      slug,
      description,
      durationMinutes,
      priceMinor,
      currency,
      imageUrl,
      isActive,
      sortOrder,
      resourceIds,
      currentResourceIds,
      loadedUpdatedAt,
    }: {
      id: string;
      name: string;
      slug: string;
      description?: string | null;
      durationMinutes: number;
      priceMinor: number;
      currency: string;
      imageUrl?: string | null;
      isActive: boolean;
      sortOrder: number;
      resourceIds: string[];
      currentResourceIds: string[];
      loadedUpdatedAt: string;
    }) => {
      // 1. Optimistic concurrency check on service update
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        description: description?.trim() || null,
        duration_minutes: durationMinutes,
        price_minor: priceMinor,
        currency: currency.toUpperCase(),
        image_url: imageUrl?.trim() || null,
        is_active: isActive,
        sort_order: sortOrder,
      };

      const { data, error: svcErr } = await supabase
        .from('services')
        .update(payload)
        .eq('id', id)
        .eq('updated_at', loadedUpdatedAt)
        .select('id, updated_at');

      if (svcErr) throw svcErr;

      if (!data || data.length === 0) {
        throw new Error('Concurrency conflict: This service changed while you were editing. Reload to see the latest version.');
      }

      // 2. Diff and apply service_resources in one pass (no delete-all / insert-all!)
      const toAdd = resourceIds.filter((rid) => !currentResourceIds.includes(rid));
      const toRemove = currentResourceIds.filter((rid) => !resourceIds.includes(rid));

      if (toRemove.length > 0) {
        const { error: rmErr } = await supabase
          .from('service_resources')
          .delete()
          .eq('service_id', id)
          .in('resource_id', toRemove);
        if (rmErr) throw rmErr;
      }

      if (toAdd.length > 0) {
        const rowsToAdd = toAdd.map((rid) => ({
          service_id: id,
          resource_id: rid,
        }));
        const { error: addErr } = await supabase
          .from('service_resources')
          .insert(rowsToAdd);
        if (addErr) throw addErr;
      }

      return data[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    },
    onError: (err) => {
      const mapped = mapDatabaseError(err);
      throw new Error(mapped.message);
    },
  });
}

export function useToggleServiceActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      isActive,
      loadedUpdatedAt,
    }: {
      id: string;
      isActive: boolean;
      loadedUpdatedAt: string;
    }) => {
      const { data, error } = await supabase
        .from('services')
        .update({ is_active: isActive })
        .eq('id', id)
        .eq('updated_at', loadedUpdatedAt)
        .select('id, updated_at, is_active');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Concurrency conflict: Record changed while editing.');
      }
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    },
    onError: (err) => {
      const mapped = mapDatabaseError(err);
      throw new Error(mapped.message);
    },
  });
}
