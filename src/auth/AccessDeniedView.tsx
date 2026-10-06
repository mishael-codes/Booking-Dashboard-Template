import React from 'react';
import { useAuth } from './AuthProvider';
import { ShieldAlert } from 'lucide-react';

export function AccessDeniedView({ message }: { message?: string | null }) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-900 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 p-8 text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-neutral-900">Access Denied</h1>
          <p className="mt-2 text-xs text-neutral-600 leading-relaxed">
            {message || 'You are not authorised.'}
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="w-full py-2 px-4 rounded-md bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition-colors"
        >
          Return to Sign In
        </button>
      </div>
    </div>
  );
}
