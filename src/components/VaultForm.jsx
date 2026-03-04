import React, { useState } from 'react';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiX, FiShield, FiGlobe, FiInfo, FiAlertCircle } = FiIcons;

export default function VaultForm({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    targetUrl: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.targetUrl.startsWith('http')) {
      setError('Target URL must start with http:// or https://');
      return;
    }
    onSubmit({
      ...formData,
      id: `vlt_${Math.random().toString(36).substring(2, 9)}`,
      status: 'Active',
      created: 'Just now',
      url: formData.targetUrl
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-[#16191D] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#1A1D21]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <SafeIcon icon={FiShield} className="text-xl" />
            </div>
            <h2 className="text-xl font-bold text-white">Create New Vault</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-all">
            <SafeIcon icon={FiX} className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg flex items-center gap-2 text-sm">
              <SafeIcon icon={FiAlertCircle} /> {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vault Name</label>
            <input
              required
              type="text"
              placeholder="e.g. Production Stripe Hooks"
              className="w-full bg-[#0F1115] border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target Destination</label>
            <div className="relative">
              <SafeIcon icon={FiGlobe} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                required
                type="url"
                placeholder="https://api.yourdomain.com/webhooks"
                className="w-full bg-[#0F1115] border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono text-sm"
                value={formData.targetUrl}
                onChange={e => setFormData({ ...formData, targetUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex gap-4">
            <SafeIcon icon={FiInfo} className="text-indigo-400 mt-1 flex-shrink-0" />
            <p className="text-xs text-slate-400 leading-relaxed">
              We'll generate a unique signing secret for this vault. Your endpoint should use it to verify the payload signature.
            </p>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 transition-all text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/20 text-sm"
            >
              Create Vault
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}