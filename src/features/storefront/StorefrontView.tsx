import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  MapPin,
  Mail,
  Phone,
  Search,
  CalendarCheck,
  Sparkles,
} from 'lucide-react';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { usePublicServices, usePublicResources } from '../../api/storefront';
import type { ServiceRow } from '../../api/services';
import { formatCurrency } from '../../lib/money';
import { STOREFRONT_HERO_IMAGE, resolveServiceImage } from './storefrontImages';
import { BookingCheckoutDrawer } from './BookingCheckoutDrawer';
import { ManageBookingModal } from './ManageBookingModal';

function ServiceCardImage({
  src,
  alt,
  title,
}: {
  src: string;
  alt: string;
  title: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="w-full aspect-[4/3] bg-stone-200 flex flex-col items-center justify-center p-6 text-center">
        <Sparkles className="w-6 h-6 text-stone-400 mb-2" />
        <span className="font-display text-lg text-stone-700">{title}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className="w-full aspect-[4/3] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
    />
  );
}

export function StorefrontView() {
  const { settings } = useBusinessSettings();
  const { data: services, isLoading: servicesLoading, error: servicesError } = usePublicServices();
  const { data: resources } = usePublicResources();

  const [searchQuery, setSearchQuery] = useState('');
  const [durationFilter, setDurationFilter] = useState<'all' | 'express' | 'standard' | 'extended'>('all');
  const [selectedService, setSelectedService] = useState<ServiceRow | null>(null);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);

  const brandColor = settings.brand_color || '#0f172a';
  const activeServices = services ?? [];
  const activeResources = resources ?? [];

  const filteredServices = useMemo(() => {
    return activeServices.filter((svc) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = svc.name.toLowerCase().includes(q);
        const matchDesc = (svc.description ?? '').toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }

      if (durationFilter === 'express') return svc.duration_minutes <= 45;
      if (durationFilter === 'standard') return svc.duration_minutes > 45 && svc.duration_minutes <= 60;
      if (durationFilter === 'extended') return svc.duration_minutes > 60;
      return true;
    });
  }, [activeServices, searchQuery, durationFilter]);

  const handleOpenDefaultBooking = () => {
    const first = activeServices[0] ?? null;
    if (first) {
      setSelectedService(first);
    } else {
      document.getElementById('treatments')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-neutral-900 flex flex-col">
      {/* Zone-disciplined 3-Zone Top Bar */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single wordmark */}
          <a
            href="#top"
            className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 whitespace-nowrap shrink-0 truncate max-w-[260px]"
          >
            {settings.business_name}
          </a>

          {/* Zone 2: 4 concise single-line text links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
            <a
              href="#treatments"
              className="hover:text-neutral-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Treatments
            </a>
            <a
              href="#specialists"
              className="hover:text-neutral-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Specialists
            </a>
            <button
              type="button"
              onClick={() => setIsManageOpen(true)}
              className="hover:text-neutral-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Manage Booking
            </button>
            <Link
              to="/admin"
              className="hover:text-neutral-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Admin Portal
            </Link>
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleOpenDefaultBooking}
              style={{ backgroundColor: brandColor }}
              className="px-4 py-2 text-xs font-semibold text-white rounded-md hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
            >
              Book Appointment
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Section 1: Architectural Split Hero */}
        <section className="max-w-7xl mx-auto px-6 lg:px-8 pt-10 pb-12 lg:pt-14 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            {/* Left Copy Column */}
            <div className="lg:col-span-5 flex flex-col justify-between py-2 space-y-8">
              <div className="space-y-5">
                <p className="text-xs font-medium text-neutral-500">
                  {settings.address || 'Private Consultations & Appointments'}
                </p>

                <h1
                  className="font-display font-semibold text-neutral-900 tracking-tight leading-[1.06]"
                  style={{ fontSize: 'clamp(2.35rem, 4vw, 3.65rem)', textWrap: 'balance' }}
                >
                  Restorative clinical care, booked on your schedule.
                </h1>

                <p className="text-base text-neutral-600 leading-relaxed max-w-prose">
                  {settings.tagline ||
                    'Reserve private one-on-one consultations, remedial therapies, and specialist assessments with live calendar availability.'}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <a
                    href="#treatments"
                    style={{ backgroundColor: brandColor }}
                    className="px-6 py-3 rounded-md text-white text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
                  >
                    <span>Explore Treatments</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsManageOpen(true)}
                    className="px-5 py-3 rounded-md border border-stone-300 bg-white text-neutral-800 text-sm font-medium hover:border-neutral-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Manage Existing Booking
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-stone-200 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                <span>{settings.timezone}</span>
                <span aria-hidden="true">·</span>
                <span>{activeServices.length} Curated Treatments</span>
                <span aria-hidden="true">·</span>
                <span>Instant Confirmation</span>
              </div>
            </div>

            {/* Right Architectural Media Column */}
            <div className="lg:col-span-7">
              <div className="h-full min-h-[300px] lg:min-h-[440px] rounded-xl overflow-hidden bg-stone-200 border border-stone-200/80">
                {heroImgError ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-stone-600">
                    <Sparkles className="w-8 h-8 mb-3 text-stone-400" />
                    <span className="font-display text-2xl">{settings.business_name}</span>
                  </div>
                ) : (
                  <img
                    src={STOREFRONT_HERO_IMAGE}
                    alt={`${settings.business_name} reception sanctuary`}
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Full-width 4-Column Practice Standards Strip */}
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-6 pt-8 border-t border-stone-200">
            <div>
              <div className="text-xs text-neutral-500">Booking Window</div>
              <div className="mt-1 font-mono text-sm font-semibold text-neutral-900 tabular-nums">
                Up to {settings.max_advance_days} days ahead
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Minimum Notice</div>
              <div className="mt-1 font-mono text-sm font-semibold text-neutral-900 tabular-nums">
                {settings.min_notice_minutes} minutes prior
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Free Cancellation</div>
              <div className="mt-1 font-mono text-sm font-semibold text-neutral-900 tabular-nums">
                {settings.cancellation_window_hours} hours notice
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Payment Policy</div>
              <div className="mt-1 font-mono text-sm font-semibold text-neutral-900 tabular-nums">
                {settings.enable_online_payments
                  ? settings.require_deposit
                    ? `${settings.deposit_percentage ?? 20}% Reservation Deposit`
                    : `Online Hold (${settings.currency})`
                  : 'Pay at Venue'}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Featured Treatments Catalog */}
        <section id="treatments" className="bg-white border-y border-stone-200/80 py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-neutral-900 tracking-tight">
                  Treatments & Consultations
                </h2>
                <p className="text-sm text-neutral-600">
                  Select a treatment below to inspect live practitioner openings and reserve your session.
                </p>
              </div>

              {/* Filter & Search Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search treatments..."
                    className="w-full sm:w-52 pl-9 pr-3 py-2 text-xs rounded-md border border-stone-300 bg-[#FAF9F6] text-neutral-900 focus:border-neutral-900 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-md">
                  {(
                    [
                      { key: 'all', label: 'All' },
                      { key: 'express', label: '≤ 45m' },
                      { key: 'standard', label: '60m' },
                      { key: 'extended', label: '90m+' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setDurationFilter(tab.key)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        durationFilter === tab.key
                          ? 'bg-white text-neutral-900 shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {servicesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="rounded-lg border border-stone-200 overflow-hidden bg-stone-50 h-96 animate-pulse" />
                ))}
              </div>
            ) : servicesError ? (
              <div className="p-6 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-800">
                Unable to load treatments right now. Please refresh or contact {settings.support_email || 'support'}.
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="p-12 rounded-lg border border-stone-200 bg-[#FAF9F6] text-center space-y-2">
                <p className="text-sm font-semibold text-neutral-900">No matching treatments found</p>
                <p className="text-xs text-neutral-500">Try clearing your search or duration filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredServices.map((svc, idx) => {
                  const imgSrc = resolveServiceImage(svc.image_url, svc.slug, idx);
                  const depositDue =
                    settings.enable_online_payments && settings.require_deposit
                      ? Math.round((svc.price_minor * (settings.deposit_percentage ?? 20)) / 100)
                      : null;

                  return (
                    <article
                      key={svc.id}
                      className="group flex flex-col justify-between bg-[#FAF9F6] rounded-lg border border-stone-200/90 overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div>
                        <div className="overflow-hidden bg-stone-200">
                          <ServiceCardImage
                            src={imgSrc}
                            alt={svc.name}
                            title={svc.name}
                          />
                        </div>

                        <div className="p-6 space-y-3">
                          <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono tabular-nums">
                            <span>{svc.duration_minutes} minutes</span>
                            <span aria-hidden="true">·</span>
                            <span>{svc.currency}</span>
                          </div>

                          <h3 className="text-lg font-semibold text-neutral-900 leading-snug">
                            {svc.name}
                          </h3>

                          <p className="text-sm text-neutral-600 leading-relaxed line-clamp-3">
                            {svc.description ||
                              'Personalized one-on-one session tailored to your clinical goals.'}
                          </p>
                        </div>
                      </div>

                      <div className="px-6 pb-6 pt-4 border-t border-stone-200/70 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-mono text-base font-semibold text-neutral-900 tabular-nums">
                            {formatCurrency(svc.price_minor, svc.currency)}
                          </div>
                          {depositDue !== null && (
                            <div className="text-[11px] text-neutral-500 font-mono tabular-nums">
                              {formatCurrency(depositDue, svc.currency)} deposit
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedService(svc)}
                          style={{ backgroundColor: brandColor }}
                          className="px-4 py-2 rounded-md text-white text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Select Time
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Specialists & Practice Details */}
        <section id="specialists" className="max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Specialists Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <h2 className="font-display text-3xl font-semibold text-neutral-900 tracking-tight">
                  Specialists & Treatment Suites
                </h2>
                <p className="text-sm text-neutral-600">
                  Every appointment is conducted in private suites by credentialed clinicians and therapists.
                </p>
              </div>

              <div className="divide-y divide-stone-200 border-y border-stone-200">
                {activeResources.length === 0 ? (
                  <div className="py-6 text-sm text-neutral-500">
                    Specialist roster is being updated.
                  </div>
                ) : (
                  activeResources.map((res) => (
                    <div key={res.id} className="py-5 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-neutral-500 capitalize">
                          <span>{res.kind}</span>
                        </div>
                        <h3 className="text-base font-semibold text-neutral-900">{res.name}</h3>
                        {res.description && (
                          <p className="text-sm text-neutral-600 max-w-xl leading-relaxed">
                            {res.description}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenDefaultBooking}
                        className="px-3.5 py-2 rounded-md border border-stone-300 bg-white text-xs font-medium text-neutral-900 hover:border-neutral-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Check Openings
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Clinic Standards & Contact Column */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-stone-200 rounded-xl p-7 space-y-6">
                <div className="space-y-2">
                  <h3 className="font-display text-2xl font-semibold text-neutral-900">
                    Practice Policies & Concierge
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    {settings.cancellation_policy ||
                      `Cancellations made at least ${settings.cancellation_window_hours} hours prior to your appointment incur no charge.`}
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-stone-200 text-sm text-neutral-700">
                  {settings.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mt-1" />
                      <span>{settings.address}</span>
                    </div>
                  )}
                  {settings.support_email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
                      <a href={`mailto:${settings.support_email}`} className="hover:underline">
                        {settings.support_email}
                      </a>
                    </div>
                  )}
                  {settings.support_phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-neutral-400 shrink-0" />
                      <a href={`tel:${settings.support_phone}`} className="hover:underline font-mono">
                        {settings.support_phone}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="font-mono text-xs text-neutral-600">{settings.timezone}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsManageOpen(true)}
                    className="w-full py-2.5 px-4 rounded-md border border-stone-300 text-xs font-semibold text-neutral-900 hover:bg-stone-50 inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CalendarCheck className="w-4 h-4" />
                    <span>Look Up or Cancel a Booking</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-stone-200 py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div>
            © {new Date().getFullYear()} {settings.business_name}. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setIsManageOpen(true)}
              className="hover:text-neutral-900 cursor-pointer"
            >
              Manage Booking
            </button>
            <Link to="/admin" className="hover:text-neutral-900">
              Admin & Staff Portal
            </Link>
          </div>
        </div>
      </footer>

      {/* Booking Checkout Drawer */}
      <BookingCheckoutDrawer
        service={selectedService}
        resources={activeResources}
        onClose={() => setSelectedService(null)}
      />

      {/* Manage Booking Modal */}
      <ManageBookingModal
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
      />
    </div>
  );
}
