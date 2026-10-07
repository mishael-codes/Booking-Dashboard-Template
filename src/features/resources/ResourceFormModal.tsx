import React, { useState, useEffect } from 'react';
import {
  useCreateResource,
  useUpdateResource,
  useResourceDetail,
  useResourceStaff,
  useResourceLinkedServices,
  type ResourceRow,
} from '../../api/resources';
import { useToast } from '../../components/Toast';
import type { ResourceKind } from '../../types/database';
import { X, Layers, AlertCircle, Users, Sparkles } from 'lucide-react';

interface ResourceFormModalProps {
  resourceId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ResourceFormModal({ resourceId, isOpen, onClose }: ResourceFormModalProps) {
  const { showSuccess, showError } = useToast();
  const isEdit = !!resourceId;

  const { data: resourceDetail } = useResourceDetail(resourceId ?? '');
  const { data: staffLogins } = useResourceStaff(resourceId ?? '');
  const { data: linkedServices } = useResourceLinkedServices(resourceId ?? '');

  const [name, setName] = useState('');
  const [kind, setKind] = useState<ResourceKind>('staff');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  const createMutation = useCreateResource();
  const updateMutation = useUpdateResource();

  useEffect(() => {
    if (resourceDetail && isEdit) {
      setName(resourceDetail.name);
      setKind(resourceDetail.kind);
      setDescription(resourceDetail.description || '');
      setImageUrl(resourceDetail.image_url || '');
      setIsActive(resourceDetail.is_active);
      setSortOrder(resourceDetail.sort_order);
    } else if (!isEdit) {
      setName('');
      setKind('staff');
      setDescription('');
      setImageUrl('');
      setIsActive(true);
      setSortOrder(0);
    }
    setValidationError(null);
  }, [resourceDetail, isEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (imageUrl && !imageUrl.startsWith('https://')) {
      setValidationError('Image URL must start with https://');
      return;
    }

    try {
      if (isEdit && resourceDetail) {
        await updateMutation.mutateAsync({
          id: resourceDetail.id,
          name: name.trim(),
          kind,
          description: description.trim() || null,
          imageUrl: imageUrl.trim() || null,
          isActive,
          sortOrder,
          loadedUpdatedAt: resourceDetail.updated_at,
        });
        showSuccess('Resource updated successfully.');
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          kind,
          description: description.trim() || null,
          imageUrl: imageUrl.trim() || null,
          isActive,
          sortOrder,
        });
        showSuccess('Resource created successfully.');
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save resource.';
      showError(msg);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resource-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-xl bg-white border border-neutral-200 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/75">
          <div>
            <h3 id="resource-modal-title" className="text-base font-semibold text-neutral-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-neutral-700" />
              <span>{isEdit ? 'Edit Resource' : 'Add New Resource'}</span>
            </h3>
            <p className="text-xs text-neutral-500">
              Manage booking entities (staff members, consultation rooms, equipment).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {validationError && (
            <div
              role="alert"
              className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="resource-name-input" className="block text-xs font-semibold text-neutral-700 mb-1">
                Resource Name * (max 120 chars)
              </label>
              <input
                id="resource-name-input"
                type="text"
                required
                maxLength={120}
                placeholder="e.g. Dr. Sarah Jenkins / Room 102"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="resource-kind-select" className="block text-xs font-semibold text-neutral-700 mb-1">
                Resource Kind *
              </label>
              <select
                id="resource-kind-select"
                required
                value={kind}
                onChange={(e) => setKind(e.target.value as ResourceKind)}
                className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none bg-white"
              >
                <option value="staff">Staff (Practitioner / Specialist)</option>
                <option value="room">Room (Suite / Consultation Office)</option>
                <option value="equipment">Equipment (Device / Machine)</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="resource-description-input" className="block text-xs font-semibold text-neutral-700 mb-1">
              Description (max 2000 chars)
            </label>
            <textarea
              id="resource-description-input"
              rows={2}
              maxLength={2000}
              placeholder="Bio, specialties, or room specifications..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="resource-image-url-input" className="block text-xs font-semibold text-neutral-700 mb-1">
                Image URL (HTTPS only)
              </label>
              <input
                id="resource-image-url-input"
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="resource-sort-order-input" className="block text-xs font-semibold text-neutral-700 mb-1">
                Sort Order
              </label>
              <input
                id="resource-sort-order-input"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs font-mono p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="resource-is-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <label htmlFor="resource-is-active" className="text-xs font-medium text-neutral-800">
              Active (eligible for assignment and bookings)
            </label>
          </div>

          {/* Read-Only Linked Services and Linked Staff */}
          {isEdit && (
            <div className="pt-3 border-t border-neutral-200 space-y-3">
              {/* Linked services */}
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
                  <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Linked Services ({linkedServices?.length ?? 0})</span>
                </div>
                {!linkedServices || linkedServices.length === 0 ? (
                  <p className="text-[11px] text-neutral-400">Not assigned to any services yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {linkedServices.map((s) => (
                      <span
                        key={s.service_id}
                        className="px-2 py-0.5 bg-white border border-neutral-300 rounded text-[11px] text-neutral-700 font-medium"
                      >
                        {s.name} ({s.duration_minutes}m)
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Linked Staff logins (read-only per section 8.6) */}
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
                    <Users className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Linked Staff Logins (Read-Only)</span>
                  </div>
                  <span className="text-[10px] text-neutral-400">resource_staff</span>
                </div>
                {!staffLogins || staffLogins.length === 0 ? (
                  <p className="text-[11px] text-neutral-400">No auth user logins linked to this resource.</p>
                ) : (
                  <div className="space-y-1 pt-1">
                    {staffLogins.map((st) => (
                      <div key={st.user_id} className="text-xs text-neutral-800 flex items-center justify-between">
                        <span>{st.full_name || 'Unnamed staff'}</span>
                        <span className="text-[10px] font-mono text-neutral-400">{st.user_id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="px-6 py-3 bg-neutral-50 -mx-6 -mb-6 border-t border-neutral-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 rounded hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isPending && (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              <span>{isEdit ? 'Save Changes' : 'Create Resource'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
