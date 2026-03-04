import React, { useState } from 'react';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiArrowLeft, FiSettings, FiActivity, FiShield, FiCopy, FiRefreshCw, FiTrash2, FiSave, FiLock, FiTerminal } = FiIcons;

export default function VaultDetail({ vault, onBack, onUpdate }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isRotating, setIsRotating] = useState(false);
  const [settings, setSettings] = useState({
    name: vault.name,
    url: vault.url || vault.targetUrl,
  });

  const rotateSecret = () => {
    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 1200);
  };

  const handleSave = () => {
    onUpdate({ ...vault, name: settings.name, url: settings.url, targetUrl: settings.url });
    setActiveTab('overview');
  };

  return (
    <div className="flex-1 bg-[#0A0A0B] flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
      <div className="p-8 border-b border-slate-800/60 bg-[#0F1115]">
        <div className="flex items-center gap-5 mb-8">
          <button onClick={onBack} className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 transition-all border border-slate-800/50">
            <SafeIcon icon={FiArrowLeft} className="text-xl" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-white">{vault.name}</h1>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {vault.status}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-500 mt-1">{vault.id} • Created {vault.created}</p>
          </div>
        </div>

        <div className="flex gap-10">
          {[
            { id: 'overview', label: 'Dashboard', icon: FiActivity },
            { id: 'settings', label: 'Configuration', icon: FiSettings },
            { id: 'security', label: 'Security', icon: FiShield },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 pb-5 text-sm font-bold transition-all relative ${
                activeTab === tab.id ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <SafeIcon icon={tab.icon} />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 rounded-t-full shadow-[0_-2px_10px_rgba(99,102,241,0.5)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-10">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Success Rate</p>
                <p className="text-3xl font-bold text-white">99.8%</p>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Total Events</p>
                <p className="text-3xl font-bold text-white">14.2k</p>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Avg Latency</p>
                <p className="text-3xl font-bold text-white">124ms</p>
              </div>
              <div className="md:col-span-3 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 mt-4 space-y-6">
                <div>
                  <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                    <SafeIcon icon={FiTerminal} className="text-indigo-400" /> Ingestion Endpoint
                  </h3>
                  <div className="bg-black/60 rounded-xl p-4 font-mono text-sm border border-slate-800/50 text-indigo-300">
                    https://hookvault.com/api/v1/ingest/{vault.id}
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-bold mb-4">Target Destination</h3>
                  <div className="bg-black/60 rounded-xl p-4 font-mono text-sm border border-slate-800/50 text-slate-400">
                    {vault.url || vault.targetUrl}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vault Name</label>
                    <input 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all"
                      value={settings.name}
                      onChange={e => setSettings({...settings, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target URL</label>
                    <input 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 font-mono text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all"
                      value={settings.url}
                      onChange={e => setSettings({...settings, url: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-slate-800/50">
                  <button onClick={handleSave} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20">
                    <SafeIcon icon={FiSave} /> Save Configuration
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 shadow-xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
                  <SafeIcon icon={FiLock} className="text-2xl" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Signing Secret</h3>
                  <p className="text-sm text-slate-500">HMAC Key used to sign all outbound requests for this vault.</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-black/60 border border-slate-800 rounded-xl p-5 mb-8">
                <div className="flex-1 font-mono text-xs text-slate-600 tracking-[0.4em] select-none">
                  ••••••••••••••••••••••••••••••••••••••••••••••••
                </div>
                <button onClick={rotateSecret} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all border border-slate-700">
                  <SafeIcon icon={FiRefreshCw} className={isRotating ? "animate-spin" : ""} />
                  Rotate Key
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}