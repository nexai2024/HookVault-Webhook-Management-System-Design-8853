import React from 'react';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

const { FiSettings, FiKey, FiActivity, FiAlertCircle, FiUser, FiArrowRight } = FiIcons;

const ActionIcon = ({ action }) => {
  switch (action) {
    case 'CONFIG_UPDATE': return <div className="p-2 bg-blue-500/10 text-blue-400 rounded-full"><SafeIcon icon={FiSettings} /></div>;
    case 'SECRET_ROTATED': return <div className="p-2 bg-purple-500/10 text-purple-400 rounded-full"><SafeIcon icon={FiKey} /></div>;
    case 'TRAFFIC_SPIKE': return <div className="p-2 bg-amber-500/10 text-amber-400 rounded-full"><SafeIcon icon={FiActivity} /></div>;
    case 'STATUS_CHANGED': return <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-full"><SafeIcon icon={FiAlertCircle} /></div>;
    default: return <div className="p-2 bg-slate-500/10 text-slate-400 rounded-full"><SafeIcon icon={FiUser} /></div>;
  }
};

export default function VaultActivity({ vaultId, onClose }) {
  // Mock activity data
  const activities = [
    {
      id: 'act_1',
      action: 'CONFIG_UPDATE',
      actor: 'john@example.com',
      time: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
      details: 'Updated target URL',
      changes: { from: 'https://old-api.com', to: 'https://new-api.com' }
    },
    {
      id: 'act_2',
      action: 'SECRET_ROTATED',
      actor: 'john@example.com',
      time: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
      details: 'Rotated signing secret',
      changes: null
    },
    {
      id: 'act_3',
      action: 'TRAFFIC_SPIKE',
      actor: 'System',
      time: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      details: 'Abnormal traffic detected: 500 req/sec',
      changes: null
    },
    {
      id: 'act_4',
      action: 'STATUS_CHANGED',
      actor: 'sarah@example.com',
      time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      details: 'Vault resumed',
      changes: { from: 'PAUSED', to: 'ACTIVE' }
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#0F1115] border-l border-slate-800 w-[450px] animate-in slide-in-from-right duration-300">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#16191D]">
        <div>
          <h2 className="text-lg font-semibold text-white">Activity History</h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{vaultId}</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <SafeIcon icon={FiIcons.FiX} className="text-xl" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {activities.map((item, index) => (
          <div key={item.id} className="relative flex gap-4">
            {/* Timeline Line */}
            {index !== activities.length - 1 && (
              <div className="absolute left-[19px] top-10 bottom-[-32px] w-[2px] bg-slate-800" />
            )}
            
            <ActionIcon action={item.action} />
            
            <div className="flex-1 pt-1">
              <div className="flex justify-between items-start mb-1">
                <p className="text-sm font-medium text-slate-200">{item.details}</p>
                <span className="text-[10px] text-slate-500 whitespace-nowrap ml-2">
                  {formatDistanceToNow(item.time, { addSuffix: true })}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                <SafeIcon icon={FiUser} className="text-[10px]" />
                {item.actor}
              </div>

              {item.changes && (
                <div className="bg-black/40 border border-slate-800 rounded-md p-3 text-[11px] font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-rose-400 line-through truncate max-w-[120px]">{item.changes.from}</span>
                    <SafeIcon icon={FiArrowRight} className="text-slate-600 flex-shrink-0" />
                    <span className="text-emerald-400 truncate max-w-[120px]">{item.changes.to}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-800 bg-[#16191D]">
        <button className="w-full py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors">
          View all audit logs
        </button>
      </div>
    </div>
  );
}