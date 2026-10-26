package com.kododake.aabrowser;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.util.ArrayList;
import java.util.List;

/**
 * Primary Android Host Activity for AA Browser (NBA League Pass Edition).
 *
 * Features:
 * 1. Hardware-accelerated WebView with Widevine DRM (RESOURCE_PROTECTED_MEDIA_ID) automatically granted.
 * 2. Strict In-App URL interception: blocks Android App Links / intent:// / nba:// deep links from
 *    ever opening the native NBA app on the user's phone.
 * 3. Loads the bundled AA Browser + Custom NBA League Pass Wrapper UI from assets/www/index.html.
 */
public class MainActivity extends Activity {

    private static final String BUNDLED_APP_URL = "file:///android_asset/www/index.html";
    private WebView webView;
    private View customFullscreenView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private FrameLayout rootContainer;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);

        rootContainer = new FrameLayout(this);
        rootContainer.setBackgroundColor(Color.BLACK);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

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

                // Block all other custom schemes so native apps are never triggered
                return true;
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
                    if (!granted.isEmpty()) {
                        request.grant(granted.toArray(new String[0]));
                    } else {
                        request.grant(requestedResources);
                    }
                }
            }

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
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

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingIntent(intent);
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null || webView == null) {
            return;
        }
        String sharedUrl = intent.getStringExtra("shared_url");
        if (sharedUrl != null && !sharedUrl.trim().isEmpty()) {
            webView.loadUrl(BUNDLED_APP_URL);
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
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            CookieManager.getInstance().flush();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
