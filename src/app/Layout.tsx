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
} from 'lucide-react';

export function Layout() {
  const { user, signOut } = useAuth();
  const { settings } = useBusinessSettings();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Bookings', href: '/bookings', icon: CalendarCheck2 },
    { name: 'Calendar', href: '/calendar', icon: CalendarDays },
    { name: 'Services', href: '/services', icon: Sparkles },
    { name: 'Resources', href: '/resources', icon: Layers },
    { name: 'Availability', href: '/availability', icon: Clock3 },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Audit Log', href: '/audit', icon: History },
    { name: 'Admins', href: '/admins', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex bg-neutral-100/70 text-neutral-900 font-sans antialiased">
      {/* Desktop Sidebar (260px) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-neutral-200 shrink-0 select-none">
        {/* Brand header */}
        <div className="h-14 px-5 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-neutral-900 text-white flex items-center justify-center font-bold text-xs tracking-tight">
              BK
            </div>
            <div className="truncate font-semibold text-sm tracking-tight text-neutral-900">
              {settings.business_name}
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? location.pathname === '/'
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

        {/* Sidebar Footer with Session & Timezone */}
        <div className="p-3 border-t border-neutral-200 space-y-2">
          {/* Timezone badge */}
          <div className="px-3 py-1.5 rounded bg-neutral-50 border border-neutral-200/80 flex items-center gap-2 text-[11px] text-neutral-600">
            <Globe2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <div className="truncate">
              <span className="text-neutral-400">TZ:</span>{' '}
              <span className="font-mono font-medium text-neutral-800">{settings.timezone}</span>
            </div>
          </div>

          {/* User profile & Sign Out */}
          <div className="flex items-center justify-between px-2 pt-1 text-xs">
            <div className="truncate flex-1 pr-2">
              <div className="truncate text-neutral-800 font-medium text-[11px]">
                {user?.email ?? 'Administrator'}
              </div>
              <div className="text-[10px] text-emerald-700 flex items-center gap-1">
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
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
            BK
          </div>
          <span className="font-semibold text-sm text-neutral-900 truncate max-w-[200px]">
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
