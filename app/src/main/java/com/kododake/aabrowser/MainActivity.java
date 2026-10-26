package com.kododake.aabrowser;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Display;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import org.json.JSONObject;

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
 * 4. Top-level NBA.com navigation bridge (bypassing X-Frame-Options / CSP frame-ancestors so
 *    official NBA.com sign-in and streams load without a broken Android WebView iframe icon)
 *    with a native floating Car Return Bar.
 * 5. Strict In-App URL interception: blocks Android App Links / intent:// / nba:// deep links
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
    private LinearLayout mainVerticalLayout;
    private LinearLayout topNbaReturnBar;
    private TextView topBarTitleView;
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
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);

        rootContainer = new FrameLayout(this);
        rootContainer.setBackgroundColor(Color.BLACK);

        mainVerticalLayout = new LinearLayout(this);
        mainVerticalLayout.setOrientation(LinearLayout.VERTICAL);
        mainVerticalLayout.setBackgroundColor(Color.BLACK);

        // Build native top bar for returning from top-level NBA.com sign-in / stream pages
        topNbaReturnBar = buildTopNbaReturnBar();
        topNbaReturnBar.setVisibility(View.GONE);
        mainVerticalLayout.addView(
                topNbaReturnBar,
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);

        // Expose automatic diagnostic log collector and native NBA bridge to the React UI
        webView.addJavascriptInterface(diagnostics, "AndroidDiagnostics");
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

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
                updateTopBarVisibility(url);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                diagnostics.logEvent("WEBVIEW_NAV", "onPageFinished: " + url);
                updateTopBarVisibility(url);
                try {
                    CookieManager.getInstance().flush();
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
                mainVerticalLayout.setVisibility(View.GONE);
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
                mainVerticalLayout.setVisibility(View.VISIBLE);
            }
        });

        LinearLayout.LayoutParams webViewParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1.0f);
        mainVerticalLayout.addView(webView, webViewParams);

        rootContainer.addView(
                mainVerticalLayout,
                new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT));

        setContentView(rootContainer);

        webView.loadUrl(BUNDLED_APP_URL);
        handleIncomingIntent(getIntent());
    }

    /**
     * Native top toolbar shown when MainActivity's WebView navigates directly to https://www.nba.com
     * (e.g. Official NBA ID Sign-In or direct stream playback) so the user can return to the Car Wrapper
     * with one tap and no X-Frame-Options blocking.
     */
    private LinearLayout buildTopNbaReturnBar() {
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setBackgroundColor(Color.parseColor("#12151E"));
        int padH = dpToPx(12);
        int padV = dpToPx(8);
        bar.setPadding(padH, padV, padH, padV);

        Button backBtn = new Button(this);
        backBtn.setText("← Return to NBA Car Wrapper");
        backBtn.setTextColor(Color.BLACK);
        backBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        backBtn.setTypeface(Typeface.DEFAULT_BOLD);
        backBtn.setAllCaps(false);
        GradientDrawable btnBg = new GradientDrawable();
        btnBg.setColor(Color.parseColor("#F59E0B"));
        btnBg.setCornerRadius(dpToPx(10));
        backBtn.setBackground(btnBg);
        backBtn.setPadding(dpToPx(14), dpToPx(6), dpToPx(14), dpToPx(6));
        backBtn.setOnClickListener(v -> returnToBundledWrapper());

        topBarTitleView = new TextView(this);
        topBarTitleView.setText("Official NBA.com (In-App Session · Native NBA App Blocked)");
        topBarTitleView.setTextColor(Color.parseColor("#D1D5DB"));
        topBarTitleView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        topBarTitleView.setSingleLine(true);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
        titleParams.setMargins(dpToPx(12), 0, dpToPx(12), 0);

        Button reloadBtn = new Button(this);
        reloadBtn.setText("Reload");
        reloadBtn.setTextColor(Color.WHITE);
        reloadBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        reloadBtn.setAllCaps(false);
        GradientDrawable reloadBg = new GradientDrawable();
        reloadBg.setColor(Color.parseColor("#262936"));
        reloadBg.setCornerRadius(dpToPx(8));
        reloadBtn.setBackground(reloadBg);
        reloadBtn.setPadding(dpToPx(12), dpToPx(6), dpToPx(12), dpToPx(6));
        reloadBtn.setOnClickListener(v -> {
            if (webView != null) {
                webView.reload();
            }
        });

        bar.addView(backBtn);
        bar.addView(topBarTitleView, titleParams);
        bar.addView(reloadBtn);
        return bar;
    }

    private void updateTopBarVisibility(String url) {
        if (topNbaReturnBar == null || url == null) {
            return;
        }
        runOnUiThread(() -> {
            boolean isExternalWeb = !url.startsWith("file:///android_asset/");
            topNbaReturnBar.setVisibility(isExternalWeb ? View.VISIBLE : View.GONE);
            if (isExternalWeb && topBarTitleView != null) {
                topBarTitleView.setText("In-App WebView: " + url);
            }
        });
    }

    private void returnToBundledWrapper() {
        runOnUiThread(() -> {
            try {
                CookieManager.getInstance().flush();
            } catch (Exception ignored) {
            }
            if (diagnostics != null) {
                diagnostics.logEvent("NBA_BRIDGE", "Returning from top-level NBA page to bundled Car Wrapper");
            }
            if (topNbaReturnBar != null) {
                topNbaReturnBar.setVisibility(View.GONE);
            }
            if (webView != null) {
                webView.loadUrl(BUNDLED_APP_URL);
            }
        });
    }

    private int dpToPx(int dp) {
        return Math.round(TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                dp,
                getResources().getDisplayMetrics()));
    }

    /**
     * Native JavaScript interface exposed as window.AndroidBridge.
     */
    public class AndroidBridge {

        @JavascriptInterface
        public void openNbaTopLevel(final String targetUrl) {
            runOnUiThread(() -> {
                if (webView == null) return;
                String safeUrl = (targetUrl != null && (targetUrl.startsWith("https://") || targetUrl.startsWith("http://")))
                        ? targetUrl
                        : "https://www.nba.com/account/sign-in";
                if (diagnostics != null) {
                    diagnostics.logEvent("NBA_BRIDGE", "Opening top-level NBA URL in WebView: " + safeUrl);
                }
                if (topNbaReturnBar != null) {
                    topNbaReturnBar.setVisibility(View.VISIBLE);
                }
                webView.loadUrl(safeUrl);
            });
        }

        @JavascriptInterface
        public void returnToNbaWrapper() {
            returnToBundledWrapper();
        }

        @JavascriptInterface
        public String getNbaCookieStatus() {
            try {
                CookieManager cm = CookieManager.getInstance();
                String nbaCookies = cm.getCookie("https://www.nba.com");
                String idCookies = cm.getCookie("https://id.nba.com");
                String combined = (nbaCookies != null ? nbaCookies : "") + ";" + (idCookies != null ? idCookies : "");
                boolean hasAuthCookie = combined.contains("nba") || combined.contains("sid") || combined.contains("token") || combined.contains("auth");
                JSONObject obj = new JSONObject();
                obj.put("hasCookies", !combined.replace(";", "").trim().isEmpty());
                obj.put("hasAuthCookie", hasAuthCookie);
                obj.put("cookieLength", combined.length());
                return obj.toString();
            } catch (Exception e) {
                return "{\"hasCookies\":false,\"hasAuthCookie\":false,\"cookieLength\":0}";
            }
        }

        @JavascriptInterface
        public void promptNativeTextInput(final String fieldId, final String title, final String currentValue, final boolean isPassword) {
            runOnUiThread(() -> {
                try {
                    AlertDialog.Builder builder = new AlertDialog.Builder(MainActivity.this);
                    builder.setTitle(title != null ? title : "Enter Text");

                    final EditText input = new EditText(MainActivity.this);
                    input.setText(currentValue != null ? currentValue : "");
                    input.setSingleLine(true);
                    input.setImeOptions(EditorInfo.IME_ACTION_DONE | EditorInfo.IME_FLAG_NO_EXTRACT_UI);
                    if (isPassword) {
                        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
                    } else {
                        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
                    }
                    int pad = dpToPx(16);
                    input.setPadding(pad, pad, pad, pad);
                    builder.setView(input);

                    builder.setPositiveButton("Done", (dialog, which) -> {
                        String val = input.getText() != null ? input.getText().toString() : "";
                        String escapedField = JSONObject.quote(fieldId != null ? fieldId : "");
                        String escapedVal = JSONObject.quote(val);
                        if (webView != null) {
                            webView.evaluateJavascript(
                                    "if (window.__onNativeInputResult) { window.__onNativeInputResult(" + escapedField + ", " + escapedVal + "); }",
                                    null);
                        }
                    });
                    builder.setNegativeButton("Cancel", (dialog, which) -> dialog.cancel());

                    AlertDialog dialog = builder.create();
                    dialog.show();
                } catch (Exception e) {
                    if (diagnostics != null) {
                        diagnostics.logEvent("NATIVE_INPUT_ERR", e.getMessage());
                    }
                }
            });
        }
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
        if (webView != null) {
            String currentUrl = webView.getUrl();
            if (currentUrl != null && !currentUrl.startsWith("file:///android_asset/")) {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    returnToBundledWrapper();
                }
                return;
            }
            if (webView.canGoBack()) {
                webView.goBack();
                return;
            }
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
