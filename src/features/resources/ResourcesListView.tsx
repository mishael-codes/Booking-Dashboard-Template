import React, { useState } from 'react';
import {
  useResourcesList,
  useToggleResourceActive,
  type ResourceRow,
} from '../../api/resources';
import { useToast } from '../../components/Toast';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ResourceFormModal } from './ResourceFormModal';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  PowerOff,
  Power,
  User,
  DoorOpen,
  Wrench,
  HelpCircle,
} from 'lucide-react';

export function ResourcesListView() {
  const { showSuccess, showError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterKind, setFilterKind] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);

  const [deactivateTarget, setDeactivateTarget] = useState<ResourceRow | null>(null);

  const { data: resources, isLoading, error } = useResourcesList();
  const toggleActiveMutation = useToggleResourceActive();

  const handleOpenCreate = () => {
    setEditingResourceId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (res: ResourceRow) => {
    setEditingResourceId(res.id);
    setIsModalOpen(true);
  };

  const handleToggleClick = (res: ResourceRow) => {
    if (res.is_active) {
      setDeactivateTarget(res);
    } else {
      toggleActiveMutation
        .mutateAsync({
          id: res.id,
          isActive: true,
          loadedUpdatedAt: res.updated_at,
        })
        .then(() => showSuccess(`Resource "${res.name}" activated.`))
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Failed to activate resource.';
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
      showSuccess(`Resource "${deactivateTarget.name}" deactivated.`);
      setDeactivateTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate resource.';
      showError(msg);
    }
  };

  const filteredResources = (resources ?? []).filter((r) => {
    if (filterActive !== null && r.is_active !== filterActive) return false;
    if (filterKind !== 'all' && r.kind !== filterKind) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      return (
        r.name.toLowerCase().includes(term) ||
        (r.description?.toLowerCase().includes(term) ?? false)
      );
    }
    return true;
  });

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'staff':
        return <User className="w-3.5 h-3.5 text-neutral-500" />;
      case 'room':
        return <DoorOpen className="w-3.5 h-3.5 text-neutral-500" />;
      case 'equipment':
        return <Wrench className="w-3.5 h-3.5 text-neutral-500" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-neutral-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Resources Catalogue</h1>
          <p className="text-xs text-neutral-500">
            Manage staff practitioners, suites, rooms, and equipment available for scheduling.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-3.5 py-2 bg-neutral-900 text-white rounded text-xs font-medium hover:bg-neutral-800 inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Resource</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search resources by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Filter by kind */}
          <select
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value)}
            className="p-1.5 border border-neutral-300 rounded bg-white text-neutral-700"
          >
            <option value="all">All Kinds</option>
            <option value="staff">Staff</option>
            <option value="room">Rooms</option>
            <option value="equipment">Equipment</option>
            <option value="other">Other</option>
          </select>

          {/* Filter by active */}
          <select
            value={filterActive === null ? 'all' : filterActive ? 'active' : 'inactive'}
            onChange={(e) => {
              const val = e.target.value;
              setFilterActive(val === 'all' ? null : val === 'active');
            }}
            className="p-1.5 border border-neutral-300 rounded bg-white text-neutral-700"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Disabled Only</option>
          </select>
        </div>
      </div>

      {/* Resources Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/75 text-xs text-neutral-600">
              <th className="py-2.5 px-4 font-semibold">Resource</th>
              <th className="py-2.5 px-4 font-semibold">Kind</th>
              <th className="py-2.5 px-4 font-semibold text-center">Status</th>
              <th className="py-2.5 px-4 font-semibold text-center">Sort Order</th>
              <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 text-xs">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`res-skeleton-${i}`} className="h-12">
                  <td colSpan={5} className="px-4">
                    <div className="h-4 bg-neutral-200/60 rounded animate-pulse w-3/4" />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-rose-700">
                  {(error as Error).message}
                </td>
              </tr>
            ) : filteredResources.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-neutral-500">
                  <p className="font-semibold text-neutral-800">No resources found</p>
                  <p className="mt-1 text-[11px]">Add practitioners or rooms to begin booking assignments.</p>
                </td>
              </tr>
            ) : (
              filteredResources.map((res) => (
                <tr key={res.id} className="hover:bg-neutral-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-neutral-900">{res.name}</div>
                    {res.description && (
                      <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                        {res.description}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="inline-flex items-center gap-1.5 capitalize text-neutral-700">
                      {getKindIcon(res.kind)}
                      <span>{res.kind}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={res.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-neutral-500">
                    {res.sort_order}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(res)}
                        className="p-1.5 text-neutral-600 hover:text-neutral-900 rounded hover:bg-neutral-100"
                        title="Edit resource"
                        aria-label={`Edit ${res.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleClick(res)}
                        className={`p-1.5 rounded transition-colors ${
                          res.is_active
                            ? 'text-neutral-400 hover:text-rose-700 hover:bg-rose-50'
                            : 'text-neutral-400 hover:text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={res.is_active ? 'Deactivate resource' : 'Activate resource'}
                        aria-label={res.is_active ? `Deactivate ${res.name}` : `Activate ${res.name}`}
                      >
                        {res.is_active ? (
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

      {/* Resource Modal */}
      <ResourceFormModal
        resourceId={editingResourceId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Deactivate Confirmation */}
      <ConfirmDialog
        isOpen={!!deactivateTarget}
        title="Deactivate Resource?"
        description={`Deactivating "${deactivateTarget?.name}" will prevent it from being assigned to new booking slots. Existing bookings on this resource will remain intact.`}
        confirmLabel="Yes, Deactivate"
        variant="warning"
        isLoading={toggleActiveMutation.isPending}
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
