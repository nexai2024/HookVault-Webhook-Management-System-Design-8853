import React from 'react';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiBox, FiActivity, FiSettings, FiDatabase, FiAlertCircle, FiCheckSquare } = FiIcons;

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'feed', label: 'Live Feed', icon: FiActivity },
    { id: 'vaults', label: 'Vaults', icon: FiBox },
    { id: 'validator', label: 'Validator', icon: FiCheckSquare },
    { id: 'dlq', label: 'Dead Letter Queue', icon: FiAlertCircle },
    { id: 'database', label: 'Storage', icon: FiDatabase },
    { id: 'settings', label: 'Settings', icon: FiSettings },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-full">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
          <SafeIcon icon={FiBox} className="text-xl" />
        </div>
        <span className="font-bold text-lg text-white tracking-wide">HookVault</span>
      </div>

      <div className="flex-1 py-6 px-4 space-y-1">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-3">
          Overview
        </div>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                : 'hover:bg-slate-800/50 hover:text-slate-100'
            }`}
          >
            <SafeIcon icon={item.icon} className="text-lg" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
            <span className="text-sm font-medium text-slate-300">JS</span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-medium text-white">John Smith</span>
            <span className="text-xs text-slate-500">Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
}