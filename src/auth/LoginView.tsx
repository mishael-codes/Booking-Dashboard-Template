import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../api/supabase';
import { useAuth } from './AuthProvider';
import { useBusinessSettings } from '../app/SettingsProvider';
import { env } from '../lib/env';
import {
  Lock,
  Mail,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Code2,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';

export function LoginView() {
  const { enterDemoMode, setAuthError } = useAuth();
  const { settings } = useBusinessSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'forgot'>('login');

  // Strictly gate DEV bypass on compile-time Vite DEV flag (never allow URL ?dev=true in prod!)
  const isDevEnvironment = import.meta.env.DEV === true;

  const [showDevBypass, setShowDevBypass] = useState<boolean>(() => {
    if (!isDevEnvironment) return false;
    try {
      const stored = localStorage.getItem('booking_simulate_prod_login');
      return stored !== 'true';
    } catch {
      return true;
    }
  });

  const DEMO_EMAIL = 'admin@bookingbusiness.com';
  const DEMO_PASSWORD = 'AdminPassword123!';

  const handleToggleDevMode = () => {
    if (!isDevEnvironment) return;
    const nextState = !showDevBypass;
    setShowDevBypass(nextState);
    try {
      localStorage.setItem('booking_simulate_prod_login', String(!nextState));
    } catch {
      // ignore
    }
  };

  const handleFillCredentials = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setErrorMessage(null);
  };

  const handleInstantDemoLogin = () => {
    if (!isDevEnvironment || !showDevBypass) {
      setErrorMessage('Test bypass login is disabled in production builds.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setAuthError(null);
    setTimeout(() => {
      enterDemoMode();
    }, 200);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    if (!env.isConfigured) {
      setIsLoading(false);
      setInfoMessage(
        'In a live Supabase deployment, a password recovery link would be dispatched to ' +
          email.trim() +
          '. Connect VITE_SUPABASE_URL to enable email delivery.'
      );
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin`,
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        setInfoMessage(
          'If an administrator account exists for that email, a password reset link has been sent.'
        );
      }
    } catch {
      setErrorMessage('Unable to send password recovery email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    setAuthError(null);

    const cleanEmail = email.trim().toLowerCase();

    // Only allow demo credentials when strictly inside compile-time DEV mode with dev bypass active
    if (cleanEmail === DEMO_EMAIL.toLowerCase() || cleanEmail === 'admin@business.com') {
      if (!isDevEnvironment || !showDevBypass) {
        setIsLoading(false);
        setErrorMessage('Test credentials are disabled in production mode.');
        return;
      }
      setTimeout(() => {
        enterDemoMode();
      }, 250);
      return;
    }

    if (!env.isConfigured) {
      if (isDevEnvironment && showDevBypass && (password === DEMO_PASSWORD || password === 'demo')) {
        enterDemoMode();
        return;
      }
      setErrorMessage(
        'Live Supabase backend is not connected (.env missing). Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to authenticate real accounts.'
      );
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage('Invalid login credentials. Please check your email and password.');
        setIsLoading(false);
        return;
      }

      if (!data.session) {
        setErrorMessage('Invalid login credentials.');
        setIsLoading(false);
        return;
      }
    } catch {
      setErrorMessage('Unable to reach authentication server. Please verify your network connection.');
      setIsLoading(false);
    }
  };

  const initials = settings.logo_initials || settings.business_name.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-neutral-900 px-4 py-8">
      {/* Dev Mode Gating Control (never compiled into production builds when VITE DEV is false) */}
      {isDevEnvironment && (
        <div className="mb-4 w-full max-w-md flex items-center justify-between px-3 py-2 bg-neutral-800/90 border border-neutral-700 rounded-lg text-xs text-neutral-300 shadow-lg">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong className="text-white">Environment:</strong> Vite DEV
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleDevMode}
            className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
              showDevBypass
                ? 'bg-amber-950/60 text-amber-300 border-amber-700/60 hover:bg-amber-900/60'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60'
            }`}
          >
            {showDevBypass ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Simulate Prod View</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Show Dev Login Helper</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="w-full max-w-md space-y-4">
        <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 p-8 space-y-6">
          {/* Dynamic Brand Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div
                className="w-10 h-10 rounded-lg text-white flex items-center justify-center font-bold text-base mb-3 shadow-sm transition-colors"
                style={{ backgroundColor: settings.brand_color || '#171717' }}
              >
                {initials}
              </div>
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
                {settings.business_name}
              </h1>
              <p className="mt-1 text-xs text-neutral-500">
                {authMode === 'forgot'
                  ? 'Enter your administrator email to receive a password recovery link.'
                  : settings.tagline || 'Internal operations & appointment portal.'}
              </p>
            </div>
            <Link
              to="/"
              className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1 shrink-0"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Storefront</span>
            </Link>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {infoMessage && (
            <div
              role="status"
              className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="flex-1 font-medium">{infoMessage}</div>
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-neutral-700 mb-1">
                  Admin Email
                </label>
                <div className="relative rounded-md shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={showDevBypass ? DEMO_EMAIL : 'admin@yourdomain.com'}
                    className="block w-full rounded-md border border-neutral-300 pl-10 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 font-sans"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-xs font-semibold text-neutral-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setErrorMessage(null);
                      setInfoMessage(null);
                    }}
                    className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative rounded-md shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full rounded-md border border-neutral-300 pl-10 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In to Dashboard</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-xs font-semibold text-neutral-700 mb-1">
                  Administrator Email
                </label>
                <div className="relative rounded-md shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@yourdomain.com"
                    className="block w-full rounded-md border border-neutral-300 pl-10 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? 'Sending link...' : 'Send Recovery Link'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className="w-full py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 cursor-pointer"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* Gated Dev Quick Login Button */}
          {authMode === 'login' && isDevEnvironment && showDevBypass && (
            <div className="pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={handleInstantDemoLogin}
                className="w-full py-2.5 px-3 border border-amber-200 text-amber-900 bg-amber-50 hover:bg-amber-100/80 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>One-Click Test Admin Login</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5 text-amber-500" />
              </button>
            </div>
          )}
        </div>

        {/* Dummy Credentials Helper (DEV build only) */}
        {isDevEnvironment && showDevBypass ? (
          <div className="bg-neutral-800/90 border border-neutral-700/80 rounded-xl p-4 text-xs text-neutral-300 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Evaluation Admin Credentials</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">DEV ONLY</span>
            </div>

            <div className="bg-neutral-900/90 rounded border border-neutral-700/60 p-2.5 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between items-center text-neutral-300">
                <span className="text-neutral-500">Email:</span>
                <span className="text-emerald-300 select-all font-semibold">{DEMO_EMAIL}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-300">
                <span className="text-neutral-500">Password:</span>
                <span className="text-emerald-300 select-all font-semibold">{DEMO_PASSWORD}</span>
              </div>
            </div>

            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={handleFillCredentials}
                className="flex-1 py-1.5 px-3 rounded bg-neutral-700 hover:bg-neutral-600 text-white font-medium text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3 h-3 text-neutral-300" />
                <span>Fill Form Inputs</span>
              </button>
              <button
                type="button"
                onClick={handleInstantDemoLogin}
                className="flex-1 py-1.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Quick Login</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-neutral-800/40 border border-neutral-800 rounded-lg p-3 text-center text-[11px] text-neutral-400 space-y-1">
            <div className="flex items-center justify-center gap-1.5 font-medium text-neutral-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Authenticated Admin Access</span>
            </div>
            <p className="text-[10px] text-neutral-500">
              Protected by Supabase Auth, TOTP MFA (AAL2), and PostgreSQL RLS.
            </p>
          </div>
        )}

        <div className="text-[11px] text-neutral-500 text-center flex items-center justify-center gap-2">
          <span>{settings.timezone}</span>
          <span>·</span>
          <span>{settings.currency}</span>
        </div>
      </div>
    </div>
  );
}
