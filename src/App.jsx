import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import WebhookFeed from './components/WebhookFeed';
import WebhookDetail from './components/WebhookDetail';
import Vaults from './components/Vaults';
import DeadLetterQueue from './components/DeadLetterQueue';
import StorageStats from './components/StorageStats';
import PayloadValidator from './components/PayloadValidator';
import AuthFlow from './components/AuthFlow';
import { generateMockWebhooks } from './mockData';

export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [webhooks, setWebhooks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', source: '', method: '' });

  useEffect(() => {
    if (!isAuth) return;
    setWebhooks(generateMockWebhooks(30));
  }, [isAuth]);

  const handleReplay = (id) => {
    setWebhooks(prev => prev.map(h => h.id === id ? { ...h, status: 'RETRIYING' } : h));
    setTimeout(() => {
      setWebhooks(prev => prev.map(h => {
        if (h.id === id) {
          const success = Math.random() > 0.4;
          return { ...h, status: success ? 'SUCCESS' : 'FAILED' };
        }
        return h;
      }));
    }, 1500);
  };

  const filteredWebhooks = useMemo(() => {
    return webhooks.filter(hook => {
      const matchesSearch = !filters.search || hook.id.toLowerCase().includes(filters.search.toLowerCase());
      const matchesStatus = !filters.status || hook.status === filters.status;
      return matchesSearch && matchesStatus;
    });
  }, [webhooks, filters]);

  if (!isAuth) return <AuthFlow onComplete={() => setIsAuth(true)} />;

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return (
          <>
            <div className="w-[380px] min-w-[380px] h-full">
              <WebhookFeed webhooks={filteredWebhooks} selectedId={selectedId} onSelect={setSelectedId} filters={filters} setFilters={setFilters} />
            </div>
            <WebhookDetail webhook={webhooks.find(h => h.id === selectedId)} onReplay={handleReplay} />
          </>
        );
      case 'vaults': return <Vaults />;
      case 'dlq': return <DeadLetterQueue webhooks={webhooks} onReplay={handleReplay} />;
      case 'validator': return <PayloadValidator />;
      case 'database': return <StorageStats />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0A0A0B] text-slate-200 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      {renderContent()}
    </div>
  );
}