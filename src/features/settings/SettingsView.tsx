import React, { useState, useEffect } from 'react';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { useUpdateBusinessSettings } from '../../api/settings';
import { useToast } from '../../components/Toast';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Settings, Save, AlertTriangle, Globe2, Clock, ShieldAlert } from 'lucide-react';

export function SettingsView() {
  const { settings, isLoading, refetch } = useBusinessSettings();
  const { showSuccess, showError } = useToast();
  const updateMutation = useUpdateBusinessSettings();

  const [businessName, setBusinessName] = useState(settings.business_name);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [currency, setCurrency] = useState(settings.currency);
  const [slotInterval, setSlotInterval] = useState(settings.slot_interval_minutes);
  const [minNoticeMinutes, setMinNoticeMinutes] = useState(settings.min_notice_minutes);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(settings.max_advance_days);
  const [cancellationWindowHours, setCancellationWindowHours] = useState(settings.cancellation_window_hours);
  const [holdMinutes, setHoldMinutes] = useState(settings.hold_minutes);
  const [maxPendingPerUser, setMaxPendingPerUser] = useState(settings.max_pending_per_user);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    setBusinessName(settings.business_name);
    setTimezone(settings.timezone);
    setCurrency(settings.currency);
    setSlotInterval(settings.slot_interval_minutes);
    setMinNoticeMinutes(settings.min_notice_minutes);
    setMaxAdvanceDays(settings.max_advance_days);
    setCancellationWindowHours(settings.cancellation_window_hours);
    setHoldMinutes(settings.hold_minutes);
    setMaxPendingPerUser(settings.max_pending_per_user);
  }, [settings]);

  // Retrieve browser supported IANA timezones
  const availableTimezones = React.useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone');
    } catch {
      return ['Africa/Lagos', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];
    }
  }, []);

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmDialogOpen(true);
  };

  const handleExecuteSave = async () => {
    try {
      await updateMutation.mutateAsync({
        business_name: businessName,
        timezone,
        currency,
        slot_interval_minutes: slotInterval,
        min_notice_minutes: minNoticeMinutes,
        max_advance_days: maxAdvanceDays,
        cancellation_window_hours: cancellationWindowHours,
        hold_minutes: holdMinutes,
        max_pending_per_user: maxPendingPerUser,
      });
      showSuccess('Business settings updated successfully.');
      setConfirmDialogOpen(false);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update business settings.';
      showError(msg);
      setConfirmDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Business Settings</h1>
        <p className="text-xs text-neutral-500">
          Global booking policies, timezone, currency, and reservation window parameters stored in{' '}
          <code className="font-mono text-neutral-700">public.business_settings</code>.
        </p>
      </div>

      <form onSubmit={handleOpenConfirm} className="space-y-6">
        {/* Core Identity */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
          <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            Organization & Regional Parameters
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="settings-business-name" className="block text-xs font-semibold text-neutral-700 mb-1">
                Business Display Name * (max 120 chars)
              </label>
              <input
                id="settings-business-name"
                type="text"
                required
                maxLength={120}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="settings-currency" className="block text-xs font-semibold text-neutral-700 mb-1">
                Default Currency Code * (3 letters)
              </label>
              <input
                id="settings-currency"
                type="text"
                required
                pattern="^[A-Za-z]{3}$"
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full text-xs font-mono p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none uppercase"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="settings-timezone-select" className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-neutral-500" />
                <span>Primary Business Timezone * (IANA)</span>
              </label>
              <select
                id="settings-timezone-select"
                required
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full text-xs p-2 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none bg-white font-mono"
              >
                {availableTimezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-neutral-400 mt-1">
                All appointment availability rules, slot boundaries, and dates are anchored to this wall-clock timezone.
              </p>
            </div>
          </div>
        </div>

        {/* Booking Slots & Windows */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
          <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            Slot Generation & Notice Constraints
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="settings-slot-interval" className="block text-xs font-semibold text-neutral-700 mb-1">
                Slot Interval Minutes *
              </label>
              <select
                id="settings-slot-interval"
                required
                value={slotInterval}
                onChange={(e) => setSlotInterval(parseInt(e.target.value, 10))}
                className="w-full text-xs p-2 border border-neutral-300 rounded bg-white"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
              <p className="text-[10px] text-neutral-400 mt-0.5">Cadence of public bookable slots</p>
            </div>

            <div>
              <label htmlFor="settings-min-notice" className="block text-xs font-semibold text-neutral-700 mb-1">
                Minimum Notice (Minutes) *
              </label>
              <input
                id="settings-min-notice"
                type="number"
                min={0}
                required
                value={minNoticeMinutes}
                onChange={(e) => setMinNoticeMinutes(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs font-mono p-2 border border-neutral-300 rounded"
              />
              <p className="text-[10px] text-neutral-400 mt-0.5">Advance notice required to book</p>
            </div>

            <div>
              <label htmlFor="settings-max-advance" className="block text-xs font-semibold text-neutral-700 mb-1">
                Max Advance Booking (Days) * (1..730)
              </label>
              <input
                id="settings-max-advance"
                type="number"
                min={1}
                max={730}
                required
                value={maxAdvanceDays}
                onChange={(e) => setMaxAdvanceDays(parseInt(e.target.value, 10) || 1)}
                className="w-full text-xs font-mono p-2 border border-neutral-300 rounded"
              />
              <p className="text-[10px] text-neutral-400 mt-0.5">How far into future booking is open</p>
            </div>

            <div>
              <label htmlFor="settings-cancellation-window" className="block text-xs font-semibold text-neutral-700 mb-1">
                Cancellation Window (Hours) *
              </label>
              <input
                id="settings-cancellation-window"
                type="number"
                min={0}
                required
                value={cancellationWindowHours}
                onChange={(e) => setCancellationWindowHours(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs font-mono p-2 border border-neutral-300 rounded"
              />
              <p className="text-[10px] text-neutral-400 mt-0.5">Customer self-cancellation cutoff</p>
            </div>

            <div>
              <label htmlFor="settings-hold-minutes" className="block text-xs font-semibold text-neutral-700 mb-1">
                Hold Duration (Minutes) * (1..120)
              </label>
              <input
                id="settings-hold-minutes"
                type="number"
                min={1}
                max={120}
                required
                value={holdMinutes}
                onChange={(e) => setHoldMinutes(parseInt(e.target.value, 10) || 1)}
                className="w-full text-xs font-mono p-2 border border-neutral-300 rounded"
              />
              <p className="text-[10px] text-neutral-400 mt-0.5">Pending hold lock timer before expiry</p>
            </div>

            <div>
              <label htmlFor="settings-max-pending" className="block text-xs font-semibold text-neutral-700 mb-1">
                Max Pending Per User * (1..20)
              </label>
              <input
                id="settings-max-pending"
                type="number"
                min={1}
                max={20}
                required
                value={maxPendingPerUser}
                onChange={(e) => setMaxPendingPerUser(parseInt(e.target.value, 10) || 1)}
                className="w-full text-xs font-mono p-2 border border-neutral-300 rounded"
              />
              <p className="text-[10px] text-neutral-400 mt-0.5">Prevents customer slot hoarding</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-5 py-2.5 bg-neutral-900 text-white rounded text-xs font-medium hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center gap-2 shadow-xs"
          >
            {updateMutation.isPending ? (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Business Settings</span>
          </button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        title="Apply Changes to Business Settings?"
        description="Warning: Modifying business settings directly alters the public booking engine, slot generation intervals, hold expiration timers, and currency display. Are you sure you wish to apply these updates to the database?"
        confirmLabel="Yes, Save Settings"
        variant="warning"
        isLoading={updateMutation.isPending}
        onConfirm={handleExecuteSave}
        onCancel={() => setConfirmDialogOpen(false)}
      />
    </div>
  );
}
