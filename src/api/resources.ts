import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { queryKeys } from './keys';
import { mapDatabaseError } from '../lib/errors';
import type { Database, ResourceKind } from '../types/database';

export type ResourceRow = Database['public']['Tables']['resources']['Row'];

export interface ResourceStaffMember {
  user_id: string;
  full_name: string | null;
  phone: string | null;
}

export interface ResourceLinkedService {
  service_id: string;
  name: string;
  duration_minutes: number;
  price_minor: number;
  currency: string;
}

export function useResourcesList(activeOnly = false) {
  return useQuery({
    queryKey: [...queryKeys.resources.all, { activeOnly }],
    queryFn: async (): Promise<ResourceRow[]> => {
      try {
        let query = supabase
          .from('resources')
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

export function useResourceDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.resources.detail(id),
    enabled: !!id,
    queryFn: async (): Promise<ResourceRow> => {
      try {
        const { data, error } = await supabase
          .from('resources')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        const mapped = mapDatabaseError(err);
        throw new Error(mapped.message);
      }
    },
  });
}

export function useResourceStaff(resourceId: string) {
  return useQuery({
    queryKey: queryKeys.resources.staff(resourceId),
    enabled: !!resourceId,
    queryFn: async (): Promise<ResourceStaffMember[]> => {
      try {
        const { data, error } = await supabase
          .from('resource_staff')
          .select(`
            user_id,
            profiles (full_name, phone)
          `)
          .eq('resource_id', resourceId);

        if (error) throw error;

        return (data ?? []).map((row) => {
          const prof = row.profiles as { full_name: string | null; phone: string | null } | null;
          return {
            user_id: row.user_id,
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

export function useResourceLinkedServices(resourceId: string) {
  return useQuery({
    queryKey: queryKeys.resources.linkedServices(resourceId),
    enabled: !!resourceId,
    queryFn: async (): Promise<ResourceLinkedService[]> => {
      try {
        const { data, error } = await supabase
          .from('service_resources')
          .select(`
            service_id,
            services (name, duration_minutes, price_minor, currency)
          `)
          .eq('resource_id', resourceId);

        if (error) throw error;

        return (data ?? []).map((row) => {
          const svc = row.services as {
            name: string;
            duration_minutes: number;
            price_minor: number;
            currency: string;
          } | null;
          return {
            service_id: row.service_id,
            name: svc?.name ?? '—',
            duration_minutes: svc?.duration_minutes ?? 0,
            price_minor: svc?.price_minor ?? 0,
            currency: svc?.currency ?? 'NGN',
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

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      kind,
      description,
      imageUrl,
      isActive,
      sortOrder,
    }: {
      name: string;
      kind: ResourceKind;
      description?: string | null;
      imageUrl?: string | null;
      isActive: boolean;
      sortOrder: number;
    }) => {
      const payload = {
        name: name.trim(),
        kind,
        description: description?.trim() || null,
        image_url: imageUrl?.trim() || null,
        is_active: isActive,
        sort_order: sortOrder,
      };

      const { data, error } = await supabase.from('resources').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
    onError: (err) => {
      const mapped = mapDatabaseError(err);
      throw new Error(mapped.message);
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      kind,
      description,
      imageUrl,
      isActive,
      sortOrder,
      loadedUpdatedAt,
    }: {
      id: string;
      name: string;
      kind: ResourceKind;
      description?: string | null;
      imageUrl?: string | null;
      isActive: boolean;
      sortOrder: number;
      loadedUpdatedAt: string;
    }) => {
      const payload = {
        name: name.trim(),
        kind,
        description: description?.trim() || null,
        image_url: imageUrl?.trim() || null,
        is_active: isActive,
        sort_order: sortOrder,
      };

      const { data, error } = await supabase
        .from('resources')
        .update(payload)
        .eq('id', id)
        .eq('updated_at', loadedUpdatedAt)
        .select('id, updated_at');

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Concurrency conflict: This resource changed while you were editing. Reload to see the latest version.');
      }
      return data[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
    onError: (err) => {
      const mapped = mapDatabaseError(err);
      throw new Error(mapped.message);
    },
  });
}

export function useToggleResourceActive() {
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
        .from('resources')
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
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
    onError: (err) => {
      const mapped = mapDatabaseError(err);
      throw new Error(mapped.message);
    },
  });
}
