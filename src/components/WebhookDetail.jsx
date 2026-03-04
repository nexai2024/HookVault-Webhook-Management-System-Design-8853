import React, { useState } from 'react';
import JsonViewer from './ui/JsonViewer';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

const { FiRotateCw, FiExternalLink, FiCode, FiList, FiCheckCircle, FiXCircle } = FiIcons;

export default function WebhookDetail({ webhook, onReplay }) {
  const [activeTab, setActiveTab] = useState('payload');
  const [isReplaying, setIsReplaying] = useState(false);

  if (!webhook) {
    return (
      <div className="flex-[1.5] bg-[#0A0A0B] flex flex-col items-center justify-center text-slate-500">
        <SafeIcon icon={FiCode} className="text-4xl mb-4 opacity-20" />
        <p>Select a webhook event to view details</p>
      </div>
    );
  }

  const handleReplay = () => {
    setIsReplaying(true);
    setTimeout(() => {
      onReplay(webhook.id);
      setIsReplaying(false);
    }, 800);
  };

  return (
    <div className="flex-[1.5] bg-[#0A0A0B] flex flex-col h-full overflow-hidden text-slate-300">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/60 bg-[#0F1115]">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1 flex items-center gap-2">
              Event Details
              <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2 py-1 rounded">
                {webhook.id}
              </span>
            </h2>
            <p className="text-sm text-slate-500">
              Captured {formatDistanceToNow(new Date(webhook.createdAt), { addSuffix: true })}
            </p>
          </div>
          <button
            onClick={handleReplay}
            disabled={isReplaying}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          >
            <SafeIcon icon={FiRotateCw} className={isReplaying ? "animate-spin" : ""} />
            {isReplaying ? 'Queuing...' : 'Replay Event'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-slate-800 mt-6">
          {['payload', 'headers', 'attempts'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition-colors relative ${
                activeTab === tab ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-md" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-[#0A0A0B]">
        {activeTab === 'payload' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Raw Request Body</h3>
            <JsonViewer data={webhook.payload} />
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Request Headers</h3>
            <JsonViewer data={webhook.headers} />
          </div>
        )}

        {activeTab === 'attempts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Delivery History</h3>
              <span className="text-xs text-slate-500">Target: <span className="text-slate-300 font-mono">https://api.userapp.com/webhooks</span></span>
            </div>
            
            <div className="space-y-3">
              {webhook.attempts.map((attempt) => (
                <div key={attempt.id} className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      {attempt.responseCode >= 200 && attempt.responseCode < 300 ? (
                        <SafeIcon icon={FiCheckCircle} className="text-emerald-500" />
                      ) : (
                        <SafeIcon icon={FiXCircle} className="text-rose-500" />
                      )}
                      <div>
                        <span className="text-sm font-medium text-slate-200 block">Attempt #{attempt.attemptNumber}</span>
                        <span className="text-xs text-slate-500">{new Date(attempt.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-mono block ${attempt.responseCode >= 200 && attempt.responseCode < 300 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {attempt.responseCode}
                      </span>
                      <span className="text-xs text-slate-500">{attempt.latencyMs}ms</span>
                    </div>
                  </div>
                  <div className="bg-black/40 rounded p-3 text-xs font-mono text-slate-400 overflow-x-auto">
                    {attempt.responseBody}
                  </div>
                </div>
              ))}
              {webhook.attempts.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No delivery attempts yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}