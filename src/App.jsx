import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from './components/Sidebar';
import WebhookFeed from './components/WebhookFeed';
import WebhookDetail from './components/WebhookDetail';
import Vaults from './components/Vaults';
import DeadLetterQueue from './components/DeadLetterQueue';
import StorageStats from './components/StorageStats';
import PayloadValidator from './components/PayloadValidator';
import Settings from './components/Settings';
import AuthFlow from './components/AuthFlow';
import { listWebhooks, replayWebhooks, isApiConfigured } from './lib/api';
import { useWebhookStream } from './hooks/useWebhookStream';

export default function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [selectedId, setSelectedId] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', source: '', method: '' });

  const queryClient = useQueryClient();
  const { connected } = useWebhookStream();

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['webhooks', filters],
    queryFn: () => listWebhooks(filters),
    enabled: isAuth,
    // Real-time via SSE when connected to the backend; poll in mock mode.
    refetchInterval: isApiConfigured ? false : 5000,
  });

  const replayMutation = useMutation({
    mutationFn: (ids) => replayWebhooks(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['webhook'] });
    },
  });

  const handleReplay = (id) => replayMutation.mutate(id);

  const sources = [...new Set(webhooks.map((h) => h.source).filter(Boolean))];
  const methods = [...new Set(webhooks.map((h) => h.method).filter(Boolean))];

  const isLive = isApiConfigured ? connected : true;
  const liveLabel = !isApiConfigured ? 'Demo' : connected ? 'Live' : 'Connecting';

  if (!isAuth) return <AuthFlow onComplete={() => setIsAuth(true)} />;

  const renderContent = () => {
    switch (activeTab) {
      case 'feed':
        return (
          <>
            <div className="w-[380px] min-w-[380px] h-full">
              <WebhookFeed
                webhooks={webhooks}
                isLoading={isLoading}
                selectedId={selectedId}
                onSelect={setSelectedId}
                filters={filters}
                setFilters={setFilters}
                sources={sources}
                methods={methods}
                isLive={isLive}
                liveLabel={liveLabel}
              />
            </div>
            <WebhookDetail webhookId={selectedId} onReplay={handleReplay} />
          </>
        );
      case 'vaults':
        return <Vaults />;
      case 'dlq':
        return <DeadLetterQueue onReplay={handleReplay} />;
      case 'validator':
        return <PayloadValidator />;
      case 'database':
        return <StorageStats />;
      case 'settings':
        return <Settings />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0A0A0B] text-slate-200 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      {renderContent()}
    </div>
  );
}
