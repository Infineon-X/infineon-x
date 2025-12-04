"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Power, Camera, StopCircle, Activity, 
  Server, Terminal, RefreshCw, History, Trash2 
} from 'lucide-react';

// --- Types ---

interface FaceLocation {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

interface DetectedFace {
  confidence: number;
  location: FaceLocation;
  name: string;
}

interface ImageSize {
  height: number;
  width: number;
}

interface RecognitionResult {
  faces?: DetectedFace[];
  image_size?: ImageSize;
  speech_text?: string;
  success?: boolean;
  total_faces?: number;
  timestamp?: string; // Optional: sometimes present in backend responses or wrappers
  clientTimestamp?: string; // Client-side added timestamp
}

interface PiStatusResponse {
  last_result?: RecognitionResult;
  last_updated: string;
  status: string;
}

interface LogEntry {
  id: number;
  details?: Record<string, unknown>;
  endpoint: string;
  event_type: string;
  message: string;
  success: number | boolean;
  timestamp: string;
}

interface LogsResponse {
  limit: number;
  logs: LogEntry[];
  offset: number;
  total: number;
}

export default function PiControlPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>('unknown');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<RecognitionResult | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<RecognitionResult[]>([]);
  const [isLoadingCmd, setIsLoadingCmd] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  // Helper to check if results are effectively the same
  const isSameResult = (a: RecognitionResult | null, b: RecognitionResult | null) => {
    if (!a || !b) return false;
    if (a.timestamp && b.timestamp && a.timestamp !== b.timestamp) return false;
    
    const aJson = JSON.stringify({ speech: a.speech_text, faces: a.faces });
    const bJson = JSON.stringify({ speech: b.speech_text, faces: b.faces });
    return aJson === bJson;
  };

  // Load history from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recognition_history');
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('recognition_history', JSON.stringify(history));
    }
  }, [history]);

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear the recognition history?')) {
      setHistory([]);
    }
  };

  // Polling for Status and Results
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/pi/status');
        const data: PiStatusResponse = await res.json();
        setStatus(data.status || 'unknown');
        setLastUpdated(data.last_updated);
      } catch (e) { console.error(e); }
    };

    const fetchResults = async () => {
      try {
        const res = await fetch('/api/pi/results');
        const data: RecognitionResult = await res.json();
        
        if (data && Object.keys(data).length > 0) {
          setLastResult(prevLast => {
            if (!isSameResult(prevLast, data)) {
              setHistory(prevHistory => {
                if (prevHistory.length > 0 && isSameResult(prevHistory[0], data)) {
                  return prevHistory;
                }
                const newEntry: RecognitionResult = {
                  ...data,
                  clientTimestamp: new Date().toISOString()
                };
                return [newEntry, ...prevHistory].slice(0, 50);
              });
            }
            return data;
          });
        }
      } catch (e) { console.error(e); }
    };

    fetchStatus();
    fetchResults();

    const interval = setInterval(() => {
      fetchStatus();
      fetchResults();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/logs?limit=20');
      const data: LogsResponse = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      console.error("Failed to fetch logs", e);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const sendCommand = async (cmd: string) => {
    setIsLoadingCmd(true);
    try {
      await fetch('/api/pi/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      setTimeout(fetchLogs, 1000);
    } catch (e) {
      alert('Failed to send command');
    } finally {
      setIsLoadingCmd(false);
    }
  };

  return (
    <div className="min-h-screen p-6 font-sans">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Server className="w-8 h-8" style={{ color: "var(--btn-primary)" }} />
            Pi Control Center
          </h1>
          <button
            type="button"
            className="medium secondary"
            onClick={() => router.push('/')}
          >
            Back to Enrollment
          </button>
        </div>

        {/* Control & Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Status Card */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" style={{ color: "var(--success-icon)" }} />
              System Status
            </h2>
            <div className="space-y-4">
              <div 
                className="flex justify-between items-center p-3 rounded-lg"
                style={{ backgroundColor: "var(--bg-secondary)" }}
              >
                <span style={{ color: "var(--text-secondary)" }}>Current State</span>
                <span 
                  className="font-mono font-bold px-2 py-1 rounded"
                  style={{
                    backgroundColor: status === 'continuous_running' ? "var(--success-bg)" : status === 'idle' ? "var(--bg-tertiary)" : "var(--error-bg)",
                    color: status === 'continuous_running' ? "var(--success-text)" : status === 'idle' ? "var(--btn-primary)" : "var(--error-text)"
                  }}
                >
                  {status.toUpperCase()}
                </span>
              </div>
              <div 
                className="text-sm text-right"
                style={{ color: "var(--text-muted)" }}
              >
                Last Updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}
              </div>
            </div>
          </div>

          {/* Command Center */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Power className="w-5 h-5" style={{ color: "var(--btn-primary)" }} />
              Commands
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => sendCommand('single_capture')}
                disabled={isLoadingCmd}
                className="secondary medium flex flex-col items-center justify-center gap-2 border p-4 transition"
                style={{ 
                  borderColor: "var(--border-primary)"
                }}
              >
                <Camera className="w-6 h-6" />
                <span className="font-medium">Capture Once</span>
              </button>
              
              <button
                onClick={() => sendCommand('start_continuous')}
                disabled={isLoadingCmd || status === 'continuous_running'}
                className={`medium flex flex-col items-center justify-center gap-2 border p-4 transition ${
                  status === 'continuous_running' ? 'success' : 'secondary'
                }`}
                style={{
                  borderColor: status === 'continuous_running' ? "transparent" : "var(--border-primary)",
                  cursor: status === 'continuous_running' ? 'default' : 'pointer'
                }}
              >
                <RefreshCw className={`w-6 h-6 ${status === 'continuous_running' ? 'animate-spin' : ''}`} />
                <span className="font-medium">Start Continuous</span>
              </button>

              <button
                onClick={() => sendCommand('stop')}
                disabled={isLoadingCmd}
                className="danger medium col-span-2 flex flex-col items-center justify-center gap-2 border p-4 transition"
                style={{ 
                  borderColor: "transparent"
                }}
              >
                <StopCircle className="w-6 h-6" />
                <span className="font-medium">Stop / Idle</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Results */}
        {lastResult && (
          <div 
            className="card animate-in fade-in slide-in-from-bottom-4"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Terminal className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
              Latest Recognition Result
            </h2>
            
            <div 
              className="font-mono text-sm overflow-x-auto"
              style={{ 
                backgroundColor: "var(--bg-secondary)", 
                color: "var(--text-primary)",
                borderRadius: 14,
                padding: 16
              }}
            >
              {lastResult.speech_text && (
                <div 
                  className="mb-3 pb-3 border-b"
                  style={{ borderColor: "var(--border-secondary)" }}
                >
                  <span style={{ color: "var(--text-muted)" }}>🗣️ Spoken: </span>
                  <span className="font-bold">&quot;{lastResult.speech_text}&quot;</span>
                </div>
              )}
              
              <div className="grid gap-2">
                {lastResult.faces?.map((face, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span style={{ color: "var(--btn-primary)" }}>[{idx+1}]</span>
                    <span className="font-bold" style={{ color: "var(--success-text)" }}>{face.name}</span>
                    <span style={{ color: "var(--text-muted)" }}>{(face.confidence).toFixed(1)}%</span>
                  </div>
                ))}
                {(!lastResult.faces || lastResult.faces.length === 0) && (
                  <div style={{ color: "var(--text-muted)" }} className="italic">No faces detected</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recognition History */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <History className="w-5 h-5" style={{ color: "var(--btn-primary)" }} />
              Recognition History (Local)
            </h2>
            {history.length > 0 && (
              <button 
                onClick={clearHistory}
                className="p-2 rounded-lg transition flex items-center gap-2 text-sm hover:opacity-80"
                style={{ color: "var(--btn-danger)" }}
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead 
                className="uppercase"
                style={{ 
                  backgroundColor: "var(--bg-secondary)", 
                  color: "var(--text-secondary)" 
                }}
              >
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Faces Detected</th>
                  <th className="px-4 py-3">Spoken Text</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, idx) => (
                  <tr 
                    key={idx} 
                    className="border-b"
                    style={{ 
                      borderColor: "var(--border-primary)",
                    }}
                  >
                    <td 
                      className="px-4 py-3 font-mono text-xs whitespace-nowrap"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {new Date(entry.clientTimestamp || entry.timestamp || Date.now()).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {entry.faces?.map((face, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-2">
                             <span 
                               className="font-medium"
                               style={{ 
                                 color: face.name.toLowerCase().includes('unknown') 
                                   ? "var(--text-secondary)" 
                                   : "var(--btn-primary)"
                               }}
                             >
                               {face.name}
                             </span>
                             <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                               {face.confidence ? `${face.confidence.toFixed(1)}%` : ''}
                             </span>
                          </div>
                        ))}
                        {(!entry.faces || entry.faces.length === 0) && (
                          <span className="italic" style={{ color: "var(--text-muted)" }}>None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                      {entry.speech_text ? (
                        <span className="italic">&quot;{entry.speech_text}&quot;</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center" style={{ color: "var(--text-secondary)" }}>
                      No history recorded in this session yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Logs Table */}
        <div 
          className="p-6 rounded-xl shadow-sm border"
          style={{ 
            backgroundColor: "var(--bg-primary)", 
            borderColor: "var(--border-primary)" 
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Terminal className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
              System Logs
            </h2>
            <button 
              onClick={fetchLogs} 
              className="p-2 rounded-full transition hover:opacity-80"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            >
              <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead 
                className="uppercase"
                style={{ 
                  backgroundColor: "var(--bg-secondary)", 
                  color: "var(--text-secondary)" 
                }}
              >
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Endpoint</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="border-b"
                    style={{ borderColor: "var(--border-primary)" }}
                  >
                    <td 
                      className="px-4 py-3 font-mono text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 font-medium">{log.event_type}</td>
                    <td 
                      className="px-4 py-3 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {log.endpoint}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate" title={log.message}>
                      {log.message}
                    </td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <span 
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: "var(--success-bg)", 
                            color: "var(--success-text)" 
                          }}
                        >
                          Success
                        </span>
                      ) : (
                        <span 
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: "var(--error-bg)", 
                            color: "var(--error-text)" 
                          }}
                        >
                          Error
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center" style={{ color: "var(--text-secondary)" }}>
                      No logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}