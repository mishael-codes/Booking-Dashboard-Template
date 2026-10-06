import React, { useState } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from './AuthProvider';
import { KeyRound, AlertCircle } from 'lucide-react';

export function MfaChallengeView() {
  const { refreshAuth, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors();
      if (factorsErr || !factorsData) {
        setErrorMessage('Failed to list MFA factors.');
        setIsVerifying(false);
        return;
      }

      const verifiedFactor = factorsData.totp.find((f) => f.status === 'verified');
      if (!verifiedFactor) {
        setErrorMessage('No verified authenticator factor found.');
        setIsVerifying(false);
        return;
      }

      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id,
      });

      if (challengeErr || !challengeData) {
        setErrorMessage('Failed to initiate verification challenge.');
        setIsVerifying(false);
        return;
      }

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: verifiedFactor.id,
        challengeId: challengeData.id,
        code: code.trim(),
      });

      if (verifyErr) {
        setErrorMessage('Invalid authentication code. Please try again.');
        setIsVerifying(false);
        return;
      }

      // Elevate session to AAL2
      await refreshAuth();
    } catch {
      setErrorMessage('Verification failed due to a network error.');
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-900 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 p-8 space-y-6">
        <div>
          <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center mb-4">
            <KeyRound className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Two-Factor Authentication</h1>
          <p className="mt-1 text-xs text-neutral-500">
            Enter the 6-digit verification code from your authenticator app to complete sign in.
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

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label htmlFor="mfa-challenge-code" className="block text-xs font-semibold text-neutral-700 mb-1">
              Security Code
            </label>
            <input
              id="mfa-challenge-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              required
              autoFocus
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-center text-xl tracking-widest font-mono text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={signOut}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900"
            >
              Cancel / Sign Out
            </button>
            <button
              type="submit"
              disabled={isVerifying || code.trim().length < 6}
              className="flex-1 py-2 px-4 rounded-md bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Confirm Code</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
