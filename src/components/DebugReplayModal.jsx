import React, { useState, useEffect } from 'react';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiX, FiTerminal, FiCheck, FiPlay, FiLoader, FiAlertCircle, FiInfo } = FiIcons;

export default function DebugReplayModal({ webhook, onClose }) {
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const debugSteps = [
    { title: 'Lookup Vault Config', status: 'pending', detail: `Finding vault ${webhook.vaultId}...` },
    { title: 'Payload Preparation', status: 'pending', detail: 'Merging JSON body and internal headers...' },
    { title: 'HMAC Signature', status: 'pending', detail: 'Generating SHA256 signature with vault secret.' },
    { title: 'DNS Resolution', status: 'pending', detail: 'Resolving target endpoint hostname...' },
    { title: 'HTTP Handshake', status: 'pending', detail: 'Establishing TLS connection to target...' },
    { title: 'Final Delivery', status: 'pending', detail: 'Transmitting payload and awaiting status...' }
  ];

  useEffect(() => {
    setSteps(debugSteps);
  }, [webhook]);

  const runDebug = async () => {
    setIsRunning(true);
    setIsFinished(false);
    setCurrentStep(0);
    
    // Reset steps
    setSteps(debugSteps.map(s => ({ ...s, status: 'pending' })));

    for (let i = 0; i < debugSteps.length; i++) {
      setCurrentStep(i);
      setSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: 'loading' } : s
      ));
      
      // Variable delay for realism
      await new Promise(r => setTimeout(r, 600 + Math.random() * 1000));
      
      const isLastStep = i === debugSteps.length - 1;
      // Simulate a failure on the last two steps occasionally
      const success = !isLastStep || Math.random() > 0.4;
      
      setSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: success ? 'success' : 'error' } : s
      ));

      if (!success) break;
    }
    setIsRunning(false);
    setIsFinished(true);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <div className="bg-[#0F1115] border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#16191D]">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
              <SafeIcon icon={FiTerminal} className="text-2xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Debug Replay Mode</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono text-slate-500">{webhook.id}</span>
                <span className="text-[10px] text-slate-600">•</span>
                <span className="text-xs text-slate-500">Source: {webhook.source}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-slate-800 rounded-lg">
            <SafeIcon icon={FiX} className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8 bg-black/40">
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div key={i} className={`flex gap-4 transition-all duration-300 ${i > currentStep && !isRunning ? 'opacity-20' : 'opacity-100'}`}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                    step.status === 'success' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' :
                    step.status === 'error' ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]' :
                    step.status === 'loading' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 animate-pulse' :
                    'bg-slate-900 border-slate-800 text-slate-600'
                  }`}>
                    {step.status === 'success' ? <SafeIcon icon={FiCheck} /> : 
                     step.status === 'error' ? <SafeIcon icon={FiAlertCircle} /> :
                     step.status === 'loading' ? <SafeIcon icon={FiLoader} className="animate-spin" /> :
                     <span className="text-xs font-bold">{i + 1}</span>}
                  </div>
                  {i !== steps.length - 1 && (
                    <div className={`w-0.5 h-10 my-1 transition-colors duration-500 ${i < currentStep ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />
                  )}
                </div>
                <div className="pt-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-semibold text-base transition-colors ${
                      step.status === 'error' ? 'text-rose-400' : 
                      step.status === 'success' ? 'text-emerald-400' : 
                      step.status === 'loading' ? 'text-indigo-400' : 'text-slate-400'
                    }`}>
                      {step.title}
                    </h4>
                    {step.status === 'loading' && <span className="text-[10px] text-indigo-400 animate-pulse uppercase font-bold tracking-widest">Processing</span>}
                  </div>
                  <p className="text-sm text-slate-500 mt-1 font-mono leading-relaxed">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {isFinished && (
            <div className={`mt-8 p-4 rounded-xl border animate-in slide-in-from-top-4 duration-500 ${
              steps.some(s => s.status === 'error') 
                ? 'bg-rose-500/5 border-rose-500/20 text-rose-400' 
                : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
            }`}>
              <div className="flex items-start gap-3">
                <SafeIcon icon={FiInfo} className="mt-1 flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm">
                    {steps.some(s => s.status === 'error') ? 'Debug Session Failed' : 'Debug Session Success'}
                  </p>
                  <p className="text-xs mt-1 text-slate-400 italic">
                    {steps.some(s => s.status === 'error') 
                      ? 'The delivery failed at the HTTP handshake phase. This usually indicates a firewall or DNS issue at the target endpoint.' 
                      : 'The webhook was successfully transmitted and accepted by the destination server.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-[#16191D] flex gap-3">
          <button 
            onClick={runDebug}
            disabled={isRunning}
            className="flex-1 px-4 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-900/20 text-sm"
          >
            <SafeIcon icon={FiPlay} />
            {isRunning ? 'Analyzing Pipeline...' : isFinished ? 'Restart Debug Trace' : 'Start Debug Replay'}
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-3.5 border border-slate-700 text-slate-300 rounded-xl font-bold hover:bg-slate-800 transition-all text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}