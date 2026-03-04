import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import WebhookFeed from './components/WebhookFeed';
import WebhookDetail from './components/WebhookDetail';
import { generateMockWebhooks } from './mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [webhooks, setWebhooks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    // Initial load
    setWebhooks(generateMockWebhooks(15));

    // Simulate incoming webhooks
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const newHook = generateMockWebhooks(1)[0];
        newHook.createdAt = new Date().toISOString();
        setWebhooks(prev => [newHook, ...prev].slice(0, 50));
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleReplay = (id) => {
    setWebhooks(prev => prev.map(hook => {
      if (hook.id === id) {
        return {
          ...hook,
          status: 'RETRIYING',
          attempts: [
            ...hook.attempts,
            {
              id: `att_manual_${Date.now()}`,
              attemptNumber: hook.attempts.length + 1,
              responseCode: null,
              responseBody: 'Pending...',
              latencyMs: 0,
              createdAt: new Date().toISOString()
            }
          ]
        };
      }
      return hook;
    }));

    // Simulate resolution after replay
    setTimeout(() => {
      setWebhooks(prev => prev.map(hook => {
        if (hook.id === id) {
          const success = Math.random() > 0.3;
          const newAttempts = [...hook.attempts];
          newAttempts[newAttempts.length - 1] = {
            ...newAttempts[newAttempts.length - 1],
            responseCode: success ? 200 : 500,
            responseBody: success ? '{"ok": true}' : 'Internal Server Error',
            latencyMs: Math.floor(Math.random() * 200) + 50,
          };

          return {
            ...hook,
            status: success ? 'SUCCESS' : 'FAILED',
            attempts: newAttempts
          };
        }
        return hook;
      }));
    }, 2000);
  };

  const selectedWebhook = webhooks.find(h => h.id === selectedId);

  return (
    <div className="flex h-screen w-full bg-[#0A0A0B] text-slate-200 overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {activeTab === 'feed' ? (
        <>
          <div className="w-[380px] min-w-[380px] h-full">
            <WebhookFeed 
              webhooks={webhooks} 
              selectedId={selectedId} 
              onSelect={setSelectedId} 
            />
          </div>
          <WebhookDetail 
            webhook={selectedWebhook} 
            onReplay={handleReplay} 
          />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-slate-400 mb-2 capitalize">{activeTab} View</h2>
            <p>This module is currently under development.</p>
          </div>
        </div>
      )}
    </div>
  );
}