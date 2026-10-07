import React, { useState } from 'react';
import {
  useServicesList,
  useToggleServiceActive,
  type ServiceRow,
} from '../../api/services';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { useToast } from '../../components/Toast';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ServiceFormModal } from './ServiceFormModal';
import { formatCurrency } from '../../lib/money';
import {
  Sparkles,
  Plus,
  Search,
  Edit2,
  PowerOff,
  Power,
  Clock,
  Layers,
} from 'lucide-react';

export function ServicesListView() {
  const { settings } = useBusinessSettings();
  const { showSuccess, showError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Deactivate confirmation
  const [deactivateTarget, setDeactivateTarget] = useState<ServiceRow | null>(null);

  const { data: services, isLoading, error } = useServicesList();
  const toggleActiveMutation = useToggleServiceActive();

  const handleOpenCreate = () => {
    setEditingServiceId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (svc: ServiceRow) => {
    setEditingServiceId(svc.id);
    setIsModalOpen(true);
  };

  const handleToggleClick = (svc: ServiceRow) => {
    if (svc.is_active) {
      // Deactivating requires confirmation dialog
      setDeactivateTarget(svc);
    } else {
      // Activating directly
      toggleActiveMutation
        .mutateAsync({
          id: svc.id,
          isActive: true,
          loadedUpdatedAt: svc.updated_at,
        })
        .then(() => showSuccess(`Service "${svc.name}" activated.`))
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Failed to activate service.';
          showError(msg);
        });
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await toggleActiveMutation.mutateAsync({
        id: deactivateTarget.id,
        isActive: false,
        loadedUpdatedAt: deactivateTarget.updated_at,
      });
      showSuccess(`Service "${deactivateTarget.name}" deactivated.`);
      setDeactivateTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate service.';
      showError(msg);
    }
  };

  const filteredServices = (services ?? []).filter((s) => {
    if (filterActive !== null && s.is_active !== filterActive) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      return (
        s.name.toLowerCase().includes(term) ||
        s.slug.toLowerCase().includes(term) ||
        (s.description?.toLowerCase().includes(term) ?? false)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Services Catalogue</h1>
          <p className="text-xs text-neutral-500">
            Define appointment offerings, durations, prices in integer minor units, and eligible resources.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-3.5 py-2 bg-neutral-900 text-white rounded text-xs font-medium hover:bg-neutral-800 inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Service</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search services by name or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
        </div>

        {/* Filter by status */}
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterActive(null)}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterActive === null
                ? 'bg-neutral-900 text-white font-medium'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            All ({services?.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setFilterActive(true)}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterActive === true
                ? 'bg-neutral-900 text-white font-medium'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setFilterActive(false)}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterActive === false
                ? 'bg-neutral-900 text-white font-medium'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Disabled
          </button>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/75 text-xs text-neutral-600">
              <th className="py-2.5 px-4 font-semibold">Service</th>
              <th className="py-2.5 px-4 font-semibold">Duration</th>
              <th className="py-2.5 px-4 font-semibold">Price</th>
              <th className="py-2.5 px-4 font-semibold text-center">Status</th>
              <th className="py-2.5 px-4 font-semibold text-center">Order</th>
              <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 text-xs">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`svc-skeleton-${i}`} className="h-12">
                  <td colSpan={6} className="px-4">
                    <div className="h-4 bg-neutral-200/60 rounded animate-pulse w-3/4" />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-rose-700">
                  {(error as Error).message}
                </td>
              </tr>
            ) : filteredServices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-500">
                  <p className="font-semibold text-neutral-800">No services found</p>
                  <p className="mt-1 text-[11px]">Add your first service offering to start accepting bookings.</p>
                </td>
              </tr>
            ) : (
              filteredServices.map((svc) => (
                <tr key={svc.id} className="hover:bg-neutral-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-neutral-900">{svc.name}</div>
                    <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                      {svc.slug}
                    </div>
                    {svc.description && (
                      <p className="text-[11px] text-neutral-500 mt-1 line-clamp-1">
                        {svc.description}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span className="inline-flex items-center gap-1 text-neutral-700">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      <span>{svc.duration_minutes}m</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-neutral-900">
                    {formatCurrency(svc.price_minor, svc.currency)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={svc.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-neutral-500">
                    {svc.sort_order}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(svc)}
                        className="p-1.5 text-neutral-600 hover:text-neutral-900 rounded hover:bg-neutral-100"
                        title="Edit service"
                        aria-label={`Edit ${svc.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleClick(svc)}
                        className={`p-1.5 rounded transition-colors ${
                          svc.is_active
                            ? 'text-neutral-400 hover:text-rose-700 hover:bg-rose-50'
                            : 'text-neutral-400 hover:text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={svc.is_active ? 'Deactivate service' : 'Activate service'}
                        aria-label={svc.is_active ? `Deactivate ${svc.name}` : `Activate ${svc.name}`}
                      >
                        {svc.is_active ? (
                          <PowerOff className="w-3.5 h-3.5" />
                        ) : (
                          <Power className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Service Edit / Create Modal */}
      <ServiceFormModal
        serviceId={editingServiceId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Deactivate Service Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deactivateTarget}
        title="Deactivate Service?"
        description={`Deactivating "${deactivateTarget?.name}" will prevent new customer bookings from selecting this service. Existing bookings will remain intact.`}
        confirmLabel="Yes, Deactivate"
        variant="warning"
        isLoading={toggleActiveMutation.isPending}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
