import React, { useState } from 'react';
import { useAdminsList, type AdminListItem } from '../../api/admins';
import { useBusinessSettings } from '../../app/SettingsProvider';
import { DataTable, type Column } from '../../components/DataTable';
import { utcToWallClock, DEFAULT_TIMEZONE } from '../../lib/time';
import { ShieldCheck, Info, Copy, Check, Terminal } from 'lucide-react';

export function AdminsListView() {
  const { settings } = useBusinessSettings();
  const timezone = settings.timezone || DEFAULT_TIMEZONE;
  const { data: admins, isLoading, error, refetch } = useAdminsList();

  const [copiedSql, setCopiedSql] = useState(false);

  const exampleSql = `-- To grant admin access to an existing user:
INSERT INTO public.admins (user_id)
VALUES ('<USER_UUID_FROM_AUTH_USERS>')
ON CONFLICT (user_id) DO NOTHING;

-- To revoke admin access:
DELETE FROM public.admins
WHERE user_id = '<USER_UUID>';`;

  const copySql = () => {
    navigator.clipboard.writeText(exampleSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const columns: Column<AdminListItem>[] = [
    {
      key: 'full_name',
      header: 'Admin Name',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-[10px]">
            {row.full_name ? row.full_name.charAt(0).toUpperCase() : 'A'}
          </div>
          <span className="font-semibold text-neutral-900">
            {row.full_name || 'Administrator'}
          </span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact Phone',
      render: (row) => (
        <span className="font-mono text-neutral-600">{row.phone || '—'}</span>
      ),
    },
    {
      key: 'user_id',
      header: 'Auth User UUID',
      render: (row) => (
        <span className="font-mono text-neutral-400 text-[11px] select-all truncate block max-w-[220px]">
          {row.user_id}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Admin Since',
      render: (row) => {
        const wall = utcToWallClock(row.created_at, timezone);
        return <span className="text-neutral-500 font-mono">{wall.displayDate}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-neutral-900 tracking-tight">System Administrators</h1>
        <p className="text-xs text-neutral-500">
          Authorized admin sessions permitted by PostgreSQL Row Level Security policies.
        </p>
      </div>

      {/* Security Callout Box */}
      <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-neutral-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-xs font-semibold text-neutral-900">
              Admin Provisioning Policy (Section 8.12)
            </h2>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Adding or removing administrators is performed directly in PostgreSQL SQL by the database owner. The frontend app does not offer client-side user invitations or arbitrary role mutation to prevent unauthorized privilege escalation and email enumeration.
            </p>
          </div>
        </div>

        {/* SQL Snippet */}
        <div className="pt-2 border-t border-neutral-200">
          <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1.5">
            <div className="flex items-center gap-1 font-mono">
              <Terminal className="w-3.5 h-3.5" />
              <span>SQL Commands for Supabase Dashboard:</span>
            </div>
            <button
              type="button"
              onClick={copySql}
              className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-900 font-medium"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy SQL</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 bg-neutral-900 text-neutral-100 rounded text-xs font-mono overflow-x-auto leading-relaxed">
            {exampleSql}
          </pre>
        </div>
      </div>

      {/* Admins Table */}
      <DataTable
        columns={columns}
        data={admins ?? []}
        isLoading={isLoading}
        error={error ? (error as Error).message : null}
        onRetry={() => refetch()}
        keyExtractor={(row) => row.user_id}
        emptyTitle="No administrator records found"
        emptyDescription="Ensure public.admins table contains rows with user_id matching auth.users."
      />
    </div>
  );
}
