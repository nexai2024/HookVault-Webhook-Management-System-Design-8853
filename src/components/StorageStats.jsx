import React from 'react';
import { useQuery } from '@tanstack/react-query';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { getStats } from '../lib/api';

const { FiDatabase, FiActivity, FiTrendingUp, FiHardDrive } = FiIcons;

const formatCount = (n) => {
  if (n == null) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

const StatCard = ({ title, value, detail, icon: Icon, color }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
        <SafeIcon icon={Icon} className="text-xl" />
      </div>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live</span>
    </div>
    <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-white mt-1">{value}</p>
    <p className="text-xs text-slate-500 mt-2">{detail}</p>
  </div>
);

export default function StorageStats() {
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats });

  const totalIngested = stats ? formatCount(stats.totalIngested) : '—';
  const avgLatency = stats ? `${stats.avgLatencyMs}ms` : '—';
  const successRate =
    stats != null ? `${(stats.successRate * 100).toFixed(1)}%` : '—';
  const dlqCount = stats?.statusBreakdown?.DLQ ?? 0;

  return (
    <div className="flex-1 p-8 bg-[#0A0A0B] overflow-auto">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Storage & Performance</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Total Ingested" 
            value={totalIngested} 
            detail={stats?.isMock ? 'Demo data' : 'All-time events'} 
            icon={FiDatabase} 
            color="text-indigo-400" 
          />
          <StatCard 
            title="Avg. Latency" 
            value={avgLatency} 
            detail="Across delivery attempts" 
            icon={FiActivity} 
            color="text-emerald-400" 
          />
          <StatCard 
            title="Success Rate" 
            value={successRate} 
            detail="Delivered / total" 
            icon={FiTrendingUp} 
            color="text-blue-400" 
          />
          <StatCard 
            title="In DLQ" 
            value={formatCount(dlqCount)} 
            detail="Needs manual replay" 
            icon={FiHardDrive} 
            color="text-amber-400" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-6">Throughput (RPM)</h3>
            <div className="h-48 flex items-end gap-1">
              {[40, 65, 45, 90, 85, 30, 45, 70, 95, 100, 80, 60, 40, 50, 75, 90, 85, 30].map((h, i) => (
                <div 
                  key={i} 
                  className="flex-1 bg-indigo-500/40 rounded-t-sm hover:bg-indigo-500 transition-colors"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-4 text-[10px] text-slate-500 font-bold uppercase">
              <span>00:00</span>
              <span>12:00</span>
              <span>Now</span>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-6">Retention Settings</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-300">Log Retention</span>
                  <span className="text-sm font-bold text-white">30 Days</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full w-2/3"></div>
                </div>
              </div>
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Historical logs are archived to S3 after 30 days. You can access them via the CLI or by upgrading to the Enterprise plan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}