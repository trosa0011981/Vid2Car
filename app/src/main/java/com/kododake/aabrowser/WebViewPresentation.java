package com.kododake.aabrowser;

import android.annotation.SuppressLint;
import android.app.Presentation;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.Display;
import android.view.Gravity;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
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
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Hardware-Accelerated Android Presentation rendered onto the VirtualDisplay
 * backed by Android Auto's NavigationTemplate SurfaceContainer.
 *
 * Because this Presentation is projected inside a CarAppService with category
 * NAVIGATION (and SurfaceCallback), Google Android Auto keeps this surface
 * 100% active when the car is in motion and allows normal Android Auto apps
 * (Google Maps, Spotify, Coolwalk split-screen) to run simultaneously.
 *
 * Includes Widevine L3 (SW_SECURE_DECODE) Enforcer so DRM video frames render
 * directly onto the VirtualDisplay surface without HW_SECURE_ALL black-screen blocking.
 */
public class WebViewPresentation extends Presentation {

    public static final String BUNDLED_APP_URL = "file:///android_asset/www/index.html";
    public static final String OFFICIAL_NBA_GAMES_URL = "https://www.nba.com/games";

    private final Context appContext;
    private final DiagnosticLogCollector diagnostics;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private FrameLayout rootContainer;
    private LinearLayout mainVerticalLayout;
    private LinearLayout topNbaReturnBar;
    private TextView topBarTitleView;
    private WebView webView;
    private View customFullscreenView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private View touchIndicatorView;

    private float lastTouchX = -1f;
    private float lastTouchY = -1f;

    public WebViewPresentation(Context outerContext, Display display) {
        super(outerContext, display);
        this.appContext = outerContext.getApplicationContext();
        this.diagnostics = DiagnosticLogCollector.getInstance(this.appContext);
    }

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        if (window != null) {
            window.requestFeature(Window.FEATURE_NO_TITLE);
            window.addFlags(
                    WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
                            | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }

        rootContainer = new FrameLayout(getContext());
        rootContainer.setBackgroundColor(Color.BLACK);

        mainVerticalLayout = new LinearLayout(getContext());
        mainVerticalLayout.setOrientation(LinearLayout.VERTICAL);
        mainVerticalLayout.setBackgroundColor(Color.BLACK);

        topNbaReturnBar = buildTopNbaReturnBar();
        topNbaReturnBar.setVisibility(View.GONE);
        mainVerticalLayout.addView(
                topNbaReturnBar,
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT));

        // Create WebView using ApplicationContext so any AlertDialog or internal WebView
        // service calls work cleanly on a VirtualDisplay without Activity token crashes
        webView = new WebView(getContext());
        webView.setBackgroundColor(Color.BLACK);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);

        webView.addJavascriptInterface(diagnostics, "AndroidDiagnostics");
        webView.addJavascriptInterface(new CarAndroidBridge(), "AndroidBridge");

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUserAgentString(MainActivity.DESKTOP_CHROME_UA);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        }

        // Register document-start Widevine L3 Enforcer (SW_SECURE_DECODE)
        try {
            if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                WebViewCompat.addDocumentStartJavaScript(
                        webView,
                        MainActivity.DRM_L3_ENFORCER_JS,
                        Collections.singleton("*"));
                diagnostics.logEvent("CAR_DRM_L3", "Registered DOCUMENT_START_SCRIPT Widevine L3 Enforcer on Car Surface");
            }
        } catch (Exception e) {
            diagnostics.logEvent("CAR_DRM_L3_WARN", "Car Surface document-start fallback: " + e.getMessage());
        }

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
                if ("http".equals(scheme) || "https".equals(scheme) || "file".equals(scheme) || "about".equals(scheme)) {
                    return false;
                }
                if ("intent".equals(scheme)) {
                    String raw = uri.toString();
                    diagnostics.logEvent("CAR_URL_INTERCEPT", "Blocked intent:// URI on Car Surface: " + raw);
                    int fallbackIdx = raw.indexOf("S.browser_fallback_url=");
                    if (fallbackIdx != -1) {
                        String encodedFallback = raw.substring(fallbackIdx + "S.browser_fallback_url=".length());
                        int endIdx = encodedFallback.indexOf(';');
                        if (endIdx != -1) {
                            encodedFallback = encodedFallback.substring(0, endIdx);
                        }
                        String decoded = Uri.decode(encodedFallback);
                        if (decoded != null && (decoded.startsWith("http://") || decoded.startsWith("https://"))) {
                            view.loadUrl(decoded);
                        }
                    }
                    return true;
                }
                diagnostics.logEvent("CAR_URL_INTERCEPT", "Blocked custom scheme URI on Car Surface: " + uri);
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                diagnostics.logEvent("CAR_WEBVIEW_NAV", "onPageStarted: " + url);
                updateTopBarVisibility(url);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                diagnostics.logEvent("CAR_WEBVIEW_NAV", "onPageFinished: " + url);
                updateTopBarVisibility(url);
                try {
                    CookieManager.getInstance().flush();
                    view.evaluateJavascript(MainActivity.DRM_L3_ENFORCER_JS, null);
                    if (url != null && url.contains("nba.com")) {
                        CarSessionRegistry.setLastNbaUrl(appContext, url);
                        injectCarNbaPageEnhancer(view);
                    }
                } catch (Exception ignored) {
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && request != null && error != null && request.isForMainFrame()) {
                    diagnostics.logEvent("CAR_WEBVIEW_ERR", "MainFrame Error " + error.getErrorCode()
                            + " (" + error.getDescription() + ") on " + request.getUrl());
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                super.onReceivedHttpError(view, request, errorResponse);
                if (request != null && errorResponse != null && request.isForMainFrame()) {
                    diagnostics.logEvent("CAR_WEBVIEW_HTTP", "HTTP " + errorResponse.getStatusCode()
                            + " on " + request.getUrl());
                }
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                diagnostics.logEvent("CAR_WEBVIEW_SSL", "SSL Error: " + (error != null ? error.toString() : "unknown"));
                super.onReceivedSslError(view, handler, error);
            }
        });

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
                    diagnostics.logEvent("CAR_DRM_PERMISSION", "Granted Car WebChromeClient permissions: " + granted);
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
                    diagnostics.logEvent("CAR_JS_ERR", consoleMessage.message()
                            + " (" + consoleMessage.sourceId() + ":" + consoleMessage.lineNumber() + ")");
                }
                return super.onConsoleMessage(consoleMessage);
            }

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                diagnostics.logEvent("CAR_FULLSCREEN", "Entering fullscreen video on Car Surface");
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
                diagnostics.logEvent("CAR_FULLSCREEN", "Exiting fullscreen video on Car Surface");
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

        // Subtle visual touch ring for Android Auto SurfaceCallback taps
        touchIndicatorView = buildTouchIndicatorView();
        touchIndicatorView.setVisibility(View.GONE);
        rootContainer.addView(
                touchIndicatorView,
                new FrameLayout.LayoutParams(dpToPx(28), dpToPx(28)));

        setContentView(rootContainer);

        webView.onResume();
        webView.resumeTimers();
        webView.loadUrl(BUNDLED_APP_URL);

        Display d = getDisplay();
        diagnostics.logEvent("CAR_PRESENTATION", "WebViewPresentation created & started on display="
                + (d != null ? d.getName() + " (" + d.getDisplayId() + ")" : "null"));
    }

    private View buildTouchIndicatorView() {
        View indicator = new View(getContext());
        GradientDrawable ring = new GradientDrawable();
        ring.setShape(GradientDrawable.OVAL);
        ring.setColor(Color.argb(70, 245, 158, 11));
        ring.setStroke(dpToPx(2), Color.parseColor("#F59E0B"));
        indicator.setBackground(ring);
        return indicator;
    }

    private LinearLayout buildTopNbaReturnBar() {
        LinearLayout bar = new LinearLayout(getContext());
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setBackgroundColor(Color.parseColor("#12151E"));
        int padH = dpToPx(10);
        int padV = dpToPx(6);
        bar.setPadding(padH, padV, padH, padV);

        Button backBtn = new Button(getContext());
        backBtn.setText("← Car Wrapper");
        backBtn.setTextColor(Color.BLACK);
        backBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        backBtn.setTypeface(Typeface.DEFAULT_BOLD);
        backBtn.setAllCaps(false);
        GradientDrawable btnBg = new GradientDrawable();
        btnBg.setColor(Color.parseColor("#F59E0B"));
        btnBg.setCornerRadius(dpToPx(8));
        backBtn.setBackground(btnBg);
        backBtn.setPadding(dpToPx(12), dpToPx(5), dpToPx(12), dpToPx(5));
        backBtn.setOnClickListener(v -> returnToBundledWrapper());

        topBarTitleView = new TextView(getContext());
        topBarTitleView.setText("Official NBA.com · In-Motion Car Surface");
        topBarTitleView.setTextColor(Color.parseColor("#D1D5DB"));
        topBarTitleView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        topBarTitleView.setSingleLine(true);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
        titleParams.setMargins(dpToPx(10), 0, dpToPx(10), 0);

        Button playBtn = new Button(getContext());
        playBtn.setText("▶ Play / Unmute");
        playBtn.setTextColor(Color.WHITE);
        playBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        playBtn.setAllCaps(false);
        GradientDrawable playBg = new GradientDrawable();
        playBg.setColor(Color.parseColor("#059669"));
        playBg.setCornerRadius(dpToPx(8));
        playBtn.setBackground(playBg);
        playBtn.setPadding(dpToPx(10), dpToPx(5), dpToPx(10), dpToPx(5));
        LinearLayout.LayoutParams playParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        playParams.setMargins(0, 0, dpToPx(8), 0);
        playBtn.setOnClickListener(v -> triggerPlayOrUnmuteActiveVideo());

        Button reloadBtn = new Button(getContext());
        reloadBtn.setText("Reload");
        reloadBtn.setTextColor(Color.WHITE);
        reloadBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        reloadBtn.setAllCaps(false);
        GradientDrawable reloadBg = new GradientDrawable();
        reloadBg.setColor(Color.parseColor("#262936"));
        reloadBg.setCornerRadius(dpToPx(8));
        reloadBtn.setBackground(reloadBg);
        reloadBtn.setPadding(dpToPx(10), dpToPx(5), dpToPx(10), dpToPx(5));
        reloadBtn.setOnClickListener(v -> handleReload());

        bar.addView(backBtn);
        bar.addView(topBarTitleView, titleParams);
        bar.addView(playBtn, playParams);
        bar.addView(reloadBtn);
        return bar;
    }

    private void updateTopBarVisibility(String url) {
        if (topNbaReturnBar == null || url == null) {
            return;
        }
        mainHandler.post(() -> {
            boolean isExternalWeb = !url.startsWith("file:///android_asset/");
            topNbaReturnBar.setVisibility(isExternalWeb ? View.VISIBLE : View.GONE);
            if (isExternalWeb && topBarTitleView != null) {
                topBarTitleView.setText("In-Motion Surface: " + url);
            }
        });
    }

    private void injectCarNbaPageEnhancer(WebView view) {
        String savedEmail = CarSessionRegistry.getSavedNbaEmail(appContext);
        String savedPass = CarSessionRegistry.getSavedNbaPassword(appContext);
        String emailJson = JSONObject.quote(savedEmail != null ? savedEmail : "");
        String passJson = JSONObject.quote(savedPass != null ? savedPass : "");

        String js = "(function() {\n" +
                "  try {\n" +
                "    document.querySelectorAll('video').forEach(function(v) {\n" +
                "      v.setAttribute('playsinline', 'true');\n" +
                "      v.setAttribute('webkit-playsinline', 'true');\n" +
                "    });\n" +
                "    var savedEmail = " + emailJson + ";\n" +
                "    var savedPass = " + passJson + ";\n" +
                "    if (savedEmail && window.location.pathname.indexOf('sign-in') !== -1) {\n" +
                "      setTimeout(function() {\n" +
                "        var emailInput = document.querySelector('input[type=\"email\"], input[name=\"email\"], input[id*=\"email\" i]');\n" +
                "        var passInput = document.querySelector('input[type=\"password\"], input[name=\"password\"]');\n" +
                "        if (emailInput && !emailInput.value) {\n" +
                "          var nativeEmailSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;\n" +
                "          nativeEmailSetter.call(emailInput, savedEmail);\n" +
                "          emailInput.dispatchEvent(new Event('input', { bubbles: true }));\n" +
                "        }\n" +
                "        if (passInput && savedPass && !passInput.value) {\n" +
                "          var nativePassSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;\n" +
                "          nativePassSetter.call(passInput, savedPass);\n" +
                "          passInput.dispatchEvent(new Event('input', { bubbles: true }));\n" +
                "        }\n" +
                "      }, 900);\n" +
                "    }\n" +
                "    if (window.location.search.indexOf('watch') !== -1) {\n" +
                "      setTimeout(function() {\n" +
                "        var btns = Array.from(document.querySelectorAll('button, a'));\n" +
                "        var watchBtn = btns.find(function(b) {\n" +
                "          var t = (b.textContent || '').trim().toLowerCase();\n" +
                "          return t === 'watch' || t === 'watch live' || t === 'play' || t.indexOf('streams') !== -1;\n" +
                "        });\n" +
                "        if (watchBtn) watchBtn.click();\n" +
                "      }, 1500);\n" +
                "    }\n" +
                "  } catch (e) {}\n" +
                "})();";
        view.evaluateJavascript(js, null);
    }

    // ========================================================================
    // Android Auto SurfaceCallback Touch, Scroll, Zoom & ActionStrip Handlers
    // ========================================================================

    public void onSurfaceActive() {
        mainHandler.post(() -> {
            if (webView != null) {
                webView.onResume();
                webView.resumeTimers();
            }
        });
    }

    public void handleCarTouchClick(final float x, final float y) {
        mainHandler.post(() -> {
            if (rootContainer == null || webView == null) return;
            lastTouchX = x;
            lastTouchY = y;

            showTouchFeedback(x, y);

            long downTime = SystemClock.uptimeMillis();
            MotionEvent downEvent = MotionEvent.obtain(
                    downTime, downTime, MotionEvent.ACTION_DOWN, x, y, 0);
            downEvent.setSource(InputDevice.SOURCE_TOUCHSCREEN);
            rootContainer.dispatchTouchEvent(downEvent);
            downEvent.recycle();

            mainHandler.postDelayed(() -> {
                if (rootContainer == null) return;
                long upTime = SystemClock.uptimeMillis();
                MotionEvent upEvent = MotionEvent.obtain(
                        downTime, upTime, MotionEvent.ACTION_UP, x, y, 0);
                upEvent.setSource(InputDevice.SOURCE_TOUCHSCREEN);
                rootContainer.dispatchTouchEvent(upEvent);
                upEvent.recycle();
            }, 40);
        });
    }

    public void handleCarScroll(final float distanceX, final float distanceY) {
        mainHandler.post(() -> {
            if (webView == null) return;

            DisplayMetrics dm = getContext().getResources().getDisplayMetrics();
            float density = dm.density > 0 ? dm.density : 1.0f;

            float targetPxX = lastTouchX >= 0 ? lastTouchX : (rootContainer.getWidth() / 2.0f);
            float targetPxY = lastTouchY >= 0 ? lastTouchY : (rootContainer.getHeight() / 2.0f);

            int topOffset = (topNbaReturnBar != null && topNbaReturnBar.getVisibility() == View.VISIBLE)
                    ? topNbaReturnBar.getHeight()
                    : 0;
            float webViewPxY = Math.max(0f, targetPxY - topOffset);

            int cssX = Math.round(targetPxX / density);
            int cssY = Math.round(webViewPxY / density);
            int cssDx = Math.round(distanceX / density);
            int cssDy = Math.round(distanceY / density);

            String scrollJs = "(function(dx, dy, cx, cy) {\n" +
                    "  try {\n" +
                    "    var el = document.elementFromPoint(cx, cy);\n" +
                    "    while (el && el !== document.body && el !== document.documentElement) {\n" +
                    "      var style = window.getComputedStyle(el);\n" +
                    "      var oy = style ? style.overflowY : '';\n" +
                    "      var ox = style ? style.overflowX : '';\n" +
                    "      var canY = (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 2;\n" +
                    "      var canX = (ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 2;\n" +
                    "      if (canY || canX) {\n" +
                    "        el.scrollBy(dx, dy);\n" +
                    "        return;\n" +
                    "      }\n" +
                    "      el = el.parentElement;\n" +
                    "    }\n" +
                    "    window.scrollBy(dx, dy);\n" +
                    "  } catch (e) {\n" +
                    "    window.scrollBy(dx, dy);\n" +
                    "  }\n" +
                    "})(" + cssDx + ", " + cssDy + ", " + cssX + ", " + cssY + ");";

            webView.evaluateJavascript(scrollJs, null);
        });
    }

    public void handleCarFling(final float velocityX, final float velocityY) {
        // Convert fling velocity into a smooth scroll step
        handleCarScroll(-velocityX * 0.16f, -velocityY * 0.16f);
    }

    public void handleCarScale(final float focusX, final float focusY, final float scaleFactor) {
        mainHandler.post(() -> {
            if (webView == null) return;
            lastTouchX = focusX;
            lastTouchY = focusY;
            if (scaleFactor > 0.01f && Math.abs(scaleFactor - 1.0f) > 0.02f) {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        webView.zoomBy(scaleFactor);
                    }
                } catch (Exception ignored) {
                }
            }
        });
    }

    private void showTouchFeedback(float x, float y) {
        if (touchIndicatorView == null) return;
        int radius = dpToPx(14);
        touchIndicatorView.setTranslationX(x - radius);
        touchIndicatorView.setTranslationY(y - radius);
        touchIndicatorView.setVisibility(View.VISIBLE);
        touchIndicatorView.setAlpha(1.0f);
        touchIndicatorView.animate()
                .alpha(0f)
                .setDuration(280)
                .withEndAction(() -> {
                    if (touchIndicatorView != null) {
                        touchIndicatorView.setVisibility(View.GONE);
                    }
                })
                .start();
    }

    public void returnToBundledWrapper() {
        mainHandler.post(() -> {
            try {
                CookieManager.getInstance().flush();
            } catch (Exception ignored) {
            }
            if (customFullscreenView != null && webView != null && webView.getWebChromeClient() != null) {
                webView.getWebChromeClient().onHideCustomView();
            }
            if (topNbaReturnBar != null) {
                topNbaReturnBar.setVisibility(View.GONE);
            }
            if (webView != null) {
                webView.loadUrl(BUNDLED_APP_URL);
            }
        });
    }

    public void toggleOfficialNbaOrWrapper() {
        mainHandler.post(() -> {
            if (webView == null) return;
            String currentUrl = webView.getUrl();
            if (currentUrl != null && !currentUrl.startsWith("file:///android_asset/")) {
                returnToBundledWrapper();
            } else {
                String lastNba = CarSessionRegistry.getLastNbaUrl(appContext);
                String target = (lastNba != null && lastNba.startsWith("https://") && lastNba.contains("nba.com"))
                        ? lastNba
                        : OFFICIAL_NBA_GAMES_URL;
                if (topNbaReturnBar != null) {
                    topNbaReturnBar.setVisibility(View.VISIBLE);
                }
                webView.loadUrl(target);
            }
        });
    }

    public void handleBack() {
        mainHandler.post(() -> {
            if (customFullscreenView != null && webView != null && webView.getWebChromeClient() != null) {
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
                }
            }
        });
    }

    public void handleReload() {
        mainHandler.post(() -> {
            if (webView != null) {
                webView.onResume();
                webView.resumeTimers();
                webView.reload();
            }
        });
    }

    public void triggerPlayOrUnmuteActiveVideo() {
        mainHandler.post(() -> {
            if (webView == null) return;
            webView.onResume();
            webView.resumeTimers();
            String js = "(function() {\n" +
                    "  try {\n" +
                    "    var videos = Array.from(document.querySelectorAll('video'));\n" +
                    "    if (videos.length > 0) {\n" +
                    "      videos.forEach(function(v) {\n" +
                    "        v.muted = false;\n" +
                    "        v.volume = 1.0;\n" +
                    "        v.setAttribute('playsinline', 'true');\n" +
                    "        if (v.paused) { v.play().catch(function(){ v.muted = true; v.play().catch(function(){}); }); }\n" +
                    "      });\n" +
                    "      return 'video_played';\n" +
                    "    }\n" +
                    "    var btns = Array.from(document.querySelectorAll('button, a'));\n" +
                    "    var watchBtn = btns.find(function(b) {\n" +
                    "      var t = (b.textContent || '').trim().toLowerCase();\n" +
                    "      return t === 'watch' || t === 'watch live' || t === 'play' || t.indexOf('watch stream') !== -1 || t.indexOf('streams') !== -1;\n" +
                    "    });\n" +
                    "    if (watchBtn) { watchBtn.click(); return 'button_clicked'; }\n" +
                    "  } catch (e) {}\n" +
                    "  return 'none';\n" +
                    "})();";
            webView.evaluateJavascript(js, null);
        });
    }

    public void loadUrlOnUiThread(final String url) {
        mainHandler.post(() -> {
            if (webView == null || url == null || url.isEmpty()) return;
            webView.onResume();
            webView.resumeTimers();
            boolean isExternal = !url.startsWith("file:///android_asset/");
            if (topNbaReturnBar != null) {
                topNbaReturnBar.setVisibility(isExternal ? View.VISIBLE : View.GONE);
            }
            webView.loadUrl(url);
        });
    }

    public void destroyPresentationWebView() {
        mainHandler.post(() -> {
            try {
                if (webView != null) {
                    CookieManager.getInstance().flush();
                    webView.destroy();
                    webView = null;
                }
            } catch (Exception ignored) {
            }
        });
    }

    private int dpToPx(int dp) {
        return Math.round(TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                dp,
                getContext().getResources().getDisplayMetrics()));
    }

    /**
     * Native JavaScript interface exposed as window.AndroidBridge inside Car Surface WebView.
     */
    public class CarAndroidBridge {

        @JavascriptInterface
        public void openNbaTopLevel(final String targetUrl) {
            mainHandler.post(() -> {
                if (webView == null) return;
                String safeUrl = (targetUrl != null && (targetUrl.startsWith("https://") || targetUrl.startsWith("http://")))
                        ? targetUrl
                        : "https://www.nba.com/account/sign-in";
                diagnostics.logEvent("CAR_NBA_BRIDGE", "Opening top-level NBA URL on Car Surface: " + safeUrl);
                CarSessionRegistry.setLastNbaUrl(appContext, safeUrl);
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
        public void saveNbaCredentials(final String email, final String password) {
            CarSessionRegistry.saveNbaCredentials(appContext, email, password);
            diagnostics.logEvent("CAR_NBA_AUTH", "Saved shared NBA ID credentials from Car Surface (" + email + ")");
        }

        @JavascriptInterface
        public void fetchNbaScheduleAsync(final String dateKey) {
            new Thread(() -> {
                HttpURLConnection conn = null;
                try {
                    String target = "https://www.nba.com/games?date=" + Uri.encode(dateKey != null ? dateKey : "");
                    URL url = new URL(target);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(6000);
                    conn.setReadTimeout(6000);
                    conn.setRequestProperty("User-Agent", MainActivity.DESKTOP_CHROME_UA);
                    conn.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
                    try {
                        String cookie = CookieManager.getInstance().getCookie("https://www.nba.com");
                        if (cookie != null && !cookie.isEmpty()) {
                            conn.setRequestProperty("Cookie", cookie);
                        }
                    } catch (Exception ignored) {
                    }

                    int status = conn.getResponseCode();
                    if (status >= 200 && status < 300) {
                        StringBuilder html = new StringBuilder();
                        try (BufferedReader reader = new BufferedReader(
                                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                            String line;
                            while ((line = reader.readLine()) != null) {
                                html.append(line).append("\n");
                            }
                        }
                        String fullHtml = html.toString();
                        String marker = "<script id=\"__NEXT_DATA__\" type=\"application/json\">";
                        int startIdx = fullHtml.indexOf(marker);
                        if (startIdx != -1) {
                            startIdx += marker.length();
                            int endIdx = fullHtml.indexOf("</script>", startIdx);
                            if (endIdx != -1) {
                                final String nextDataJson = fullHtml.substring(startIdx, endIdx);
                                final String quotedDate = JSONObject.quote(dateKey);
                                final String quotedJson = JSONObject.quote(nextDataJson);
                                mainHandler.post(() -> {
                                    if (webView != null) {
                                        webView.evaluateJavascript(
                                                "if (window.__onNbaScheduleLoaded) { window.__onNbaScheduleLoaded(" + quotedDate + ", " + quotedJson + "); }",
                                                null);
                                    }
                                });
                            }
                        }
                    }
                } catch (Exception e) {
                    diagnostics.logEvent("CAR_NBA_FETCH_WARN", "Car NBA schedule fetch fallback for " + dateKey + ": " + e.getMessage());
                } finally {
                    if (conn != null) {
                        conn.disconnect();
                    }
                }
            }, "Car-NBA-Schedule-Fetcher").start();
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
            // On the Car Surface, the built-in Car Touch Keyboard inside NbaSignInModal is already shown;
            // if saved credentials exist in CarSessionRegistry, also offer instant auto-fill.
            mainHandler.post(() -> {
                if (webView == null) return;
                String savedVal = "password".equalsIgnoreCase(fieldId)
                        ? CarSessionRegistry.getSavedNbaPassword(appContext)
                        : CarSessionRegistry.getSavedNbaEmail(appContext);
                if ((currentValue == null || currentValue.isEmpty()) && savedVal != null && !savedVal.isEmpty()) {
                    String escapedField = JSONObject.quote(fieldId != null ? fieldId : "");
                    String escapedVal = JSONObject.quote(savedVal);
                    webView.evaluateJavascript(
                            "if (window.__onNativeInputResult) { window.__onNativeInputResult(" + escapedField + ", " + escapedVal + "); }",
                            null);
                }
            });
        }
    }
}
