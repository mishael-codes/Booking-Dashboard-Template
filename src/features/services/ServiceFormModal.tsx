import React, { useState, useEffect } from 'react';
import { useResourcesList } from '../../api/resources';
import {
  useCreateService,
  useUpdateService,
  useServiceDetail,
  type ServiceRow,
} from '../../api/services';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { useToast } from '../../components/Toast';
import { MoneyInput } from '../../components/MoneyInput';
import { parseMajorToMinor, formatMinorToMajorString } from '../../lib/money';
import { X, Sparkles, Check, AlertCircle } from 'lucide-react';

interface ServiceFormModalProps {
  serviceId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ServiceFormModal({ serviceId, isOpen, onClose }: ServiceFormModalProps) {
  const { settings } = useBusinessSettings();
  const { showSuccess, showError } = useToast();

  const isEdit = !!serviceId;
  const { data: serviceDetail, isLoading: serviceLoading } = useServiceDetail(serviceId ?? '');
  const { data: resources } = useResourcesList(true);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(!isEdit);
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [priceMajor, setPriceMajor] = useState('0.00');
  const [currency, setCurrency] = useState(settings.currency || 'NGN');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);

  // Validation error state
  const [validationError, setValidationError] = useState<string | null>(null);

  const createMutation = useCreateService();
  const updateMutation = useUpdateService();

  // Slug generator: ^[a-z0-9]+(-[a-z0-9]+)*$
  const generateSlug = (rawName: string) => {
    return rawName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  useEffect(() => {
    if (serviceDetail && isEdit) {
      setName(serviceDetail.name);
      setSlug(serviceDetail.slug);
      setAutoSlug(false);
      setDescription(serviceDetail.description || '');
      setDurationMinutes(serviceDetail.duration_minutes);
      setPriceMajor(formatMinorToMajorString(serviceDetail.price_minor));
      setCurrency(serviceDetail.currency);
      setImageUrl(serviceDetail.image_url || '');
      setIsActive(serviceDetail.is_active);
      setSortOrder(serviceDetail.sort_order);
      setSelectedResourceIds(serviceDetail.resource_ids || []);
    } else if (!isEdit) {
      setName('');
      setSlug('');
      setAutoSlug(true);
      setDescription('');
      setDurationMinutes(60);
      setPriceMajor('0.00');
      setCurrency(settings.currency || 'NGN');
      setImageUrl('');
      setIsActive(true);
      setSortOrder(0);
      setSelectedResourceIds([]);
    }
    setValidationError(null);
  }, [serviceDetail, isEdit, settings.currency]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (autoSlug) {
      setSlug(generateSlug(val));
    }
  };

  const toggleResource = (resId: string) => {
    setSelectedResourceIds((prev) =>
      prev.includes(resId) ? prev.filter((id) => id !== resId) : [...prev, resId]
    );
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate slug regex
    const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      setValidationError('Slug must contain only lowercase letters, numbers, and hyphens (no consecutive or trailing hyphens).');
      return;
    }

    // Validate HTTPS image URL if provided
    if (imageUrl && !imageUrl.startsWith('https://')) {
      setValidationError('Image URL must start with https://');
      return;
    }

    const priceMinor = parseMajorToMinor(priceMajor);

    try {
      if (isEdit && serviceDetail) {
        await updateMutation.mutateAsync({
          id: serviceDetail.id,
          name,
          slug,
          description: description || null,
          durationMinutes,
          priceMinor,
          currency,
          imageUrl: imageUrl || null,
          isActive,
          sortOrder,
          resourceIds: selectedResourceIds,
          currentResourceIds: serviceDetail.resource_ids || [],
          loadedUpdatedAt: serviceDetail.updated_at,
        });
        showSuccess('Service updated successfully.');
      } else {
        await createMutation.mutateAsync({
          name,
          slug,
          description: description || null,
          durationMinutes,
          priceMinor,
          currency,
          imageUrl: imageUrl || null,
          isActive,
          sortOrder,
          resourceIds: selectedResourceIds,
        });
        showSuccess('Service created successfully.');
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save service.';
      showError(msg);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-2xl bg-white border border-neutral-200 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/75">
          <div>
            <h3 id="service-modal-title" className="text-base font-semibold text-neutral-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-neutral-700" />
              <span>{isEdit ? 'Edit Service' : 'Create New Service'}</span>
            </h3>
            <p className="text-xs text-neutral-500">
              Configure service details, duration, pricing, and eligible assigned resources.
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
              <label htmlFor="service-name-input" className="block text-xs font-semibold text-neutral-700 mb-1">
                Service Name * (max 120 chars)
              </label>
              <input
                id="service-name-input"
                type="text"
                required
                maxLength={120}
                placeholder="e.g. Deep Tissue Massage"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="service-slug-input" className="block text-xs font-semibold text-neutral-700">
                  Slug * (unique identifier)
                </label>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={() => setAutoSlug(!autoSlug)}
                    className="text-[10px] text-neutral-500 hover:text-neutral-800"
                  >
                    {autoSlug ? 'Edit manually' : 'Auto-generate'}
                  </button>
                )}
              </div>
              <input
                id="service-slug-input"
                type="text"
                required
                placeholder="deep-tissue-massage"
                value={slug}
                disabled={autoSlug && !isEdit}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                className="w-full text-xs font-mono p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="service-description-input" className="block text-xs font-semibold text-neutral-700 mb-1">
              Description (max 2000 chars)
            </label>
            <textarea
              id="service-description-input"
              rows={2}
              maxLength={2000}
              placeholder="Detailed description of the service and what customers should expect..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="service-duration-input" className="block text-xs font-semibold text-neutral-700 mb-1">
                Duration (Minutes) * (5..1440)
              </label>
              <input
                id="service-duration-input"
                type="number"
                min={5}
                max={1440}
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 5)}
                className="w-full text-xs font-mono p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="service-price-input" className="block text-xs font-semibold text-neutral-700 mb-1">
                Price ({currency}) *
              </label>
              <MoneyInput
                id="service-price-input"
                value={priceMajor}
                onChange={setPriceMajor}
                currency={currency}
              />
            </div>

            <div>
              <label htmlFor="service-sort-order-input" className="block text-xs font-semibold text-neutral-700 mb-1">
                Sort Order
              </label>
              <input
                id="service-sort-order-input"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs font-mono p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="service-image-url-input" className="block text-xs font-semibold text-neutral-700 mb-1">
              Image URL (Optional, HTTPS only)
            </label>
            <input
              id="service-image-url-input"
              type="url"
              placeholder="https://example.com/images/service.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
            />
          </div>

          {/* Assigned eligible resources (service_resources) */}
          <div className="border border-neutral-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-800">
                Eligible Resources
              </span>
              <span className="text-[11px] text-neutral-400">
                Which resources can deliver this service?
              </span>
            </div>

            {!resources || resources.length === 0 ? (
              <p className="text-xs text-neutral-400">No active resources found in catalog.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                {resources.map((res) => {
                  const isChecked = selectedResourceIds.includes(res.id);
                  return (
                    <label
                      key={res.id}
                      className={`flex items-center gap-2.5 p-2 rounded border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-neutral-900 bg-neutral-50 font-medium'
                          : 'border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleResource(res.id)}
                        className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                      />
                      <span className="truncate">{res.name}</span>
                      <span className="text-[10px] text-neutral-400 uppercase ml-auto">
                        {res.kind}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active status */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="service-is-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <label htmlFor="service-is-active" className="text-xs font-medium text-neutral-800">
              Active in booking catalogue (if disabled, existing bookings remain valid)
            </label>
          </div>

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
              disabled={isPending || !name.trim() || !slug.trim()}
              className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 rounded hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isPending && (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              <span>{isEdit ? 'Save Changes' : 'Create Service'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
