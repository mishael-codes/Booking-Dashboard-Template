import React, { useState, useEffect, useMemo } from 'react';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { useUpdateBusinessSettings } from '../../api/settings';
import { useToast } from '../../components/Toast';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatCurrency } from '../../lib/money';
import {
  Settings,
  Save,
  Globe2,
  Clock,
  Sparkles,
  Building2,
  Mail,
  Phone,
  MapPin,
  Palette,
  CreditCard,
  ShieldAlert,
  SlidersHorizontal,
  Coins,
  CheckCircle2,
  RefreshCw,
  FileText,
  Eye,
} from 'lucide-react';

const BRAND_PRESET_COLORS = [
  { name: 'Slate Night', hex: '#0f172a' },
  { name: 'Indigo Core', hex: '#312e81' },
  { name: 'Ocean Sky', hex: '#0284c7' },
  { name: 'Emerald Forest', hex: '#065f46' },
  { name: 'Royal Violet', hex: '#6b21a8' },
  { name: 'Crimson Wine', hex: '#881337' },
  { name: 'Warm Amber', hex: '#78350f' },
  { name: 'Carbon Black', hex: '#171717' },
];

const CURRENCY_PRESETS = [
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira (₦)' },
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CA$)' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling (KSh)' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand (R)' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi (GH₵)' },
];

export function SettingsView() {
  const { settings, refetch } = useBusinessSettings();
  const { showSuccess, showError } = useToast();
  const updateMutation = useUpdateBusinessSettings();

  const [activeTab, setActiveTab] = useState<'branding' | 'localization' | 'scheduling' | 'policies'>('branding');

  // Form State
  const [businessName, setBusinessName] = useState(settings.business_name);
  const [tagline, setTagline] = useState(settings.tagline || '');
  const [logoInitials, setLogoInitials] = useState(settings.logo_initials || '');
  const [brandColor, setBrandColor] = useState(settings.brand_color || '#0f172a');
  const [supportEmail, setSupportEmail] = useState(settings.support_email || '');
  const [supportPhone, setSupportPhone] = useState(settings.support_phone || '');
  const [address, setAddress] = useState(settings.address || '');

  const [timezone, setTimezone] = useState(settings.timezone);
  const [currency, setCurrency] = useState(settings.currency);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currency_symbol || '₦');

  const [slotInterval, setSlotInterval] = useState(settings.slot_interval_minutes);
  const [minNoticeMinutes, setMinNoticeMinutes] = useState(settings.min_notice_minutes);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(settings.max_advance_days);
  const [holdMinutes, setHoldMinutes] = useState(settings.hold_minutes);
  const [maxPendingPerUser, setMaxPendingPerUser] = useState(settings.max_pending_per_user);

  const [enableOnlinePayments, setEnableOnlinePayments] = useState(settings.enable_online_payments ?? true);
  const [requireDeposit, setRequireDeposit] = useState(settings.require_deposit ?? false);
  const [depositPercentage, setDepositPercentage] = useState(settings.deposit_percentage ?? 20);
  const [cancellationWindowHours, setCancellationWindowHours] = useState(settings.cancellation_window_hours);
  const [cancellationPolicy, setCancellationPolicy] = useState(settings.cancellation_policy || '');

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Sync state when settings refresh
  useEffect(() => {
    setBusinessName(settings.business_name);
    setTagline(settings.tagline || '');
    setLogoInitials(settings.logo_initials || '');
    setBrandColor(settings.brand_color || '#0f172a');
    setSupportEmail(settings.support_email || '');
    setSupportPhone(settings.support_phone || '');
    setAddress(settings.address || '');

    setTimezone(settings.timezone);
    setCurrency(settings.currency);
    setCurrencySymbol(settings.currency_symbol || '₦');

    setSlotInterval(settings.slot_interval_minutes);
    setMinNoticeMinutes(settings.min_notice_minutes);
    setMaxAdvanceDays(settings.max_advance_days);
    setHoldMinutes(settings.hold_minutes);
    setMaxPendingPerUser(settings.max_pending_per_user);

    setEnableOnlinePayments(settings.enable_online_payments ?? true);
    setRequireDeposit(settings.require_deposit ?? false);
    setDepositPercentage(settings.deposit_percentage ?? 20);
    setCancellationWindowHours(settings.cancellation_window_hours);
    setCancellationPolicy(settings.cancellation_policy || '');
  }, [settings]);

  // Available IANA timezones
  const availableTimezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone');
    } catch {
      return ['Africa/Lagos', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];
    }
  }, []);

  const handleDetectTimezone = () => {
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (userTz) {
        setTimezone(userTz);
        showSuccess(`Timezone set to your browser location: ${userTz}`);
      }
    } catch {
      showError('Could not detect local browser timezone.');
    }
  };

  const handleSelectCurrencyPreset = (preset: { code: string; symbol: string }) => {
    setCurrency(preset.code);
    setCurrencySymbol(preset.symbol);
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmDialogOpen(true);
  };

  const handleExecuteSave = async () => {
    try {
      await updateMutation.mutateAsync({
        business_name: businessName,
        tagline,
        logo_initials: logoInitials || businessName.slice(0, 2).toUpperCase(),
        brand_color: brandColor,
        support_email: supportEmail,
        support_phone: supportPhone,
        address,
        timezone,
        currency,
        currency_symbol: currencySymbol,
        slot_interval_minutes: slotInterval,
        min_notice_minutes: minNoticeMinutes,
        max_advance_days: maxAdvanceDays,
        hold_minutes: holdMinutes,
        max_pending_per_user: maxPendingPerUser,
        enable_online_payments: enableOnlinePayments,
        require_deposit: requireDeposit,
        deposit_percentage: depositPercentage,
        cancellation_window_hours: cancellationWindowHours,
        cancellation_policy: cancellationPolicy,
      });

      showSuccess('Business settings updated and saved successfully.');
      setConfirmDialogOpen(false);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update business settings.';
      showError(msg);
      setConfirmDialogOpen(false);
    }
  };

  const previewInitials = logoInitials || businessName.slice(0, 2).toUpperCase() || 'BK';

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Business & White-Label Settings</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-200 text-neutral-800">
              Live Config
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Customize branding, logo, regional currency, operational booking windows, and policy parameters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 border border-neutral-300 rounded text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors text-xs flex items-center gap-1.5"
            title="Reload saved database settings"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reload</span>
          </button>
          <button
            type="button"
            onClick={handleExecuteSave}
            disabled={updateMutation.isPending}
            className="px-4 py-2 bg-neutral-900 text-white rounded text-xs font-medium hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center gap-2 shadow-xs cursor-pointer"
          >
            {updateMutation.isPending ? (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save All Settings</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Left, Real-Time White-Label Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Area (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Tabs Navigation */}
          <div className="flex border-b border-neutral-200 bg-white rounded-t-lg px-2 pt-2 gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('branding')}
              className={`px-3 py-2 text-xs font-semibold rounded-t border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'branding'
                  ? 'border-neutral-900 text-neutral-900 bg-neutral-50'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Branding & Identity</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('localization')}
              className={`px-3 py-2 text-xs font-semibold rounded-t border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'localization'
                  ? 'border-neutral-900 text-neutral-900 bg-neutral-50'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Currency & Region</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('scheduling')}
              className={`px-3 py-2 text-xs font-semibold rounded-t border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'scheduling'
                  ? 'border-neutral-900 text-neutral-900 bg-neutral-50'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Booking Rules</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('policies')}
              className={`px-3 py-2 text-xs font-semibold rounded-t border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'policies'
                  ? 'border-neutral-900 text-neutral-900 bg-neutral-50'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Payments & Policies</span>
            </button>
          </div>

          <form onSubmit={handleOpenConfirm} className="space-y-4">
            {/* Tab 1: Branding & Identity */}
            {activeTab === 'branding' && (
              <div className="bg-white border border-neutral-200 rounded-b-lg p-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Company Branding & Visual Presence
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    These values populate the customer checkout, staff calendar, client receipts, and admin navigation.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label htmlFor="cfg-biz-name" className="block text-xs font-semibold text-neutral-700 mb-1">
                      Business Display Name * (Max 120 chars)
                    </label>
                    <input
                      id="cfg-biz-name"
                      type="text"
                      required
                      maxLength={120}
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Apex Vitality & Wellness Clinic"
                      className="w-full text-xs p-2.5 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="cfg-tagline" className="block text-xs font-semibold text-neutral-700 mb-1">
                      Tagline / Business Subtitle
                    </label>
                    <input
                      id="cfg-tagline"
                      type="text"
                      maxLength={160}
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g. Premier aesthetic wellness & medical practice"
                      className="w-full text-xs p-2.5 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="cfg-initials" className="block text-xs font-semibold text-neutral-700 mb-1">
                      Monogram / Initials (2-3 chars)
                    </label>
                    <input
                      id="cfg-initials"
                      type="text"
                      maxLength={4}
                      value={logoInitials}
                      onChange={(e) => setLogoInitials(e.target.value.toUpperCase())}
                      placeholder="e.g. AV"
                      className="w-full text-xs font-mono font-bold p-2.5 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none uppercase"
                    />
                    <p className="text-[10px] text-neutral-400 mt-0.5">Used as avatar monogram across portal</p>
                  </div>

                  <div>
                    <label htmlFor="cfg-brand-color" className="block text-xs font-semibold text-neutral-700 mb-1">
                      Brand Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="cfg-brand-color"
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="w-9 h-9 p-0.5 border border-neutral-300 rounded cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        placeholder="#0f172a"
                        className="w-full text-xs font-mono p-2.5 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none uppercase"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-neutral-600 mb-1.5">
                      Quick Palette Presets:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {BRAND_PRESET_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setBrandColor(c.hex)}
                          className={`px-2.5 py-1 rounded text-[11px] flex items-center gap-1.5 border transition-all cursor-pointer ${
                            brandColor.toLowerCase() === c.hex.toLowerCase()
                              ? 'border-neutral-900 bg-neutral-100 font-bold'
                              : 'border-neutral-200 hover:border-neutral-400 bg-white'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="cfg-email" className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Customer Support Email</span>
                    </label>
                    <input
                      id="cfg-email"
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="care@yourbusiness.com"
                      className="w-full text-xs p-2.5 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="cfg-phone" className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Support Telephone</span>
                    </label>
                    <input
                      id="cfg-phone"
                      type="text"
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      placeholder="+234 800 000 1111"
                      className="w-full text-xs p-2.5 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="cfg-address" className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Operating Address / Physical Facility</span>
                    </label>
                    <input
                      id="cfg-address"
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria"
                      className="w-full text-xs p-2.5 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Currency & Region */}
            {activeTab === 'localization' && (
              <div className="bg-white border border-neutral-200 rounded-b-lg p-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Currency Formatting & Wall-Clock Timezone
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Defines how payment amounts are calculated in minor units and which wall-clock schedule governs slot intervals.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Popular Currency Presets:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {CURRENCY_PRESETS.map((p) => (
                        <button
                          key={p.code}
                          type="button"
                          onClick={() => handleSelectCurrencyPreset(p)}
                          className={`p-2 rounded text-left border text-xs transition-all cursor-pointer ${
                            currency === p.code
                              ? 'border-neutral-900 bg-neutral-900 text-white font-semibold'
                              : 'border-neutral-200 hover:border-neutral-400 bg-white text-neutral-800'
                          }`}
                        >
                          <div className="font-bold text-sm">{p.symbol} {p.code}</div>
                          <div className={`text-[10px] truncate ${currency === p.code ? 'text-neutral-300' : 'text-neutral-500'}`}>
                            {p.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label htmlFor="cfg-currency-code" className="block text-xs font-semibold text-neutral-700 mb-1">
                        ISO Currency Code * (3 letters)
                      </label>
                      <input
                        id="cfg-currency-code"
                        type="text"
                        required
                        pattern="^[A-Za-z]{3}$"
                        maxLength={3}
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                        placeholder="NGN"
                        className="w-full text-xs font-mono font-bold p-2.5 border border-neutral-300 rounded uppercase focus:border-neutral-900 focus:outline-none"
                      />
                      <p className="text-[10px] text-neutral-400 mt-0.5">Used for Paystack / Stripe minor unit conversions</p>
                    </div>

                    <div>
                      <label htmlFor="cfg-currency-symbol" className="block text-xs font-semibold text-neutral-700 mb-1">
                        Currency Symbol / Prefix
                      </label>
                      <input
                        id="cfg-currency-symbol"
                        type="text"
                        maxLength={6}
                        value={currencySymbol}
                        onChange={(e) => setCurrencySymbol(e.target.value)}
                        placeholder="₦"
                        className="w-full text-xs font-mono font-bold p-2.5 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                      />
                      <p className="text-[10px] text-neutral-400 mt-0.5">E.g. ₦, $, £, €, KSh, R</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="cfg-timezone" className="block text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                        <Globe2 className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Business Operating Timezone (IANA) *</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleDetectTimezone}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                      >
                        Detect My Timezone
                      </button>
                    </div>
                    <select
                      id="cfg-timezone"
                      required
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full text-xs p-2.5 border border-neutral-300 rounded bg-white font-mono focus:border-neutral-900 focus:outline-none"
                    >
                      {availableTimezones.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Staff shifts, public booking windows, and calendar views are calculated against this wall-clock timezone.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Scheduling Rules */}
            {activeTab === 'scheduling' && (
              <div className="bg-white border border-neutral-200 rounded-b-lg p-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Booking Slot Cadence & Anti-Hoarding Constraints
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Controls automatic appointment slot generation, lead time requirements, and temporary checkout holds.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cfg-slot-interval" className="block text-xs font-semibold text-neutral-700 mb-1">
                      Slot Generation Interval *
                    </label>
                    <select
                      id="cfg-slot-interval"
                      required
                      value={slotInterval}
                      onChange={(e) => setSlotInterval(parseInt(e.target.value, 10))}
                      className="w-full text-xs p-2.5 border border-neutral-300 rounded bg-white focus:border-neutral-900 focus:outline-none"
                    >
                      <option value={5}>5 minutes</option>
                      <option value={10}>10 minutes</option>
                      <option value={15}>15 minutes (Express)</option>
                      <option value={20}>20 minutes</option>
                      <option value={30}>30 minutes (Standard)</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes (Hourly)</option>
                    </select>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Starting offset intervals for available booking slots</p>
                  </div>

                  <div>
                    <label htmlFor="cfg-min-notice" className="block text-xs font-semibold text-neutral-700 mb-1">
                      Minimum Notice Required (Minutes) *
                    </label>
                    <input
                      id="cfg-min-notice"
                      type="number"
                      min={0}
                      required
                      value={minNoticeMinutes}
                      onChange={(e) => setMinNoticeMinutes(parseInt(e.target.value, 10) || 0)}
                      className="w-full text-xs font-mono p-2.5 border border-neutral-300 rounded"
                    />
                    <p className="text-[10px] text-neutral-400 mt-0.5">E.g. 60 = clients cannot book within 1 hour of appointment</p>
                  </div>

                  <div>
                    <label htmlFor="cfg-max-advance" className="block text-xs font-semibold text-neutral-700 mb-1">
                      Max Advance Booking Window (Days) *
                    </label>
                    <input
                      id="cfg-max-advance"
                      type="number"
                      min={1}
                      max={730}
                      required
                      value={maxAdvanceDays}
                      onChange={(e) => setMaxAdvanceDays(parseInt(e.target.value, 10) || 1)}
                      className="w-full text-xs font-mono p-2.5 border border-neutral-300 rounded"
                    />
                    <p className="text-[10px] text-neutral-400 mt-0.5">How far out into future calendar appointments can be reserved</p>
                  </div>

                  <div>
                    <label htmlFor="cfg-hold-minutes" className="block text-xs font-semibold text-neutral-700 mb-1">
                      Checkout Hold Lock Timer (Minutes) *
                    </label>
                    <input
                      id="cfg-hold-minutes"
                      type="number"
                      min={1}
                      max={120}
                      required
                      value={holdMinutes}
                      onChange={(e) => setHoldMinutes(parseInt(e.target.value, 10) || 1)}
                      className="w-full text-xs font-mono p-2.5 border border-neutral-300 rounded"
                    />
                    <p className="text-[10px] text-neutral-400 mt-0.5">Slot is locked exclusively for customer during payment</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="cfg-max-pending" className="block text-xs font-semibold text-neutral-700 mb-1">
                      Max Concurrent Pending Holds per User *
                    </label>
                    <input
                      id="cfg-max-pending"
                      type="number"
                      min={1}
                      max={20}
                      required
                      value={maxPendingPerUser}
                      onChange={(e) => setMaxPendingPerUser(parseInt(e.target.value, 10) || 1)}
                      className="w-full text-xs font-mono p-2.5 border border-neutral-300 rounded"
                    />
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      Prevents competitor hoarding by capping simultaneous incomplete checkout slots per client.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Payments & Policies */}
            {activeTab === 'policies' && (
              <div className="bg-white border border-neutral-200 rounded-b-lg p-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Online Payments, Deposits & Cancellation Terms
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Configure customer deposit rules and self-service cancellation window parameters.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">Enable Online Card Payments</div>
                      <div className="text-[11px] text-neutral-500">Allow customers to pay via Paystack / Card during booking</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableOnlinePayments}
                        onChange={(e) => setEnableOnlinePayments(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-900"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">Require Upfront Booking Deposit</div>
                      <div className="text-[11px] text-neutral-500">Require partial downpayment instead of full fee upfront</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requireDeposit}
                        onChange={(e) => setRequireDeposit(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-900"></div>
                    </label>
                  </div>

                  {requireDeposit && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                      <label htmlFor="cfg-deposit-percent" className="block text-xs font-semibold text-amber-900">
                        Upfront Deposit Percentage (%)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          id="cfg-deposit-percent"
                          type="range"
                          min={10}
                          max={90}
                          step={5}
                          value={depositPercentage}
                          onChange={(e) => setDepositPercentage(parseInt(e.target.value, 10))}
                          className="flex-1 cursor-pointer accent-amber-700"
                        />
                        <span className="font-mono font-bold text-xs text-amber-900 bg-amber-200/80 px-2 py-1 rounded">
                          {depositPercentage}%
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Clients will be charged {depositPercentage}% of total service cost to secure their slot.
                      </p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="cfg-cancel-window" className="block text-xs font-semibold text-neutral-700 mb-1">
                      Customer Cancellation Cutoff Window (Hours) *
                    </label>
                    <input
                      id="cfg-cancel-window"
                      type="number"
                      min={0}
                      required
                      value={cancellationWindowHours}
                      onChange={(e) => setCancellationWindowHours(parseInt(e.target.value, 10) || 0)}
                      className="w-full text-xs font-mono p-2.5 border border-neutral-300 rounded"
                    />
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      Cutoff before which clients can cancel or reschedule without penalty (e.g. 24 hours).
                    </p>
                  </div>

                  <div>
                    <label htmlFor="cfg-cancel-policy" className="block text-xs font-semibold text-neutral-700 mb-1">
                      Customer Cancellation & Refund Policy Text
                    </label>
                    <textarea
                      id="cfg-cancel-policy"
                      rows={3}
                      value={cancellationPolicy}
                      onChange={(e) => setCancellationPolicy(e.target.value)}
                      placeholder="Cancellations made at least 24 hours prior to appointment incur no penalty..."
                      className="w-full text-xs p-2.5 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-5 py-2.5 bg-neutral-900 text-white rounded text-xs font-medium hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {updateMutation.isPending ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save All Business Settings</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Area: Interactive Live White-Label Preview Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-neutral-900 text-white rounded-xl p-5 shadow-xl border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-neutral-300">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Live White-Label Preview</span>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-neutral-800 text-neutral-400">
                Real-Time
              </span>
            </div>

            <p className="text-[11px] text-neutral-400">
              This card simulates how your buyer&apos;s brand, monogram, currency, and contacts will render to customers:
            </p>

            {/* Simulated Customer Header */}
            <div className="bg-neutral-950 rounded-lg p-3.5 border border-neutral-800 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg text-white flex items-center justify-center font-bold text-sm tracking-tight shrink-0 shadow-md transition-colors"
                  style={{ backgroundColor: brandColor || '#0f172a' }}
                >
                  {previewInitials}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-white truncate">{businessName || 'Business Name'}</div>
                  <div className="text-[10px] text-neutral-400 truncate">
                    {tagline || 'Business description'}
                  </div>
                </div>
              </div>

              {/* Sample Price Tag */}
              <div className="p-2 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Sample Consultation Fee:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatCurrency(4500000, currency)}
                </span>
              </div>

              {/* Sample Deposit Notice */}
              {requireDeposit && (
                <div className="p-2 rounded bg-amber-950/60 border border-amber-800/60 text-[11px] text-amber-200 flex justify-between items-center">
                  <span>Required Deposit ({depositPercentage}%):</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(4500000 * (depositPercentage / 100), currency)}
                  </span>
                </div>
              )}

              {/* Contact Snapshot */}
              <div className="text-[11px] text-neutral-400 space-y-1 pt-1 font-mono">
                {supportEmail && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 text-neutral-500 shrink-0" />
                    <span className="truncate">{supportEmail}</span>
                  </div>
                )}
                {supportPhone && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3 h-3 text-neutral-500 shrink-0" />
                    <span className="truncate">{supportPhone}</span>
                  </div>
                )}
                {address && (
                  <div className="flex items-center gap-1.5 truncate text-[10px]">
                    <MapPin className="w-3 h-3 text-neutral-500 shrink-0" />
                    <span className="truncate">{address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Summary of Active Operational Parameters */}
            <div className="rounded-lg bg-neutral-950/70 border border-neutral-800 p-3 text-[11px] text-neutral-300 space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-neutral-500">Wall-Clock TZ:</span>
                <span className="text-neutral-200">{timezone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Slot Cadence:</span>
                <span className="text-neutral-200">{slotInterval} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Advance Notice:</span>
                <span className="text-neutral-200">{minNoticeMinutes} mins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Hold Expiration:</span>
                <span className="text-neutral-200">{holdMinutes} mins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Online Payments:</span>
                <span className={enableOnlinePayments ? 'text-emerald-400' : 'text-neutral-400'}>
                  {enableOnlinePayments ? 'Active' : 'Pay at Venue'}
                </span>
              </div>
            </div>

            {/* Cancellation Terms Snippet */}
            {cancellationPolicy && (
              <div className="text-[10px] text-neutral-400 bg-neutral-950 p-2.5 rounded border border-neutral-800 italic">
                &ldquo;{cancellationPolicy}&rdquo;
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        title="Apply Updates to Business Settings?"
        description="Warning: Modifying business settings directly alters the customer-facing booking engine, slot generation intervals, hold expiration timers, and currency display. Are you sure you wish to apply these updates?"
        confirmLabel="Yes, Save Settings"
        variant="warning"
        isLoading={updateMutation.isPending}
        onConfirm={handleExecuteSave}
        onCancel={() => setConfirmDialogOpen(false)}
      />
    </div>
  );
}
