import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { listApiKeys, createApiKey, isApiConfigured, apiBaseUrl } from '../lib/api';

const { FiKey, FiPlus, FiServer, FiCheckCircle, FiAlertCircle, FiCopy } = FiIcons;

export default function Settings() {
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState(null);
  const queryClient = useQueryClient();

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: listApiKeys,
  });

  const createMutation = useMutation({
    mutationFn: (name) => createApiKey(name),
    onSuccess: (res) => {
      if (res?.key) setCreatedKey(res.key);
      setNewKeyName('');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const copy = (text) => {
    navigator.clipboard?.writeText(text).catch(() => undefined);
  };

  return (
    <div className="flex-1 p-8 bg-[#0A0A0B] overflow-auto h-full">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

        {/* Connection status */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <SafeIcon icon={FiServer} className="text-xl" />
            </div>
            <h3 className="text-white font-semibold">Backend Connection</h3>
          </div>
          {isApiConfigured ? (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <SafeIcon icon={FiCheckCircle} />
              Connected to <span className="font-mono text-slate-300">{apiBaseUrl}</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm text-amber-400">
              <SafeIcon icon={FiAlertCircle} className="mt-0.5" />
              <span>
                Running in <span className="font-bold">mock mode</span>. Set
                {' '}<span className="font-mono">VITE_HOOKVAULT_API_URL</span> and
                {' '}<span className="font-mono">VITE_HOOKVAULT_API_KEY</span> in
                {' '}<span className="font-mono">.env</span> to connect the real backend.
              </span>
            </div>
          )}
        </div>

        {/* API Keys */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <SafeIcon icon={FiKey} className="text-xl" />
              </div>
              <h3 className="text-white font-semibold">API Keys</h3>
            </div>
          </div>

          {createdKey && (
            <div className="mb-6 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs text-emerald-400 font-bold mb-2 uppercase tracking-widest">
                New key — copy it now, it won’t be shown again
              </p>
              <div className="flex items-center gap-3 bg-black/50 rounded-lg p-3">
                <code className="flex-1 text-xs font-mono text-slate-200 break-all">{createdKey}</code>
                <button onClick={() => copy(createdKey)} className="text-slate-400 hover:text-indigo-400">
                  <SafeIcon icon={FiCopy} />
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 mb-6">
            <input
              type="text"
              placeholder="Key name (e.g. Production CI)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 bg-[#0F1115] border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <button
              onClick={() => createMutation.mutate(newKeyName || 'Untitled key')}
              disabled={createMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all disabled:opacity-50"
            >
              <SafeIcon icon={FiPlus} /> {createMutation.isPending ? 'Creating…' : 'Create Key'}
            </button>
          </div>

          <div className="divide-y divide-slate-800/60">
            {isLoading && <p className="text-sm text-slate-500 py-4">Loading keys…</p>}
            {!isLoading && keys.length === 0 && (
              <p className="text-sm text-slate-600 italic py-4">No API keys yet.</p>
            )}
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-slate-200 font-medium">{k.name}</p>
                  <p className="text-xs font-mono text-slate-500">{k.prefix}…</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {k.revokedAt ? (
                    <span className="text-rose-400">Revoked</span>
                  ) : k.lastUsedAt ? (
                    <>Last used {formatDistanceToNow(new Date(k.lastUsedAt), { addSuffix: true })}</>
                  ) : (
                    <>Created {formatDistanceToNow(new Date(k.createdAt), { addSuffix: true })}</>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
