import React, { useState } from 'react';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import DebugReplayModal from './DebugReplayModal';

const { FiAlertTriangle, FiRotateCw, FiTrash2, FiTerminal, FiSearch } = FiIcons;

export default function DeadLetterQueue({ webhooks, onReplay }) {
  const [debugHook, setDebugHook] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const dlqItems = webhooks.filter(h => 
    (h.status === 'FAILED' || h.status === 'DLQ') &&
    (h.id.toLowerCase().includes(searchQuery.toLowerCase()) || h.source.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 p-10 bg-[#0A0A0B] overflow-auto h-full">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></span>
              </span>
              <span className="text-rose-500 text-xs font-bold uppercase tracking-[0.2em]">DLQ Monitoring Area</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Dead Letter Queue</h1>
            <p className="text-slate-500 text-sm mt-2 max-w-md leading-relaxed">
              Manual intervention required for these failed events.
            </p>
          </div>
          <div className="flex gap-4">
            <button className="text-slate-400 hover:text-white px-5 py-3 text-sm font-bold flex items-center gap-2 border border-slate-800 rounded-xl hover:bg-slate-900 transition-all">
              <SafeIcon icon={FiTrash2} /> Purge Queue
            </button>
            <button 
              onClick={() => dlqItems.forEach(i => onReplay(i.id))} 
              className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-rose-900/20"
            >
              <SafeIcon icon={FiRotateCw} /> Bulk Replay
            </button>
          </div>
        </div>

        <div className="relative mb-6">
          <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search failed requests..."
            className="w-full bg-slate-900/40 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-sm text-slate-300 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="bg-[#0F1115] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/40 text-[10px] uppercase text-slate-500 font-bold tracking-widest border-b border-slate-800">
                <th className="px-8 py-5">Request ID</th>
                <th className="px-8 py-5">Source</th>
                <th className="px-8 py-5">Last Error</th>
                <th className="px-8 py-5">Captured</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {dlqItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/20 transition-all group">
                  <td className="px-8 py-5 font-mono text-xs text-slate-400 group-hover:text-indigo-400">{item.id}</td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-bold px-2 py-1 bg-slate-800 text-slate-400 rounded-md uppercase tracking-wider">{item.source}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2.5 text-rose-400 text-xs font-bold">
                      <SafeIcon icon={FiAlertTriangle} /> 503 SERVICE_UNAVAILABLE
                    </div>
                  </td>
                  <td className="px-8 py-5 text-xs text-slate-500">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setDebugHook(item)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 border border-amber-500/20 text-white hover:bg-amber-600 rounded-lg text-[10px] font-bold uppercase transition-all shadow-lg shadow-amber-900/20"
                      >
                        <SafeIcon icon={FiTerminal} /> Debug Trace
                      </button>
                      <button 
                        onClick={() => onReplay(item.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-[10px] font-bold uppercase transition-all"
                      >
                        <SafeIcon icon={FiRotateCw} /> Replay
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {dlqItems.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center text-slate-600 italic">
                    The Dead Letter Queue is currently empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {debugHook && <DebugReplayModal webhook={debugHook} onClose={() => setDebugHook(null)} />}
    </div>
  );
}