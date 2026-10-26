package com.kododake.aabrowser;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Primary Android Host Activity for AA Browser (NBA League Pass Edition).
 *
 * Features:
 * 1. Full Android Auto Car Launcher / Virtual Display projection support matching kododake/AABrowser.
 * 2. Automatic zero-click DiagnosticLogCollector recording all lifecycle, Display, Car Mode,
 *    Intent, WebView, Widevine DRM, and logcat events to internal storage.
 * 3. Hardware-accelerated WebView with Widevine DRM (RESOURCE_PROTECTED_MEDIA_ID) and L3
 *    SW_SECURE_DECODE enforcer for Android Auto virtual displays.
 * 4. Strict In-App URL interception: blocks Android App Links / intent:// / nba:// deep links
 *    from ever opening the native NBA app on the user's phone.
 */
public class MainActivity extends Activity {

    private static final String BUNDLED_APP_URL = "file:///android_asset/www/index.html";

    /**
     * Exact Widevine L3 (SW_SECURE_DECODE) Enforcer script from kododake/AABrowser so DRM video
     * renders properly on Android Auto virtual displays without HW_SECURE_ALL surface failure.
     */
    private static final String DRM_L3_ENFORCER_JS =
            "(function() {\n" +
            "    try {\n" +
            "        const host = window.location.hostname;\n" +
            "        if (host && (\n" +
            "            host === 'youtube.com' || host.endsWith('.youtube.com') ||\n" +
            "            host === 'googlevideo.com' || host.endsWith('.googlevideo.com') ||\n" +
            "            host === 'youtube-nocookie.com' || host.endsWith('.youtube-nocookie.com')\n" +
            "        )) {\n" +
            "            return;\n" +
            "        }\n" +
            "    } catch (_) {}\n" +
            "    if (typeof navigator === 'undefined' || !navigator.requestMediaKeySystemAccess) {\n" +
            "        return;\n" +
            "    }\n" +
            "    const patchKey = typeof Symbol !== 'undefined' && Symbol.for ? Symbol.for('__aab_drm_l3_enforced__') : '__aab_drm_l3_enforced__';\n" +
            "    if (navigator[patchKey]) return;\n" +
            "    const originalRequest = navigator.requestMediaKeySystemAccess;\n" +
            "    const patchedRequest = function requestMediaKeySystemAccess(keySystem, configs) {\n" +
            "        if (keySystem === 'com.widevine.alpha' && configs) {\n" +
            "            try {\n" +
            "                const newConfigs = Array.from(configs).map(config => {\n" +
            "                    const newConfig = Object.assign({}, config);\n" +
            "                    if (config.videoCapabilities) {\n" +
            "                        newConfig.videoCapabilities = Array.from(config.videoCapabilities).map(cap => {\n" +
            "                            const newCap = Object.assign({}, cap);\n" +
            "                            if (newCap.robustness && typeof newCap.robustness === 'string' && newCap.robustness.startsWith('HW_SECURE')) {\n" +
            "                                newCap.robustness = 'SW_SECURE_DECODE';\n" +
            "                            }\n" +
            "                            return newCap;\n" +
            "                        });\n" +
            "                    }\n" +
            "                    if (config.audioCapabilities) {\n" +
            "                        newConfig.audioCapabilities = Array.from(config.audioCapabilities).map(cap => {\n" +
            "                            const newCap = Object.assign({}, cap);\n" +
            "                            if (newCap.robustness && typeof newCap.robustness === 'string' && newCap.robustness.startsWith('HW_SECURE')) {\n" +
            "                                newCap.robustness = 'SW_SECURE_DECODE';\n" +
            "                            }\n" +
            "                            return newCap;\n" +
            "                        });\n" +
            "                    }\n" +
            "                    return newConfig;\n" +
            "                });\n" +
            "                return originalRequest.call(navigator, keySystem, newConfigs).catch(function() {\n" +
            "                    return originalRequest.call(navigator, keySystem, configs);\n" +
            "                });\n" +
            "            } catch (_) {\n" +
            "                return originalRequest.call(navigator, keySystem, configs);\n" +
            "            }\n" +
            "        }\n" +
            "        return originalRequest.call(navigator, keySystem, configs);\n" +
            "    };\n" +
            "    try {\n" +
            "        Object.defineProperty(patchedRequest, 'name', { value: 'requestMediaKeySystemAccess' });\n" +
            "        patchedRequest.toString = function() {\n" +
            "            return 'function requestMediaKeySystemAccess() { [native code] }';\n" +
            "        };\n" +
            "    } catch (_) {}\n" +
            "    try {\n" +
            "        Object.defineProperty(navigator, patchKey, { value: true, enumerable: false, configurable: false });\n" +
            "        Object.defineProperty(navigator, 'requestMediaKeySystemAccess', {\n" +
            "            value: patchedRequest,\n" +
            "            writable: true,\n" +
            "            configurable: true\n" +
            "        });\n" +
            "    } catch (_) {\n" +
            "        navigator.requestMediaKeySystemAccess = patchedRequest;\n" +
            "    }\n" +
            "})();";

    private WebView webView;
    private View customFullscreenView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private FrameLayout rootContainer;
    private DiagnosticLogCollector diagnostics;

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        diagnostics = DiagnosticLogCollector.getInstance(this);
        diagnostics.logIntent("MainActivity.onCreate", getIntent(), getActiveDisplaySafe());
        diagnostics.logConfiguration("MainActivity.onCreate", getResources().getConfiguration());

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);

        rootContainer = new FrameLayout(this);
        rootContainer.setBackgroundColor(Color.BLACK);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        // Expose automatic diagnostic log collector to the React UI
        webView.addJavascriptInterface(diagnostics, "AndroidDiagnostics");

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setSupportMultipleWindows(false); // Prevent popups from escaping WebView
        settings.setJavaScriptCanOpenWindowsAutomatically(false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        }

        // Register document-start Widevine L3 Enforcer (matching kododake/AABrowser)
        try {
            if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                WebViewCompat.addDocumentStartJavaScript(
                        webView,
                        DRM_L3_ENFORCER_JS,
                        Collections.singleton("*"));
                diagnostics.logEvent("DRM_L3", "Registered DOCUMENT_START_SCRIPT Widevine L3 Enforcer");
            }
        } catch (Exception e) {
            diagnostics.logEvent("DRM_L3_WARN", "Document-start script fallback: " + e.getMessage());
        }

        // Configure WebViewClient to keep all navigation 100% inside AA Browser
        // and block external native phone app intents (such as NBA app hijacking)
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request == null || request.getUrl() == null) {
                    return false;
                }
                return handleInternalOrBlockedUri(view, request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url == null) {
                    return false;
                }
                return handleInternalOrBlockedUri(view, Uri.parse(url));
            }

            private boolean handleInternalOrBlockedUri(WebView view, Uri uri) {
                String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase() : "";

                // Allow file://, http://, and https:// to load directly inside this WebView
                // NEVER fire startActivity(Intent.ACTION_VIEW) for nba.com or any web link
                if ("http".equals(scheme) || "https".equals(scheme) || "file".equals(scheme) || "about".equals(scheme)) {
                    return false;
                }

                // Block intent://, nba://, nbagametime://, market:// from launching external phone apps
                if ("intent".equals(scheme)) {
                    String raw = uri.toString();
                    diagnostics.logEvent("URL_INTERCEPT", "Blocked intent:// URI from opening external app: " + raw);
                    int fallbackIdx = raw.indexOf("S.browser_fallback_url=");
                    if (fallbackIdx != -1) {
                        String encodedFallback = raw.substring(fallbackIdx + "S.browser_fallback_url=".length());
                        int endIdx = encodedFallback.indexOf(';');
                        if (endIdx != -1) {
                            encodedFallback = encodedFallback.substring(0, endIdx);
                        }
                        String decoded = Uri.decode(encodedFallback);
                        if (decoded != null && (decoded.startsWith("http://") || decoded.startsWith("https://"))) {
                            diagnostics.logEvent("URL_INTERCEPT", "Redirecting intent fallback in-app: " + decoded);
                            view.loadUrl(decoded);
                        }
                    }
                    return true;
                }

                diagnostics.logEvent("URL_INTERCEPT", "Blocked custom scheme URI from escaping app: " + uri);
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                diagnostics.logEvent("WEBVIEW_NAV", "onPageStarted: " + url);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                diagnostics.logEvent("WEBVIEW_NAV", "onPageFinished: " + url);
                try {
                    view.evaluateJavascript(DRM_L3_ENFORCER_JS, null);
                } catch (Exception ignored) {
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && request != null && error != null) {
                    if (request.isForMainFrame()) {
                        diagnostics.logEvent("WEBVIEW_ERR", "MainFrame Error " + error.getErrorCode()
                                + " (" + error.getDescription() + ") on " + request.getUrl());
                    }
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                super.onReceivedHttpError(view, request, errorResponse);
                if (request != null && errorResponse != null && request.isForMainFrame()) {
                    diagnostics.logEvent("WEBVIEW_HTTP", "HTTP " + errorResponse.getStatusCode()
                            + " on " + request.getUrl());
                }
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                diagnostics.logEvent("WEBVIEW_SSL", "SSL Error: " + (error != null ? error.toString() : "unknown"));
                super.onReceivedSslError(view, handler, error);
            }
        });

        // Configure WebChromeClient with Widevine DRM (RESOURCE_PROTECTED_MEDIA_ID) & Fullscreen Video support
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && request != null) {
                    String[] requestedResources = request.getResources();
                    List<String> granted = new ArrayList<>();
                    if (requestedResources != null) {
                        for (String res : requestedResources) {
                            if (PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID.equals(res)
                                    || PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)
                                    || PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)) {
                                granted.add(res);
                            }
                        }
                    }
                    diagnostics.logEvent("DRM_PERMISSION", "Granted WebChromeClient permissions: " + granted);
                    if (!granted.isEmpty()) {
                        request.grant(granted.toArray(new String[0]));
                    } else {
                        request.grant(requestedResources);
                    }
                }
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                if (consoleMessage != null && consoleMessage.messageLevel() == ConsoleMessage.MessageLevel.ERROR) {
                    diagnostics.logEvent("JS_CONSOLE_ERR", consoleMessage.message()
                            + " (" + consoleMessage.sourceId() + ":" + consoleMessage.lineNumber() + ")");
                }
                return super.onConsoleMessage(consoleMessage);
            }

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                diagnostics.logEvent("FULLSCREEN", "Entering WebChromeClient custom fullscreen view");
                if (customFullscreenView != null) {
                    callback.onCustomViewHidden();
                    return;
                }
                customFullscreenView = view;
                customViewCallback = callback;
                webView.setVisibility(View.GONE);
                rootContainer.addView(
                        customFullscreenView,
                        new FrameLayout.LayoutParams(
                                FrameLayout.LayoutParams.MATCH_PARENT,
                                FrameLayout.LayoutParams.MATCH_PARENT));
            }

            @Override
            public void onHideCustomView() {
                diagnostics.logEvent("FULLSCREEN", "Exiting WebChromeClient custom fullscreen view");
                if (customFullscreenView == null) {
                    return;
                }
                rootContainer.removeView(customFullscreenView);
                customFullscreenView = null;
                if (customViewCallback != null) {
                    customViewCallback.onCustomViewHidden();
                    customViewCallback = null;
                }
                webView.setVisibility(View.VISIBLE);
            }
        });

        rootContainer.addView(
                webView,
                new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT));

        setContentView(rootContainer);

        webView.loadUrl(BUNDLED_APP_URL);
        handleIncomingIntent(getIntent());
    }

    private Display getActiveDisplaySafe() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                return getDisplay();
            } else {
                return getWindowManager().getDefaultDisplay();
            }
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (diagnostics != null) {
            diagnostics.logIntent("MainActivity.onNewIntent", intent, getActiveDisplaySafe());
        }
        handleIncomingIntent(intent);
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null || webView == null) {
            return;
        }
        String sharedUrl = intent.getStringExtra("shared_url");
        if (sharedUrl != null && !sharedUrl.trim().isEmpty()) {
            diagnostics.logEvent("SHARED_URL", "Loading shared URL in-app: " + sharedUrl);
            webView.loadUrl(BUNDLED_APP_URL);
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (diagnostics != null) {
            diagnostics.logConfiguration("MainActivity.onConfigurationChanged", newConfig);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (diagnostics != null) {
            Display d = getActiveDisplaySafe();
            diagnostics.logEvent("WINDOW_FOCUS", "hasFocus=" + hasFocus
                    + " | displayId=" + (d != null ? d.getDisplayId() : -1)
                    + " | rootSize=" + (rootContainer != null ? rootContainer.getWidth() + "x" + rootContainer.getHeight() : "null"));
        }
    }

    @Override
    public void onBackPressed() {
        if (customFullscreenView != null) {
            webView.getWebChromeClient().onHideCustomView();
            return;
        }
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onStart() {
        super.onStart();
        if (diagnostics != null) {
            Display d = getActiveDisplaySafe();
            diagnostics.logEvent("LIFECYCLE", "MainActivity.onStart() on displayId=" + (d != null ? d.getDisplayId() : -1));
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (diagnostics != null) {
            Display d = getActiveDisplaySafe();
            diagnostics.logEvent("LIFECYCLE", "MainActivity.onResume() on displayId=" + (d != null ? d.getDisplayId() : -1)
                    + " (" + (d != null ? d.getName() : "unknown") + ")");
        }
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onPause() {
        if (diagnostics != null) {
            diagnostics.logEvent("LIFECYCLE", "MainActivity.onPause()");
        }
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onStop() {
        if (diagnostics != null) {
            diagnostics.logEvent("LIFECYCLE", "MainActivity.onStop()");
        }
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        if (diagnostics != null) {
            diagnostics.logEvent("LIFECYCLE", "MainActivity.onDestroy()");
        }
        if (webView != null) {
            CookieManager.getInstance().flush();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
