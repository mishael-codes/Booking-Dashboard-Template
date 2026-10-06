import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from './AuthProvider';
import { ShieldCheck, Copy, Check, AlertCircle } from 'lucide-react';

export function MfaEnrollView() {
  const { refreshAuth, signOut } = useAuth();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isSubscribed = true;

    async function enrollFactor() {
      try {
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          issuer: 'Booking Business Admin',
        });

        if (error) {
          setErrorMsg('Failed to initiate MFA enrollment. Please try again.');
          return;
        }

        if (isSubscribed && data) {
          setFactorId(data.id);
          setQrCodeDataUrl(data.totp.qr_code);
          setSecret(data.totp.secret);
        }
      } catch {
        setErrorMsg('Network error while enrolling TOTP factor.');
      }
    }

    enrollFactor();

    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      // Create challenge
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeErr || !challengeData) {
        setErrorMsg('Failed to create MFA challenge. Please check your code and try again.');
        setIsVerifying(false);
        return;
      }

      // Verify challenge with code
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode.trim(),
      });

      if (verifyErr) {
        setErrorMsg('Invalid verification code. Please enter the 6-digit code from your authenticator app.');
        setIsVerifying(false);
        return;
      }

      // Refresh auth to transition to AAL2
      await refreshAuth();
    } catch {
      setErrorMsg('Error verifying code. Please try again.');
      setIsVerifying(false);
    }
  };

  const copySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-900 px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-neutral-200 p-8 space-y-6">
        <div>
          <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Enroll Two-Factor Authentication (MFA)
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Mandatory security requirement: Admin accounts must be secured with an authenticator app (e.g. Google Authenticator, 1Password, Authy).
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        {/* QR Code and Secret display */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <div className="w-40 h-40 bg-white border border-neutral-300 rounded p-2 flex items-center justify-center shrink-0">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="Scan TOTP QR Code in your authenticator app"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-6 h-6 border-2 border-neutral-400 border-t-neutral-800 rounded-full animate-spin" />
            )}
          </div>

          <div className="flex-1 space-y-2 text-xs">
            <p className="font-semibold text-neutral-800">1. Scan QR code</p>
            <p className="text-neutral-500">
              Open your authenticator app and scan this barcode. Or enter the secret key manually:
            </p>
            {secret && (
              <div className="flex items-center gap-2 mt-2">
                <code className="px-2 py-1 bg-white border border-neutral-300 rounded text-[11px] font-mono text-neutral-800 select-all break-all">
                  {secret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="p-1.5 rounded hover:bg-neutral-200 text-neutral-600"
                  title="Copy secret"
                  aria-label="Copy secret"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Code Verification Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label htmlFor="verify-code" className="block text-xs font-semibold text-neutral-700 mb-1">
              2. Enter 6-digit Code from Authenticator
            </label>
            <input
              id="verify-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              required
              placeholder="123456"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-center text-lg tracking-widest font-mono text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={signOut}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900"
            >
              Sign Out
            </button>
            <button
              type="submit"
              disabled={isVerifying || verifyCode.trim().length < 6}
              className="flex-1 py-2 px-4 rounded-md bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify & Activate MFA</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
