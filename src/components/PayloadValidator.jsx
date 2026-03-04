import React, { useState, useEffect } from 'react';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import Ajv from 'ajv';
import JsonViewer from './ui/JsonViewer';

const { FiCheckCircle, FiXCircle, FiPlay, FiCode, FiFileText, FiInfo } = FiIcons;

const ajv = new Ajv({ allErrors: true });

const DEFAULT_PAYLOAD = {
  event: "user.signup",
  data: {
    id: "user_123",
    email: "test@example.com",
    plan: "pro"
  }
};

const DEFAULT_SCHEMA = {
  type: "object",
  required: ["event", "data"],
  properties: {
    event: { type: "string" },
    data: {
      type: "object",
      required: ["id", "email"],
      properties: {
        id: { type: "string" },
        email: { type: "string", format: "email" },
        plan: { type: "string", enum: ["free", "pro", "enterprise"] }
      }
    }
  }
};

export default function PayloadValidator() {
  const [payload, setPayload] = useState(JSON.stringify(DEFAULT_PAYLOAD, null, 2));
  const [schema, setSchema] = useState(JSON.stringify(DEFAULT_SCHEMA, null, 2));
  const [results, setResults] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const validate = () => {
    setIsValidating(true);
    setResults(null);

    setTimeout(() => {
      try {
        const p = JSON.parse(payload);
        const s = JSON.parse(schema);
        
        const validateFn = ajv.compile(s);
        const valid = validateFn(p);

        setResults({
          success: valid,
          errors: validateFn.errors || [],
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        setResults({
          success: false,
          errors: [{ message: `JSON Parse Error: ${err.message}` }],
          timestamp: new Date().toISOString()
        });
      } finally {
        setIsValidating(false);
      }
    }, 600);
  };

  return (
    <div className="flex-1 p-8 bg-[#0A0A0B] overflow-auto h-full">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Payload Validator</h1>
            <p className="text-slate-400 text-sm mt-1">Test your webhook payloads against JSON schemas.</p>
          </div>
          <button 
            onClick={validate}
            disabled={isValidating}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50"
          >
            <SafeIcon icon={FiPlay} />
            {isValidating ? 'Validating...' : 'Run Validation'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Payload Editor */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <SafeIcon icon={FiFileText} className="text-indigo-400" />
              Test Payload (JSON)
            </div>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="w-full h-80 bg-[#0F1115] border border-slate-800 rounded-xl p-4 font-mono text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
              placeholder="Paste your JSON payload here..."
            />
          </div>

          {/* Schema Editor */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <SafeIcon icon={FiCode} className="text-purple-400" />
              JSON Schema
            </div>
            <textarea
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
              className="w-full h-80 bg-[#0F1115] border border-slate-800 rounded-xl p-4 font-mono text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none"
              placeholder="Paste your JSON schema here..."
            />
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className={`rounded-xl border p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ${
            results.success ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${results.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  <SafeIcon icon={results.success ? FiCheckCircle : FiXCircle} className="text-xl" />
                </div>
                <div>
                  <h3 className={`font-bold ${results.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {results.success ? 'Validation Passed' : 'Validation Failed'}
                  </h3>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-0.5">
                    Result at {new Date(results.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>

            {results.success ? (
              <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
                The payload is perfectly aligned with your schema. You can now use this structure in your production integration.
              </p>
            ) : (
              <div className="space-y-3">
                {results.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-3 bg-black/30 p-3 rounded-lg border border-rose-500/10">
                    <SafeIcon icon={FiInfo} className="text-rose-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-rose-300 font-mono text-xs block mb-1">
                        {err.instancePath || 'root'}
                      </span>
                      <p className="text-slate-400 text-sm">{err.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}