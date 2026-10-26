export interface AndroidDisplayInfo {
  id: number;
  name: string;
  width: number;
  height: number;
  densityDpi: number;
  isVirtualOrCar: boolean;
}

export interface AndroidSystemSummary {
  isNativeAndroidBridge: boolean;
  appVersion: string;
  packageName: string;
  device: string;
  androidVersion: string;
  installerSource: string;
  carModeStatus: string;
  displaysSummary: string;
  logFileBytes: number;
  automotiveDesc: string;
  appCategory: string;
  intentCategories: string;
  widevineL3Enforcer: string;
  displays: AndroidDisplayInfo[];
}

interface AndroidDiagnosticsBridge {
  getLogs: () => string;
  getSystemSummaryJson: () => string;
  clearLogs: () => void;
  appendClientLog: (level: string, message: string) => void;
  shareLogs: () => void;
}

declare global {
  interface Window {
    AndroidDiagnostics?: AndroidDiagnosticsBridge;
  }
}

const LOCAL_LOGS_STORAGE_KEY = 'aabrowser_auto_diagnostic_logs_v1';
const MAX_LOCAL_LOG_LINES = 600;

function formatTimestamp(date = new Date()): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

class DiagnosticsService {
  private initialized = false;

  constructor() {
    this.ensureAutoInitialized();
  }

  public isNativeBridgeAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.AndroidDiagnostics !== 'undefined';
  }

  public ensureAutoInitialized(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    const bridgePresent = this.isNativeBridgeAvailable();
    this.logEvent(
      'AUTO_COLLECTOR',
      `Zero-Click Background Log Collector active (NativeAndroidBridge=${bridgePresent}, Screen=${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}x)`
    );

    // Automatically probe Widevine EME support on startup
    this.probeWidevineSupport();

    // Listen for resize / virtual display projection changes
    window.addEventListener('resize', () => {
      this.logEvent(
        'CAR_DISPLAY',
        `Viewport resized -> ${window.innerWidth}x${window.innerHeight} (devicePixelRatio=${window.devicePixelRatio})`
      );
    });

    // Listen for unhandled runtime errors
    window.addEventListener('error', (event) => {
      this.logEvent('JS_ERROR', `${event.message} at ${event.filename}:${event.lineno}`);
    });
  }

  private async probeWidevineSupport(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.requestMediaKeySystemAccess) {
      this.logEvent('DRM_PROBE', 'navigator.requestMediaKeySystemAccess not available in this context');
      return;
    }
    try {
      const access = await navigator.requestMediaKeySystemAccess('com.widevine.alpha', [
        {
          initDataTypes: ['cenc'],
          videoCapabilities: [
            { contentType: 'video/mp4; codecs="avc1.42E01E"', robustness: 'SW_SECURE_DECODE' },
          ],
        },
      ]);
      this.logEvent('DRM_PROBE', `Widevine L3 (SW_SECURE_DECODE) verified: keySystem=${access.keySystem}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logEvent('DRM_PROBE', `Widevine probe result: ${msg}`);
    }
  }

  public logEvent(category: string, message: string): void {
    const line = `[${formatTimestamp()}] [${category}] ${message}`;

    // Always persist to localStorage fallback
    try {
      const existingRaw = localStorage.getItem(LOCAL_LOGS_STORAGE_KEY);
      const lines: string[] = existingRaw ? JSON.parse(existingRaw) : [];
      lines.push(line);
      if (lines.length > MAX_LOCAL_LOG_LINES) {
        lines.splice(0, lines.length - MAX_LOCAL_LOG_LINES);
      }
      localStorage.setItem(LOCAL_LOGS_STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Ignore storage quota errors
    }

    // Forward to native Android persistent file logger if running in APK
    try {
      if (this.isNativeBridgeAvailable() && window.AndroidDiagnostics) {
        window.AndroidDiagnostics.appendClientLog(category, message);
      }
    } catch {
      // Ignore bridge errors
    }
  }

  public getSystemSummary(): AndroidSystemSummary {
    if (this.isNativeBridgeAvailable() && window.AndroidDiagnostics) {
      try {
        const raw = window.AndroidDiagnostics.getSystemSummaryJson();
        const parsed = JSON.parse(raw);
        return {
          isNativeAndroidBridge: true,
          appVersion: parsed.appVersion || '3.4.1-nba',
          packageName: parsed.packageName || 'com.kododake.aabrowser',
          device: parsed.device || 'Android Device',
          androidVersion: parsed.androidVersion || 'Android',
          installerSource: parsed.installerSource || 'com.android.vending (KingInstaller)',
          carModeStatus: parsed.carModeStatus || 'UI_MODE_TYPE_NORMAL',
          displaysSummary: parsed.displaysSummary || '1 display',
          logFileBytes: parsed.logFileBytes || 0,
          automotiveDesc: parsed.automotiveDesc || 'media (notification removed)',
          appCategory: parsed.appCategory || 'game + distractionOptimized=true',
          intentCategories: parsed.intentCategories || 'LAUNCHER, CAR_LAUNCHER, NAVIGATION, APP_MAPS',
          widevineL3Enforcer: parsed.widevineL3Enforcer || 'Active (SW_SECURE_DECODE)',
          displays: Array.isArray(parsed.displays) ? parsed.displays : [],
        };
      } catch {
        // Fallback below
      }
    }

    const localLogs = this.getLocalLogsText();
    return {
      isNativeAndroidBridge: false,
      appVersion: '3.4.1-nba',
      packageName: 'com.kododake.aabrowser',
      device: typeof navigator !== 'undefined' ? navigator.platform || 'Web / Preview Host' : 'Host',
      androidVersion: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 72) : 'Web Preview',
      installerSource: 'APK Build Ready (KingInstaller / Obtainium compatible)',
      carModeStatus: 'Auto-Detect on Android Auto Connect (UI_MODE_TYPE_CAR)',
      displaysSummary: `Display#0 ["Primary Viewport" ${
        typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '800x480'
      }]`,
      logFileBytes: new Blob([localLogs]).size,
      automotiveDesc: 'media (notification removed)',
      appCategory: 'game + distractionOptimized=true',
      intentCategories: 'LAUNCHER, CAR_LAUNCHER, NAVIGATION, APP_MAPS',
      widevineL3Enforcer: 'Active (SW_SECURE_DECODE)',
      displays: [
        {
          id: 0,
          name: 'Primary Screen / Preview Viewport',
          width: typeof window !== 'undefined' ? window.innerWidth : 800,
          height: typeof window !== 'undefined' ? window.innerHeight : 480,
          densityDpi: typeof window !== 'undefined' ? Math.round(window.devicePixelRatio * 160) : 160,
          isVirtualOrCar: false,
        },
      ],
    };
  }

  private getLocalLogsText(): string {
    try {
      const existingRaw = localStorage.getItem(LOCAL_LOGS_STORAGE_KEY);
      const lines: string[] = existingRaw ? JSON.parse(existingRaw) : [];
      return lines.join('\n');
    } catch {
      return '';
    }
  }

  public getCombinedLogs(): string {
    if (this.isNativeBridgeAvailable() && window.AndroidDiagnostics) {
      try {
        return window.AndroidDiagnostics.getLogs();
      } catch (err) {
        return `Error reading native logs: ${String(err)}\n\n${this.getLocalLogsText()}`;
      }
    }

    const header = [
      '================================================================',
      'AA BROWSER (NBA LEAGUE PASS EDITION) v3.4.1-nba DIAGNOSTIC LOGS',
      'Auto-Collector Mode: ALWAYS-ON (Zero-Click in Car)',
      'Manifest Fix: <uses name="media" /> (removed <uses name="notification" />)',
      'Projection Categories: appCategory="game" | distractionOptimized="true" | CAR_LAUNCHER | NAVIGATION | APP_MAPS',
      '================================================================',
    ].join('\n');

    return `${header}\n${this.getLocalLogsText()}`;
  }

  public clearLogs(): void {
    try {
      localStorage.removeItem(LOCAL_LOGS_STORAGE_KEY);
    } catch {
      // ignore
    }
    if (this.isNativeBridgeAvailable() && window.AndroidDiagnostics) {
      try {
        window.AndroidDiagnostics.clearLogs();
      } catch {
        // ignore
      }
    }
    this.logEvent('USER_ACTION', 'Diagnostic logs cleared by user.');
  }

  public shareLogs(): boolean {
    if (this.isNativeBridgeAvailable() && window.AndroidDiagnostics) {
      try {
        window.AndroidDiagnostics.shareLogs();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export const diagnosticsService = new DiagnosticsService();
