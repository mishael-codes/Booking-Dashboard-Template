import React, { useState, useEffect } from 'react';
import { useResourcesList } from '../../api/resources';
import {
  useAvailabilityRules,
  useSaveAvailabilityRules,
  type RuleInput,
} from '../../api/availability';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { useToast } from '../../components/Toast';
import { TimeOffManager } from './TimeOffManager';
import { DEFAULT_TIMEZONE } from '../../lib/time';
import {
  Clock,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

const WEEKDAYS = [
  { index: 0, name: 'Sunday' },
  { index: 1, name: 'Monday' },
  { index: 2, name: 'Tuesday' },
  { index: 3, name: 'Wednesday' },
  { index: 4, name: 'Thursday' },
  { index: 5, name: 'Friday' },
  { index: 6, name: 'Saturday' },
];

export function AvailabilityEditorView() {
  const { settings } = useBusinessSettings();
  const timezone = settings.timezone || DEFAULT_TIMEZONE;
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState<'weekly' | 'timeoff'>('weekly');
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');

  const { data: resources, isLoading: resourcesLoading } = useResourcesList(true);

  // Set default selected resource
  useEffect(() => {
    if (resources && resources.length > 0 && !selectedResourceId) {
      setSelectedResourceId(resources[0]?.id ?? '');
    }
  }, [resources, selectedResourceId]);

  const { data: currentRules, isLoading: rulesLoading } = useAvailabilityRules(selectedResourceId);
  const saveRulesMutation = useSaveAvailabilityRules();

  // Local state for editing rules: Map weekday (0..6) -> array of { start_time, end_time }
  const [shiftsByDay, setShiftsByDay] = useState<Record<number, { start_time: string; end_time: string }[]>>({
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  // Hydrate local state when currentRules change
  useEffect(() => {
    const initial: Record<number, { start_time: string; end_time: string }[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };

    if (currentRules) {
      for (const r of currentRules) {
        const start = r.start_time.slice(0, 5); // HH:mm
        const end = r.end_time.slice(0, 5);
        if (initial[r.weekday]) {
          initial[r.weekday]!.push({ start_time: start, end_time: end });
        }
      }
    }

    setShiftsByDay(initial);
    setValidationError(null);
  }, [currentRules]);

  const addShift = (weekday: number) => {
    setShiftsByDay((prev) => {
      const existing = prev[weekday] ?? [];
      // Default to 09:00 - 17:00 or after the last shift
      const lastShift = existing[existing.length - 1];
      const start = lastShift ? '14:00' : '09:00';
      const end = lastShift ? '18:00' : '17:00';

      return {
        ...prev,
        [weekday]: [...existing, { start_time: start, end_time: end }],
      };
    });
  };

  const removeShift = (weekday: number, index: number) => {
    setShiftsByDay((prev) => {
      const existing = prev[weekday] ?? [];
      return {
        ...prev,
        [weekday]: existing.filter((_, i) => i !== index),
      };
    });
  };

  const updateShift = (weekday: number, index: number, field: 'start_time' | 'end_time', value: string) => {
    setShiftsByDay((prev) => {
      const existing = prev[weekday] ?? [];
      const updated = existing.map((s, i) => (i === index ? { ...s, [field]: value } : s));
      return {
        ...prev,
        [weekday]: updated,
      };
    });
  };

  const handleSave = async () => {
    setValidationError(null);

    // Validate rules across all days
    const flatRules: RuleInput[] = [];

    for (const wd of WEEKDAYS) {
      const shifts = shiftsByDay[wd.index] ?? [];

      for (let i = 0; i < shifts.length; i++) {
        const s = shifts[i]!;
        if (!s.start_time || !s.end_time) {
          setValidationError(`Please fill out start and end times for all shifts on ${wd.name}.`);
          return;
        }

        if (s.end_time <= s.start_time) {
          setValidationError(`On ${wd.name}, end time (${s.end_time}) must be later than start time (${s.start_time}).`);
          return;
        }

        // Check overlap with other shifts on the same day
        for (let j = i + 1; j < shifts.length; j++) {
          const other = shifts[j]!;
          if (s.start_time < other.end_time && s.end_time > other.start_time) {
            setValidationError(`On ${wd.name}, shift ${s.start_time}-${s.end_time} overlaps with ${other.start_time}-${other.end_time}.`);
            return;
          }
        }

        flatRules.push({
          weekday: wd.index,
          start_time: s.start_time,
          end_time: s.end_time,
        });
      }
    }

    try {
      await saveRulesMutation.mutateAsync({
        resourceId: selectedResourceId,
        rules: flatRules,
      });
      showSuccess('Weekly availability rules saved successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save rules.';
      showError(msg);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Availability & Scheduling</h1>
          <p className="text-xs text-neutral-500">
            Configure weekly operating shifts and manage blocked time-off. Timezone:{' '}
            <span className="font-mono font-medium text-neutral-700">{timezone}</span>.
          </p>
        </div>

        {/* View Tab Toggle */}
        <div className="inline-flex rounded-md border border-neutral-300 bg-neutral-100 p-0.5 text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('weekly')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === 'weekly'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Weekly Working Shifts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timeoff')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === 'timeoff'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Time Off Manager
          </button>
        </div>
      </div>

      {activeTab === 'weekly' ? (
        <div className="space-y-4">
          {/* Resource Picker Bar */}
          <div className="bg-white border border-neutral-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label htmlFor="availability-resource-select" className="text-xs font-semibold text-neutral-700">Select Resource:</label>
              <select
                id="availability-resource-select"
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
                className="text-xs p-1.5 border border-neutral-300 rounded bg-white text-neutral-800 min-w-[200px]"
              >
                {resources?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.kind})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saveRulesMutation.isPending || !selectedResourceId}
              className="px-4 py-2 bg-neutral-900 text-white rounded text-xs font-medium hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saveRulesMutation.isPending ? (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Weekly Schedule</span>
            </button>
          </div>

          {validationError && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Weekly Days Editor Grid */}
          <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-200">
            {rulesLoading ? (
              <div className="py-20 text-center text-xs text-neutral-400">Loading schedule...</div>
            ) : (
              WEEKDAYS.map((wd) => {
                const shifts = shiftsByDay[wd.index] ?? [];
                const isWorking = shifts.length > 0;

                return (
                  <div key={wd.index} className="p-4 flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Day name and status */}
                    <div className="w-32 shrink-0">
                      <div className="text-xs font-semibold text-neutral-900">{wd.name}</div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {isWorking ? (
                          <span className="text-emerald-700 font-medium">Available</span>
                        ) : (
                          <span className="text-neutral-400">Day Off</span>
                        )}
                      </div>
                    </div>

                    {/* Shifts for this day */}
                    <div className="flex-1 space-y-2">
                      {shifts.length === 0 ? (
                        <div className="text-xs text-neutral-400 italic py-1">
                          No shifts scheduled. Resource will be unavailable.
                        </div>
                      ) : (
                        shifts.map((s, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <input
                              type="time"
                              value={s.start_time}
                              onChange={(e) => updateShift(wd.index, idx, 'start_time', e.target.value)}
                              className="p-1.5 border border-neutral-300 rounded font-mono text-xs"
                            />
                            <span className="text-neutral-400">to</span>
                            <input
                              type="time"
                              value={s.end_time}
                              onChange={(e) => updateShift(wd.index, idx, 'end_time', e.target.value)}
                              className="p-1.5 border border-neutral-300 rounded font-mono text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => removeShift(wd.index, idx)}
                              className="p-1 text-neutral-400 hover:text-rose-600 rounded"
                              title="Remove shift window"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}

                      <button
                        type="button"
                        onClick={() => addShift(wd.index)}
                        className="text-xs text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1 pt-1 font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add {shifts.length > 0 ? 'Split Shift' : 'Working Window'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <TimeOffManager selectedResourceId={selectedResourceId} />
      )}
    </div>
  );
}
