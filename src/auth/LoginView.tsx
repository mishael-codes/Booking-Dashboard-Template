import React, { useState } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from './AuthProvider';
import { Lock, Mail, AlertCircle } from 'lucide-react';

export function LoginView() {
  const { setAuthError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Generic failure message to prevent email enumeration
        setErrorMessage('Invalid login credentials. Please check your email and password.');
        setIsLoading(false);
        return;
      }

      if (!data.session) {
        setErrorMessage('Invalid login credentials.');
        setIsLoading(false);
        return;
      }

      // Session will be picked up by AuthProvider which validates admin role & MFA
    } catch {
      setErrorMessage('Unable to connect to authentication server. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-900 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 p-8 space-y-6">
        <div>
          <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-lg mb-4">
            B
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Admin Sign In</h1>
          <p className="mt-1 text-xs text-neutral-500">
            Internal operations portal. Authorisation is enforced via database security policies.
          </p>
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
                placeholder="admin@business.com"
                className="block w-full rounded-md border border-neutral-300 pl-10 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-neutral-700 mb-1">
              Password
            </label>
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
                className="block w-full rounded-md border border-neutral-300 pl-10 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 rounded-md bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <span>Sign In to Dashboard</span>
            )}
          </button>
        </form>

        <div className="pt-2">
          <button
            type="button"
            onClick={useAuth().enterDemoMode}
            className="w-full py-2 px-3 border border-neutral-300 text-neutral-700 bg-neutral-50 hover:bg-neutral-100 rounded text-xs font-medium transition-colors"
          >
            Explore Dashboard (Preview / Offline Mode)
          </button>
        </div>

        <div className="pt-3 border-t border-neutral-100 text-[11px] text-neutral-400 text-center">
          Admin access only. Live administrator accounts are provisioned directly in the database.
        </div>
      </div>
    </div>
  );
}
