package com.kododake.aabrowser;

import android.app.UiModeManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.InstallSourceInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.hardware.display.DisplayManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Process;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Display;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Set;

/**
 * Zero-Click Automatic Background Log Collector for Android Auto & Headunit Reloaded.
 *
 * Automatically starts when the app process initializes and persists all lifecycle,
 * Intent, Car Mode, Virtual Display, WebView, Widevine DRM, Uncaught Crash, and
 * logcat events to internal storage (aa_diagnostic_logs.txt).
 *
 * The user can open AA Browser on their phone at any time to view, copy, download,
 * or share the collected logs via the @JavascriptInterface bridge (window.AndroidDiagnostics).
 */
public class DiagnosticLogCollector {

    private static final String TAG = "AA_DIAGNOSTICS";
    private static final String LOG_FILE_NAME = "aa_diagnostic_logs.txt";
    private static final int MAX_LOG_BYTES = 512 * 1024; // 512 KB rolling log file

    private static volatile DiagnosticLogCollector instance;

    private final Context appContext;
    private final File logFile;
    private final Object fileLock = new Object();
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US);
    private volatile boolean logcatRunning = false;

    public static DiagnosticLogCollector getInstance(Context context) {
        if (instance == null) {
            synchronized (DiagnosticLogCollector.class) {
                if (instance == null) {
                    instance = new DiagnosticLogCollector(context.getApplicationContext());
                }
            }
        }
        return instance;
    }

    private DiagnosticLogCollector(Context context) {
        this.appContext = context;
        this.logFile = new File(appContext.getFilesDir(), LOG_FILE_NAME);
        setupUncaughtExceptionLogger();
        logStartupBanner();
        registerDisplayMonitor();
        registerCarModeReceiver();
        startBackgroundLogcatCapture();
    }

    private void setupUncaughtExceptionLogger() {
        final Thread.UncaughtExceptionHandler defaultHandler = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            try {
                StringWriter sw = new StringWriter();
                throwable.printStackTrace(new PrintWriter(sw));
                logEvent("FATAL_CRASH", "Uncaught exception on thread [" + thread.getName() + "]:\n" + sw);
            } catch (Exception ignored) {
            }
            if (defaultHandler != null) {
                defaultHandler.uncaughtException(thread, throwable);
            }
        });
    }

    private void logStartupBanner() {
        StringBuilder sb = new StringBuilder();
        sb.append("================================================================\n");
        sb.append("AA BROWSER (NBA LEAGUE PASS EDITION) AUTO-DIAGNOSTIC SESSION\n");
        sb.append("Started: ").append(dateFormat.format(new Date())).append("\n");
        sb.append("PID: ").append(Process.myPid()).append(" | UID: ").append(Process.myUid()).append("\n");
        sb.append("Device: ").append(Build.MANUFACTURER).append(" ").append(Build.MODEL)
                .append(" (").append(Build.PRODUCT).append(")\n");
        sb.append("Android OS: ").append(Build.VERSION.RELEASE).append(" (API ").append(Build.VERSION.SDK_INT).append(")\n");
        sb.append("Installer Source: ").append(getInstallerPackageInfo()).append("\n");
        sb.append("Car Mode Status: ").append(getCarModeDescription()).append("\n");
        sb.append("Connected Displays: ").append(getDisplaysSummaryText()).append("\n");
        sb.append("Manifest Config: automotiveApp=media (notification removed), appCategory=game, CAR_LAUNCHER+NAVIGATION+APP_MAPS\n");
        sb.append("================================================================");
        logEvent("SESSION_INIT", sb.toString());
    }

    private void registerDisplayMonitor() {
        try {
            DisplayManager dm = (DisplayManager) appContext.getSystemService(Context.DISPLAY_SERVICE);
            if (dm == null) return;
            dm.registerDisplayListener(new DisplayManager.DisplayListener() {
                @Override
                public void onDisplayAdded(int displayId) {
                    Display d = dm.getDisplay(displayId);
                    logEvent("CAR_DISPLAY", "Display ADDED -> " + describeDisplay(d, displayId));
                }

                @Override
                public void onDisplayRemoved(int displayId) {
                    logEvent("CAR_DISPLAY", "Display REMOVED -> displayId=" + displayId);
                }

                @Override
                public void onDisplayChanged(int displayId) {
                    Display d = dm.getDisplay(displayId);
                    logEvent("CAR_DISPLAY", "Display CHANGED -> " + describeDisplay(d, displayId));
                }
            }, new Handler(Looper.getMainLooper()));
        } catch (Exception e) {
            logEvent("CAR_DISPLAY_ERR", "Failed to register DisplayListener: " + e.getMessage());
        }
    }

    private void registerCarModeReceiver() {
        try {
            IntentFilter filter = new IntentFilter();
            filter.addAction(UiModeManager.ACTION_ENTER_CAR_MODE);
            filter.addAction(UiModeManager.ACTION_EXIT_CAR_MODE);
            filter.addAction(Intent.ACTION_CONFIGURATION_CHANGED);
            BroadcastReceiver receiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (intent == null) return;
                    String action = intent.getAction();
                    logEvent("CAR_BROADCAST", "Received broadcast: " + action
                            + " | CarMode=" + getCarModeDescription()
                            + " | Displays=" + getDisplaysSummaryText());
                }
            };
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                appContext.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED);
            } else {
                appContext.registerReceiver(receiver, filter);
            }
        } catch (Exception e) {
            logEvent("CAR_BROADCAST_ERR", "Failed to register CarMode receiver: " + e.getMessage());
        }
    }

    private void startBackgroundLogcatCapture() {
        if (logcatRunning) return;
        logcatRunning = true;
        Thread logcatThread = new Thread(() -> {
            java.lang.Process logcatProc = null;
            try {
                int pid = Process.myPid();
                ProcessBuilder pb = new ProcessBuilder("logcat", "-v", "time", "--pid=" + pid);
                pb.redirectErrorStream(true);
                logcatProc = pb.start();
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(logcatProc.getInputStream(), StandardCharsets.UTF_8));
                String line;
                while (logcatRunning && (line = reader.readLine()) != null) {
                    // Avoid infinite recursion on our own file-persistence tag if needed
                    if (line.contains("[AA_INTERNAL_RAW]")) {
                        continue;
                    }
                    // Filter high-frequency Android 16/17 WebView frame-rate & choreographer spam
                    // (e.g. "I/View: setRequestedFrameRate frameRate=-4.0" logged 60x/sec on Samsung SM-F966B)
                    if (line.contains("setRequestedFrameRate")
                            || line.contains("setFrameRateCategory")
                            || line.contains("ViewRootImpl")
                            || line.contains("BLASTBufferQueue")
                            || line.contains("InsetsController")) {
                        continue;
                    }
                    appendRawLine("[LOGCAT] " + line);
                }
            } catch (Exception e) {
                appendRawLine("[" + dateFormat.format(new Date()) + "] [LOGCAT_ERR] Background logcat stream ended: " + e.getMessage());
            } finally {
                if (logcatProc != null) {
                    logcatProc.destroy();
                }
            }
        }, "AA-Diagnostic-Logcat-Thread");
        logcatThread.setDaemon(true);
        logcatThread.start();
    }

    public void logEvent(String category, String message) {
        String timestamp = dateFormat.format(new Date());
        String formatted = "[" + timestamp + "] [" + category + "] " + message;
        Log.i(TAG, "[AA_INTERNAL_RAW] " + category + ": " + message);
        appendRawLine(formatted);
    }

    public void logIntent(String lifecycleStage, Intent intent, Display activeDisplay) {
        StringBuilder sb = new StringBuilder();
        sb.append(lifecycleStage);
        sb.append(" | ActiveDisplay=").append(describeDisplay(activeDisplay, activeDisplay != null ? activeDisplay.getDisplayId() : -1));
        if (intent == null) {
            sb.append(" | Intent=null");
        } else {
            sb.append(" | Action=").append(intent.getAction());
            sb.append(" | Data=").append(intent.getDataString());
            sb.append(" | Flags=0x").append(Integer.toHexString(intent.getFlags()));
            if (intent.getComponent() != null) {
                sb.append(" | Component=").append(intent.getComponent().flattenToShortString());
            }
            Set<String> categories = intent.getCategories();
            if (categories != null && !categories.isEmpty()) {
                sb.append(" | Categories=").append(categories.toString());
            }
            Bundle extras = intent.getExtras();
            if (extras != null && !extras.isEmpty()) {
                try {
                    sb.append(" | ExtrasKeys=").append(extras.keySet().toString());
                } catch (Exception ignored) {
                    sb.append(" | Extras=<parcelled>");
                }
            }
        }
        logEvent("INTENT_TRACE", sb.toString());
    }

    public void logConfiguration(String stage, Configuration config) {
        if (config == null) return;
        int uiModeType = config.uiMode & Configuration.UI_MODE_TYPE_MASK;
        String uiTypeStr = uiModeTypeToString(uiModeType);
        logEvent("CONFIG", stage
                + " | uiModeType=" + uiTypeStr
                + " | screenWidthDp=" + config.screenWidthDp
                + " | screenHeightDp=" + config.screenHeightDp
                + " | densityDpi=" + config.densityDpi
                + " | orientation=" + config.orientation);
    }

    private void appendRawLine(String line) {
        synchronized (fileLock) {
            try {
                if (logFile.exists() && logFile.length() > MAX_LOG_BYTES) {
                    trimLogFile();
                }
                try (FileOutputStream fos = new FileOutputStream(logFile, true)) {
                    fos.write((line + "\n").getBytes(StandardCharsets.UTF_8));
                }
            } catch (Exception ignored) {
            }
        }
    }

    private void trimLogFile() {
        try {
            byte[] allBytes = readAllBytes(logFile);
            int keepBytes = MAX_LOG_BYTES / 2;
            if (allBytes.length > keepBytes) {
                int offset = allBytes.length - keepBytes;
                try (FileOutputStream fos = new FileOutputStream(logFile, false)) {
                    String header = "--- [LOG FILE TRIMMED TO MOST RECENT " + (keepBytes / 1024) + " KB] ---\n";
                    fos.write(header.getBytes(StandardCharsets.UTF_8));
                    fos.write(allBytes, offset, keepBytes);
                }
            }
        } catch (Exception ignored) {
        }
    }

    private byte[] readAllBytes(File file) throws Exception {
        if (!file.exists()) return new byte[0];
        int len = (int) file.length();
        byte[] buf = new byte[len];
        try (FileInputStream fis = new FileInputStream(file)) {
            int read = 0;
            while (read < len) {
                int r = fis.read(buf, read, len - read);
                if (r < 0) break;
                read += r;
            }
        }
        return buf;
    }

    public String getInstallerPackageInfo() {
        try {
            PackageManager pm = appContext.getPackageManager();
            String pkg = appContext.getPackageName();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                InstallSourceInfo info = pm.getInstallSourceInfo(pkg);
                return "installing=" + info.getInstallingPackageName()
                        + ", initiating=" + info.getInitiatingPackageName()
                        + ", originating=" + info.getOriginatingPackageName();
            } else {
                return String.valueOf(pm.getInstallerPackageName(pkg));
            }
        } catch (Exception e) {
            return "unknown (" + e.getMessage() + ")";
        }
    }

    public String getCarModeDescription() {
        try {
            UiModeManager uiModeManager = (UiModeManager) appContext.getSystemService(Context.UI_MODE_SERVICE);
            if (uiModeManager == null) return "unknown";
            int modeType = uiModeManager.getCurrentModeType();
            return uiModeTypeToString(modeType) + " (nightMode=" + uiModeManager.getNightMode() + ")";
        } catch (Exception e) {
            return "error (" + e.getMessage() + ")";
        }
    }

    private String uiModeTypeToString(int modeType) {
        switch (modeType) {
            case Configuration.UI_MODE_TYPE_CAR:
                return "UI_MODE_TYPE_CAR (Android Auto / Car Active)";
            case Configuration.UI_MODE_TYPE_NORMAL:
                return "UI_MODE_TYPE_NORMAL (Phone)";
            case Configuration.UI_MODE_TYPE_DESK:
                return "UI_MODE_TYPE_DESK";
            case Configuration.UI_MODE_TYPE_TELEVISION:
                return "UI_MODE_TYPE_TELEVISION";
            case Configuration.UI_MODE_TYPE_APPLIANCE:
                return "UI_MODE_TYPE_APPLIANCE";
            case Configuration.UI_MODE_TYPE_WATCH:
                return "UI_MODE_TYPE_WATCH";
            case Configuration.UI_MODE_TYPE_VR_HEADSET:
                return "UI_MODE_TYPE_VR_HEADSET";
            default:
                return "TYPE_" + modeType;
        }
    }

    public String getDisplaysSummaryText() {
        try {
            DisplayManager dm = (DisplayManager) appContext.getSystemService(Context.DISPLAY_SERVICE);
            if (dm == null) return "none";
            Display[] displays = dm.getDisplays();
            if (displays == null || displays.length == 0) return "0 displays";
            StringBuilder sb = new StringBuilder();
            sb.append(displays.length).append(" display(s): ");
            for (int i = 0; i < displays.length; i++) {
                if (i > 0) sb.append(" | ");
                sb.append(describeDisplay(displays[i], displays[i].getDisplayId()));
            }
            return sb.toString();
        } catch (Exception e) {
            return "error (" + e.getMessage() + ")";
        }
    }

    private String describeDisplay(Display d, int fallbackId) {
        if (d == null) return "Display#" + fallbackId + "(null)";
        DisplayMetrics dm = new DisplayMetrics();
        d.getRealMetrics(dm);
        return "Display#" + d.getDisplayId()
                + "[\"" + d.getName() + "\" "
                + dm.widthPixels + "x" + dm.heightPixels
                + "@" + dm.densityDpi + "dpi"
                + ", flags=0x" + Integer.toHexString(d.getFlags())
                + ", state=" + d.getState() + "]";
    }

    // ========================================================================
    // @JavascriptInterface Bridge Methods exposed as window.AndroidDiagnostics
    // ========================================================================

    @JavascriptInterface
    public String getLogs() {
        synchronized (fileLock) {
            try {
                if (!logFile.exists()) {
                    return "No diagnostic logs recorded yet.";
                }
                byte[] bytes = readAllBytes(logFile);
                return new String(bytes, StandardCharsets.UTF_8);
            } catch (Exception e) {
                return "Error reading diagnostic logs: " + e.getMessage();
            }
        }
    }

    @JavascriptInterface
    public String getSystemSummaryJson() {
        try {
            JSONObject json = new JSONObject();
            json.put("appVersion", "3.4.1-nba");
            json.put("packageName", appContext.getPackageName());
            json.put("device", Build.MANUFACTURER + " " + Build.MODEL);
            json.put("androidVersion", "Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")");
            json.put("installerSource", getInstallerPackageInfo());
            json.put("carModeStatus", getCarModeDescription());
            json.put("displaysSummary", getDisplaysSummaryText());
            json.put("logFileBytes", logFile.exists() ? logFile.length() : 0);
            json.put("automotiveDesc", "media (notification removed)");
            json.put("appCategory", "game + distractionOptimized=true");
            json.put("intentCategories", "LAUNCHER, CAR_LAUNCHER, NAVIGATION, APP_MAPS");
            json.put("widevineL3Enforcer", "Active (SW_SECURE_DECODE)");

            DisplayManager dm = (DisplayManager) appContext.getSystemService(Context.DISPLAY_SERVICE);
            JSONArray displayArr = new JSONArray();
            if (dm != null) {
                for (Display d : dm.getDisplays()) {
                    DisplayMetrics metrics = new DisplayMetrics();
                    d.getRealMetrics(metrics);
                    JSONObject dObj = new JSONObject();
                    dObj.put("id", d.getDisplayId());
                    dObj.put("name", d.getName());
                    dObj.put("width", metrics.widthPixels);
                    dObj.put("height", metrics.heightPixels);
                    dObj.put("densityDpi", metrics.densityDpi);
                    dObj.put("isVirtualOrCar", d.getDisplayId() != Display.DEFAULT_DISPLAY);
                    displayArr.put(dObj);
                }
            }
            json.put("displays", displayArr);
            return json.toString();
        } catch (Exception e) {
            return "{\"error\":\"" + e.getMessage() + "\"}";
        }
    }

    @JavascriptInterface
    public void clearLogs() {
        synchronized (fileLock) {
            try {
                if (logFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    logFile.delete();
                }
            } catch (Exception ignored) {
            }
        }
        logStartupBanner();
        logEvent("USER_ACTION", "Diagnostic logs cleared by user.");
    }

    @JavascriptInterface
    public void appendClientLog(String level, String message) {
        logEvent("WEB_" + (level != null ? level.toUpperCase(Locale.US) : "INFO"), message != null ? message : "");
    }

    @JavascriptInterface
    public void shareLogs() {
        try {
            String logs = getLogs();
            Intent sendIntent = new Intent(Intent.ACTION_SEND);
            sendIntent.setType("text/plain");
            sendIntent.putExtra(Intent.EXTRA_SUBJECT, "AA Browser (NBA League Pass) Diagnostic Logs");
            sendIntent.putExtra(Intent.EXTRA_TEXT, logs);
            Intent chooser = Intent.createChooser(sendIntent, "Share or Save AA Browser Logs");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            appContext.startActivity(chooser);
        } catch (Exception e) {
            logEvent("SHARE_ERR", "Failed to open share sheet: " + e.getMessage());
        }
    }
}
