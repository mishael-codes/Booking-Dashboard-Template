import React, { useState } from 'react';
import {
  useTimeOffList,
  useCreateTimeOff,
  useDeleteTimeOff,
  useCheckTimeOffConflicts,
  type TimeOffRow,
} from '../../api/availability';
import { useResourcesList } from '../../api/resources';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { useToast } from '../../components/Toast';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import {
  utcToWallClock,
  wallClockToUtcIso,
  getTodayDateString,
  DEFAULT_TIMEZONE,
} from '../../lib/time';
import {
  Plus,
  Trash2,
  AlertTriangle,
  Calendar,
  Clock,
  X,
  Ban,
  CheckCircle,
} from 'lucide-react';

interface TimeOffManagerProps {
  selectedResourceId?: string;
}

export function TimeOffManager({ selectedResourceId }: TimeOffManagerProps) {
  const { settings } = useBusinessSettings();
  const timezone = settings.timezone || DEFAULT_TIMEZONE;
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Modal Form State
  const [resourceId, setResourceId] = useState(selectedResourceId || '');
  const [startDate, setStartDate] = useState(() => getTodayDateString(timezone));
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState(() => getTodayDateString(timezone));
  const [endTime, setEndTime] = useState('17:00');
  const [reason, setReason] = useState('');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [hasConfirmedConflict, setHasConfirmedConflict] = useState(false);

  const { data: resources } = useResourcesList(true);
  const { data: timeOffList, isLoading, error } = useTimeOffList(selectedResourceId);

  const createMutation = useCreateTimeOff();
  const deleteMutation = useDeleteTimeOff();
  const checkConflictsMutation = useCheckTimeOffConflicts();

  const nowIso = new Date().toISOString();

  const filteredItems = (timeOffList ?? []).filter((item) => {
    if (activeTab === 'upcoming') {
      return item.ends_at >= nowIso;
    } else {
      return item.ends_at < nowIso;
    }
  });

  const handleOpenModal = () => {
    setResourceId(selectedResourceId || (resources?.[0]?.id ?? ''));
    setStartDate(getTodayDateString(timezone));
    setStartTime('09:00');
    setEndDate(getTodayDateString(timezone));
    setEndTime('17:00');
    setReason('');
    setConflictWarning(null);
    setHasConfirmedConflict(false);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceId) return;

    const startsAtUtc = wallClockToUtcIso(startDate, startTime, timezone);
    const endsAtUtc = wallClockToUtcIso(endDate, endTime, timezone);

    if (new Date(endsAtUtc) <= new Date(startsAtUtc)) {
      showError('End time must be after start time.');
      return;
    }

    // Step 1: Check for conflicts if not already acknowledged
    if (!hasConfirmedConflict) {
      try {
        const conflicts = await checkConflictsMutation.mutateAsync({
          resourceId,
          startsAtUtc,
          endsAtUtc,
        });

        if (conflicts.length > 0) {
          const count = conflicts.length;
          setConflictWarning(
            `Warning: This time-off period conflicts with ${count} existing confirmed/pending booking(s) on this resource! Please review or reschedule those appointments.`
          );
          setHasConfirmedConflict(true);
          return;
        }
      } catch {
        // Continue if conflict query fails
      }
    }

    // Step 2: Insert time-off
    try {
      await createMutation.mutateAsync({
        resourceId,
        startsAtUtc,
        endsAtUtc,
        reason: reason.trim() || null,
      });
      showSuccess('Time off scheduled successfully.');
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule time off.';
      showError(msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteMutation.mutateAsync(deleteTargetId);
      showSuccess('Time off block removed.');
      setDeleteTargetId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete time off.';
      showError(msg);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-neutral-300 bg-neutral-100 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'upcoming'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Upcoming ({timeOffList?.filter((t) => t.ends_at >= nowIso).length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('past')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'past'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Past ({timeOffList?.filter((t) => t.ends_at < nowIso).length ?? 0})
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          className="px-3.5 py-1.5 bg-neutral-900 text-white rounded text-xs font-medium hover:bg-neutral-800 inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Schedule Time Off</span>
        </button>
      </div>

      {/* Time Off List */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-neutral-400">Loading time off schedules...</div>
        ) : error ? (
          <div className="py-8 text-center text-xs text-rose-700">{(error as Error).message}</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500">
            No {activeTab} time off periods recorded.
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 text-xs">
            {filteredItems.map((item) => {
              const startWall = utcToWallClock(item.starts_at, timezone);
              const endWall = utcToWallClock(item.ends_at, timezone);

              return (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900">
                        {item.resource_name || 'Resource'}
                      </span>
                      {item.reason && (
                        <span className="text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded text-[11px]">
                          {item.reason}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-neutral-600 font-mono text-[11px]">
                      <Calendar className="w-3 h-3 text-neutral-400" />
                      <span>
                        {startWall.displayDate} {startWall.displayTime}
                      </span>
                      <span>→</span>
                      <span>
                        {endWall.displayDate} {endWall.displayTime}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(item.id)}
                    className="p-1.5 text-neutral-400 hover:text-rose-700 hover:bg-rose-50 rounded"
                    title="Remove time off"
                    aria-label="Remove time off block"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Time Off Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="timeoff-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-lg bg-white border border-neutral-200 rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/75">
              <div>
                <h3 id="timeoff-modal-title" className="text-base font-semibold text-neutral-900 flex items-center gap-2">
                  <Ban className="w-4 h-4 text-neutral-700" />
                  <span>Schedule Time Off</span>
                </h3>
                <p className="text-xs text-neutral-500">
                  Block dates and times for staff vacation, maintenance, or holiday in {timezone}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {conflictWarning && (
                <div
                  role="alert"
                  className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 text-xs flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">{conflictWarning}</p>
                    <p className="text-[11px] text-amber-800">
                      If you confirm, this time-off period will still be saved, but existing bookings will clash until rescheduled.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="timeoff-resource-select" className="block text-xs font-semibold text-neutral-700 mb-1">
                  Resource *
                </label>
                <select
                  id="timeoff-resource-select"
                  required
                  value={resourceId}
                  onChange={(e) => {
                    setResourceId(e.target.value);
                    setConflictWarning(null);
                    setHasConfirmedConflict(false);
                  }}
                  className="w-full text-xs p-2 border border-neutral-300 rounded bg-white"
                >
                  {resources?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.kind})
                    </option>
                  ))}
                </select>
              </div>

              {/* Starts at */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="timeoff-start-date" className="block text-xs font-semibold text-neutral-700 mb-1">
                    Start Date ({timezone}) *
                  </label>
                  <input
                    id="timeoff-start-date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs p-2 border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label htmlFor="timeoff-start-time" className="block text-xs font-semibold text-neutral-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    id="timeoff-start-time"
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full text-xs p-2 border border-neutral-300 rounded"
                  />
                </div>
              </div>

              {/* Ends at */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="timeoff-end-date" className="block text-xs font-semibold text-neutral-700 mb-1">
                    End Date ({timezone}) *
                  </label>
                  <input
                    id="timeoff-end-date"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs p-2 border border-neutral-300 rounded"
                  />
                </div>
                <div>
                  <label htmlFor="timeoff-end-time" className="block text-xs font-semibold text-neutral-700 mb-1">
                    End Time *
                  </label>
                  <input
                    id="timeoff-end-time"
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full text-xs p-2 border border-neutral-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="timeoff-reason" className="block text-xs font-semibold text-neutral-700 mb-1">
                  Reason (max 300 chars)
                </label>
                <input
                  id="timeoff-reason"
                  type="text"
                  maxLength={300}
                  placeholder="e.g. Annual Leave / Equipment Maintenance"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-xs p-2 border border-neutral-300 rounded"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 rounded hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {createMutation.isPending && (
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  <span>{hasConfirmedConflict ? 'Confirm Anyway' : 'Schedule Time Off'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Remove Time Off Block?"
        description="Removing this time-off entry will make the resource available again during these hours."
        confirmLabel="Yes, Remove"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
