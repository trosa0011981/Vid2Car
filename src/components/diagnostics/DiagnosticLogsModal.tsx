import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Terminal,
  Copy,
  Check,
  Download,
  Share2,
  Trash2,
  RefreshCw,
  Monitor,
  ShieldCheck,
  Car,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';
import { diagnosticsService, AndroidSystemSummary } from '../../services/diagnosticsService';

interface DiagnosticLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LogFilter = 'ALL' | 'CAR_DISPLAY' | 'INTENT_LIFECYCLE' | 'WEBVIEW_DRM' | 'LOGCAT';

export const DiagnosticLogsModal: React.FC<DiagnosticLogsModalProps> = ({ isOpen, onClose }) => {
  const [logsText, setLogsText] = useState<string>('');
  const [summary, setSummary] = useState<AndroidSystemSummary>(() =>
    diagnosticsService.getSystemSummary()
  );
  const [activeFilter, setActiveFilter] = useState<LogFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const refreshData = () => {
    setSummary(diagnosticsService.getSystemSummary());
    setLogsText(diagnosticsService.getCombinedLogs());
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshData();
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const filteredLines = useMemo(() => {
    const rawLines = logsText.split('\n');
    return rawLines.filter((line) => {
      if (searchQuery.trim() && !line.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'CAR_DISPLAY') {
        return (
          line.includes('CAR_') ||
          line.includes('Display') ||
          line.includes('UI_MODE') ||
          line.includes('CONFIG') ||
          line.includes('SESSION_INIT')
        );
      }
      if (activeFilter === 'INTENT_LIFECYCLE') {
        return (
          line.includes('INTENT') ||
          line.includes('LIFECYCLE') ||
          line.includes('MainActivity') ||
          line.includes('AABrowserApplication') ||
          line.includes('WINDOW_FOCUS')
        );
      }
      if (activeFilter === 'WEBVIEW_DRM') {
        return (
          line.includes('WEBVIEW') ||
          line.includes('DRM') ||
          line.includes('URL_INTERCEPT') ||
          line.includes('NBA') ||
          line.includes('WEB_')
        );
      }
      if (activeFilter === 'LOGCAT') {
        return line.includes('[LOGCAT]') || line.includes('FATAL_CRASH');
      }
      return true;
    });
  }, [logsText, activeFilter, searchQuery]);

  if (!isOpen) return null;

  const handleCopyAll = async () => {
    const fullReport = [
      '=== AA BROWSER (NBA EDITION) DIAGNOSTIC REPORT ===',
      `App Version: ${summary.appVersion}`,
      `Package: ${summary.packageName}`,
      `Device: ${summary.device}`,
      `OS: ${summary.androidVersion}`,
      `Installer Source: ${summary.installerSource}`,
      `Car Mode Status: ${summary.carModeStatus}`,
      `Displays: ${summary.displaysSummary}`,
      `Automotive XML: ${summary.automotiveDesc}`,
      `Manifest Category: ${summary.appCategory}`,
      `Intent Categories: ${summary.intentCategories}`,
      `Widevine L3 Enforcer: ${summary.widevineL3Enforcer}`,
      '==================================================\n',
      filteredLines.join('\n'),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(fullReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = fullReport;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadLogs = () => {
    const sharedNatively = diagnosticsService.shareLogs();
    if (sharedNatively) return;

    const blob = new Blob([logsText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aa-browser-diagnostics-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    diagnosticsService.clearLogs();
    refreshData();
  };

  const handleAddMarker = () => {
    diagnosticsService.logEvent(
      'USER_MARKER',
      `Manual checkpoint added from UI (CarMode=${summary.carModeStatus}, Displays=${summary.displaysSummary})`
    );
    refreshData();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] bg-[#0B0F17] border border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#111827] via-[#0F172A] to-[#1E1B4B] border-b border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                  Android Auto Diagnostic Log Collector
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Zero-Click Auto Recording
                </span>
              </div>
              <p className="text-xs text-neutral-400 truncate mt-0.5">
                Automatically records Car Mode, Virtual Displays, Intents &amp; logcat in the background—view or copy from your phone anytime.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors shrink-0"
            title="Close Diagnostics"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Android Auto Projection Fix & Troubleshooting Banner */}
          <div className="bg-blue-950/40 border border-blue-500/30 rounded-2xl p-3.5 flex flex-col gap-2">
            <div className="flex items-start gap-2.5">
              <Car className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-neutral-200 leading-relaxed">
                <span className="font-bold text-white">
                  Android Auto Projection Fix Applied (v3.4.1-nba):
                </span>{' '}
                Removed <code className="text-amber-300 bg-black/40 px-1 rounded">&lt;uses name=&quot;notification&quot; /&gt;</code> from{' '}
                <code className="text-blue-300 bg-black/40 px-1 rounded">automotive_app_desc.xml</code> (which caused Android Auto to show{' '}
                <em>&quot;No new messages during this drive&quot;</em>) and added the full{' '}
                <code className="text-emerald-300 bg-black/40 px-1 rounded">kododake/AABrowser</code> projection configuration (
                <code className="text-emerald-300 bg-black/40 px-1 rounded">appCategory=&quot;game&quot;</code>,{' '}
                <code className="text-emerald-300 bg-black/40 px-1 rounded">distractionOptimized=&quot;true&quot;</code>,{' '}
                <code className="text-emerald-300 bg-black/40 px-1 rounded">CAR_LAUNCHER</code>,{' '}
                <code className="text-emerald-300 bg-black/40 px-1 rounded">NAVIGATION</code>,{' '}
                <code className="text-emerald-300 bg-black/40 px-1 rounded">APP_MAPS</code>, and{' '}
                <code className="text-emerald-300 bg-black/40 px-1 rounded">androidx.car.app</code>).
              </div>
            </div>
            <div className="flex items-start gap-2.5 pt-1 border-t border-blue-500/20 text-[11px] text-neutral-300">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300">Official AA Browser Head Unit Tip:</strong> Full Activity projection on Android Auto requires{' '}
                <strong>Android 15+</strong> (or Headunit Reloaded with Unknown Sources enabled in Android Auto Developer Settings). If the screen does not switch immediately in the car, open a non-Google Maps nav app (such as <strong>Waze</strong>) first, then tap <strong>AA Browser</strong>.
              </div>
            </div>
          </div>

          {/* System & Display Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                <Monitor className="w-3.5 h-3.5 text-blue-400" />
                <span>Device &amp; Installer</span>
              </div>
              <div className="mt-1.5 text-xs font-semibold text-white truncate">
                {summary.device} &bull; {summary.androidVersion}
              </div>
              <div className="mt-1 text-[11px] text-neutral-400 truncate" title={summary.installerSource}>
                Installer: <span className="text-neutral-200">{summary.installerSource}</span>
              </div>
            </div>

            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                <Car className="w-3.5 h-3.5 text-emerald-400" />
                <span>Car Mode &amp; Displays</span>
              </div>
              <div className="mt-1.5 text-xs font-semibold text-emerald-300 truncate">
                {summary.carModeStatus}
              </div>
              <div className="mt-1 text-[11px] text-neutral-400 truncate" title={summary.displaysSummary}>
                {summary.displaysSummary}
              </div>
            </div>

            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Manifest &amp; Widevine DRM</span>
              </div>
              <div className="mt-1.5 text-xs font-semibold text-white truncate">
                automotiveApp: <span className="text-amber-300">{summary.automotiveDesc}</span>
              </div>
              <div className="mt-1 text-[11px] text-neutral-400 truncate">
                DRM: <span className="text-neutral-200">{summary.widevineL3Enforcer}</span>
              </div>
            </div>
          </div>

          {/* Filter & Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { id: 'ALL', label: 'All Logs' },
                  { id: 'CAR_DISPLAY', label: 'Car & Display' },
                  { id: 'INTENT_LIFECYCLE', label: 'Intents & Lifecycle' },
                  { id: 'WEBVIEW_DRM', label: 'WebView & DRM' },
                  { id: 'LOGCAT', label: 'Logcat' },
                ] as { id: LogFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    activeFilter === tab.id
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter log lines..."
                className="bg-neutral-900 border border-neutral-800 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none w-40 sm:w-48"
              />
              <button
                onClick={handleAddMarker}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1"
                title="Insert timestamp marker into log file"
              >
                <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>Add Marker</span>
              </button>
              <button
                onClick={refreshData}
                className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white"
                title="Refresh logs"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Log Console Output */}
          <div className="bg-[#05070B] border border-neutral-800 rounded-2xl p-3.5 font-mono text-[11px] leading-relaxed text-neutral-300 h-72 sm:h-80 overflow-y-auto select-text whitespace-pre-wrap break-all shadow-inner">
            {filteredLines.length === 0 ? (
              <div className="h-full flex items-center justify-center text-neutral-500">
                No log entries match the current filter.
              </div>
            ) : (
              filteredLines.map((line, idx) => {
                const isError =
                  line.includes('ERR') ||
                  line.includes('FATAL') ||
                  line.includes(' E/') ||
                  line.includes('Exception');
                const isCar =
                  line.includes('CAR_') ||
                  line.includes('Display') ||
                  line.includes('INTENT_TRACE') ||
                  line.includes('SESSION_INIT');
                return (
                  <div
                    key={idx}
                    className={`py-0.5 ${
                      isError
                        ? 'text-red-400 font-semibold'
                        : isCar
                        ? 'text-emerald-300'
                        : 'text-neutral-300'
                    }`}
                  >
                    {line}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer with 1-Tap Copy / Share / Download / Clear */}
        <div className="px-5 py-3.5 bg-neutral-950 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-neutral-400">
            Showing <span className="text-white font-semibold">{filteredLines.length}</span> lines &bull; Persisted to{' '}
            <code className="text-neutral-300">files/aa_diagnostic_logs.txt</code>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleClear}
              className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-red-950/60 text-neutral-400 hover:text-red-300 border border-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>

            <button
              onClick={handleDownloadLogs}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center gap-1.5 border border-neutral-700 transition-colors"
            >
              {summary.isNativeAndroidBridge ? (
                <>
                  <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Share Logs</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Download .log</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyAll}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy All Logs</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
