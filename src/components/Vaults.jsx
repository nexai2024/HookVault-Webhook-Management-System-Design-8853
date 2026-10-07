import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import VaultActivity from './VaultActivity';
import VaultForm from './VaultForm';
import VaultDetail from './VaultDetail';
import { listVaults, createVault, deleteVault } from '../lib/api';

const { FiPlus, FiLink, FiShield, FiMoreVertical, FiCopy, FiClock, FiActivity } = FiIcons;

export default function Vaults() {
  const [selectedVaultId, setSelectedVaultId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showHistoryId, setShowHistoryId] = useState(null);
  const queryClient = useQueryClient();

  const { data: vaults = [], isLoading } = useQuery({
    queryKey: ['vaults'],
    queryFn: listVaults,
  });

  const createMutation = useMutation({
    mutationFn: createVault,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaults'] });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVault,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vaults'] }),
  });

  const selectedVault = vaults.find((v) => v.id === selectedVaultId) || null;

  const handleCreateVault = (newVault) => createMutation.mutate(newVault);

  const handleDeleteVault = (id) => {
    if (window.confirm('Delete this vault? This removes its webhooks and history.')) {
      deleteMutation.mutate(id);
    }
  };

  if (selectedVault) {
    return (
      <VaultDetail
        vault={selectedVault}
        onBack={() => setSelectedVaultId(null)}
      />
    );
  }

  return (
    <div className="flex-1 flex bg-[#0A0A0B] overflow-hidden h-full">
      <div className="flex-1 p-10 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Webhook Vaults</h1>
              <p className="text-slate-500 text-sm mt-2">Create secure destination endpoints and manage your signing configs.</p>
            </div>
            <button 
              onClick={() => setShowForm(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-indigo-900/40"
            >
              <SafeIcon icon={FiPlus} /> Create New Vault
            </button>
          </div>

          {isLoading && (
            <div className="text-center text-slate-500 py-20 text-sm">Loading vaults…</div>
          )}
          {!isLoading && vaults.length === 0 && (
            <div className="text-center text-slate-600 py-20 text-sm italic border border-slate-800/60 rounded-2xl">
              No vaults yet. Create your first vault to start capturing webhooks.
            </div>
          )}

          <div className="grid gap-6">
            {vaults.map((vault) => (
              <div 
                key={vault.id} 
                className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-8 hover:border-slate-600 transition-all group hover:bg-slate-800/30"
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform duration-300">
                      <SafeIcon icon={FiShield} className="text-3xl" />
                    </div>
                    <div>
                      <div className="flex items-center gap-4">
                        <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">{vault.name}</h3>
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                          vault.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {vault.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-slate-500 text-sm bg-black/40 px-3 py-1 rounded-lg border border-slate-800/50 w-fit">
                        <SafeIcon icon={FiLink} className="text-xs" />
                        <span className="font-mono">{vault.url}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end mr-4">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Health</p>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-3 rounded-full bg-emerald-500/50"></div>)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteVault(vault.id)}
                      title="Delete vault"
                      className="text-slate-600 hover:text-rose-400 p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <SafeIcon icon={FiMoreVertical} />
                    </button>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between pt-8 border-t border-slate-800/60">
                  <div className="flex gap-10">
                    <div>
                      <p className="text-[10px] uppercase text-slate-600 font-bold tracking-[0.2em] mb-2">Vault ID</p>
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400 group-hover:text-slate-300">
                        {vault.id}
                        <SafeIcon icon={FiCopy} className="text-xs cursor-pointer hover:text-indigo-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-600 font-bold tracking-[0.2em] mb-2">Capturing Since</p>
                      <p className="text-xs text-slate-400">{vault.created}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowHistoryId(vault.id)}
                      className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all flex items-center gap-2 border border-transparent hover:border-slate-700"
                    >
                      <SafeIcon icon={FiClock} /> Audit History
                    </button>
                    <button 
                      onClick={() => setSelectedVaultId(vault.id)}
                      className="px-5 py-2 text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white rounded-xl transition-all shadow-lg shadow-indigo-900/10"
                    >
                      Management
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showHistoryId && (
        <VaultActivity vaultId={showHistoryId} onClose={() => setShowHistoryId(null)} />
      )}

      {showForm && (
        <VaultForm onClose={() => setShowForm(false)} onSubmit={handleCreateVault} />
      )}
    </div>
  );
}