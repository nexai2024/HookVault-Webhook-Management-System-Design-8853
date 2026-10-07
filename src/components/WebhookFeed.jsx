import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../utils/cn';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import WebhookFilters from './WebhookFilters';

const { FiCheckCircle, FiXCircle, FiClock, FiRefreshCw } = FiIcons;

const StatusIcon = ({ status }) => {
  switch (status) {
    case 'SUCCESS': return <SafeIcon icon={FiCheckCircle} className="text-emerald-500" />;
    case 'FAILED': return <SafeIcon icon={FiXCircle} className="text-rose-500" />;
    case 'PENDING': return <SafeIcon icon={FiClock} className="text-amber-500" />;
    case 'RETRYING': return <SafeIcon icon={FiRefreshCw} className="text-blue-500 animate-spin" />;
    default: return <SafeIcon icon={FiClock} className="text-slate-500" />;
  }
};

const StatusBadge = ({ status }) => {
  const styles = {
    SUCCESS: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    RETRYING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", styles[status])}>
      {status}
    </span>
  );
};

export default function WebhookFeed({ webhooks, selectedId, onSelect, filters, setFilters, sources = [], methods = [], isLoading = false, isLive = true, liveLabel = 'Listening' }) {
  return (
    <div className="flex-1 border-r border-slate-800 bg-slate-900/50 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
        <h2 className="text-lg font-semibold text-white">Live Ingestion</h2>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {isLive && (
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", "bg-emerald-400")}></span>
            )}
            <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", isLive ? "bg-emerald-500" : "bg-amber-500")}></span>
          </span>
          <span className="text-xs text-slate-400 font-medium tracking-wide border border-slate-800 px-2 py-1 rounded-md bg-slate-800/50">{liveLabel}</span>
        </div>
      </div>

      <WebhookFilters 
        filters={filters} 
        setFilters={setFilters} 
        sources={sources}
        methods={methods}
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {isLoading && webhooks.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="text-sm">Loading events…</p>
          </div>
        ) : webhooks.length > 0 ? (
          webhooks.map((hook) => (
            <div
              key={hook.id}
              onClick={() => onSelect(hook.id)}
              className={cn(
                "p-4 border-b border-slate-800/50 cursor-pointer transition-colors duration-200 hover:bg-slate-800/50",
                selectedId === hook.id ? "bg-slate-800/80 border-l-2 border-l-indigo-500" : "border-l-2 border-l-transparent"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <StatusIcon status={hook.status} />
                  <span className="font-mono text-sm text-slate-300 font-medium">/{hook.source}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {formatDistanceToNow(new Date(hook.createdAt), { addSuffix: true })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                    hook.method === 'POST' ? "bg-blue-500/20 text-blue-400" : "bg-slate-700 text-slate-300"
                  )}>
                    {hook.method}
                  </span>
                  <span className="text-xs font-mono text-slate-500 truncate max-w-[150px]">
                    {hook.id}
                  </span>
                </div>
                <StatusBadge status={hook.status} />
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-slate-500">
            <p className="text-sm">No webhooks match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}