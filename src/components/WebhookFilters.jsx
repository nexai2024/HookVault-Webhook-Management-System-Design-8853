import React from 'react';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiSearch, FiFilter, FiX } = FiIcons;

export default function WebhookFilters({ filters, setFilters, sources, methods }) {
  const hasActiveFilters = filters.search || filters.status || filters.source || filters.method;

  const clearFilters = () => {
    setFilters({ search: '', status: '', source: '', method: '' });
  };

  return (
    <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/30 flex flex-col gap-3">
      {/* Search Input */}
      <div className="relative">
        <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
        <input
          type="text"
          placeholder="Search by ID or source..."
          className="w-full bg-slate-800/50 border border-slate-700 rounded-md py-1.5 pl-9 pr-4 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </div>

      {/* Filter Chips/Dropdowns */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="bg-slate-800 border border-slate-700 text-[10px] text-slate-300 rounded px-2 py-1 outline-none hover:border-slate-600"
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
          <option value="RETRIYING">Retrying</option>
        </select>

        <select
          value={filters.source}
          onChange={(e) => setFilters({ ...filters, source: e.target.value })}
          className="bg-slate-800 border border-slate-700 text-[10px] text-slate-300 rounded px-2 py-1 outline-none hover:border-slate-600"
        >
          <option value="">All Sources</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider ml-auto"
          >
            <SafeIcon icon={FiX} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}