import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useBusinessSettings } from './SettingsProvider';
import {
  LayoutDashboard,
  CalendarCheck2,
  CalendarDays,
  Sparkles,
  Layers,
  Clock3,
  CreditCard,
  Users,
  Settings,
  History,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Globe2,
  ExternalLink,
} from 'lucide-react';

export function Layout() {
  const { user, signOut } = useAuth();
  const { settings } = useBusinessSettings();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Bookings', href: '/admin/bookings', icon: CalendarCheck2 },
    { name: 'Calendar', href: '/admin/calendar', icon: CalendarDays },
    { name: 'Services', href: '/admin/services', icon: Sparkles },
    { name: 'Resources', href: '/admin/resources', icon: Layers },
    { name: 'Availability', href: '/admin/availability', icon: Clock3 },
    { name: 'Payments', href: '/admin/payments', icon: CreditCard },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
    { name: 'Audit Log', href: '/admin/audit', icon: History },
    { name: 'Admins', href: '/admin/admins', icon: ShieldCheck },
  ];

  const initials = settings.logo_initials || settings.business_name.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex bg-neutral-100/70 text-neutral-900 font-sans antialiased">
      {/* Desktop Sidebar (260px) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-neutral-200 shrink-0 select-none">
        {/* Brand header */}
        <div className="h-14 px-5 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded text-white flex items-center justify-center font-bold text-xs tracking-tight shrink-0 shadow-xs transition-colors"
              style={{ backgroundColor: settings.brand_color || '#171717' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold text-xs tracking-tight text-neutral-900 leading-tight">
                {settings.business_name}
              </div>
              {settings.tagline && (
                <div className="truncate text-[10px] text-neutral-400 leading-tight">
                  {settings.tagline}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin'
                ? location.pathname === '/admin' || location.pathname === '/admin/'
                : location.pathname.startsWith(item.href);

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`group flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-700'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer with Live Storefront link, Session, Currency & Timezone */}
        <div className="p-3 border-t border-neutral-200 space-y-2">
          <NavLink
            to="/"
            className="px-3 py-2 rounded-md bg-neutral-900/5 hover:bg-neutral-900/10 border border-neutral-200 flex items-center justify-between text-xs font-semibold text-neutral-800 transition-colors"
          >
            <span>View Live Storefront</span>
            <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
          </NavLink>
          {/* Timezone & Currency badge */}
          <div className="px-3 py-1.5 rounded bg-neutral-50 border border-neutral-200/80 flex items-center justify-between text-[11px] text-neutral-600">
            <div className="flex items-center gap-1.5 truncate">
              <Globe2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="font-mono font-medium text-neutral-800 truncate">{settings.timezone}</span>
            </div>
            <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 bg-neutral-200/70 rounded text-neutral-700">
              {settings.currency_symbol || ''} {settings.currency}
            </span>
          </div>

          {/* User profile & Sign Out */}
          <div className="flex items-center justify-between px-2 pt-1 text-xs">
            <div className="truncate flex-1 pr-2">
              <div className="truncate text-neutral-800 font-medium text-[11px]">
                {user?.email ?? 'Administrator'}
              </div>
              <div className="text-[10px] text-emerald-700 flex items-center gap-1 font-mono">
                <span>MFA Verified (AAL2)</span>
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-white border-b border-neutral-200 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded text-white flex items-center justify-center font-bold text-xs shrink-0"
            style={{ backgroundColor: settings.brand_color || '#171717' }}
          >
            {initials}
          </div>
          <span className="font-semibold text-xs text-neutral-900 truncate max-w-[200px]">
            {settings.business_name}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-neutral-600 hover:text-neutral-900"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs pt-14"
        >
          <div className="bg-white h-full max-w-xs w-full p-4 flex flex-col space-y-1">
            <div className="flex-1 overflow-y-auto space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded text-xs font-medium ${
                      isActive ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </div>
            <div className="pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={signOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-rose-700 hover:bg-rose-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col min-w-0 md:pt-0 pt-14 overflow-y-auto">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
