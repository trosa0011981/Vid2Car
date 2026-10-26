package com.kododake.aabrowser;

import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.CookieManager;

import java.lang.ref.WeakReference;

/**
 * Shared state and live session bridge between the Phone UI (MainActivity)
 * and the Android Auto Head Unit Navigation Surface (WebViewPresentation).
 *
 * Ensures that NBA ID credentials, League Pass cookies, and active game URLs
 * are seamlessly synchronized across the phone and the car head unit.
 */
public final class CarSessionRegistry {

    private static final String PREFS_NAME = "aab_nba_shared_prefs";
    private static final String KEY_NBA_EMAIL = "nba_email";
    private static final String KEY_NBA_PASSWORD = "nba_password";
    private static final String KEY_LAST_NBA_URL = "last_nba_url";

    private static volatile WeakReference<WebViewPresentation> activeCarPresentationRef = new WeakReference<>(null);
    private static volatile String activeCarSurfaceInfo = "Not connected";

    private CarSessionRegistry() {
    }

    public static void registerCarPresentation(WebViewPresentation presentation, int width, int height, int dpi) {
        activeCarPresentationRef = new WeakReference<>(presentation);
        activeCarSurfaceInfo = "Active (" + width + "x" + height + "@" + dpi + "dpi)";
    }

    public static void updateCarSurfaceDimensions(int width, int height, int dpi) {
        activeCarSurfaceInfo = "Active (" + width + "x" + height + "@" + dpi + "dpi)";
    }

    public static void unregisterCarPresentation(WebViewPresentation presentation) {
        WebViewPresentation current = activeCarPresentationRef.get();
        if (current == null || current == presentation) {
            activeCarPresentationRef = new WeakReference<>(null);
            activeCarSurfaceInfo = "Disconnected";
        }
    }

    public static WebViewPresentation getActiveCarPresentation() {
        return activeCarPresentationRef.get();
    }

    public static String getActiveCarSurfaceInfo() {
        WebViewPresentation current = activeCarPresentationRef.get();
        if (current == null) {
            return "Standby (Waiting for Android Auto Navigation Surface)";
        }
        return activeCarSurfaceInfo;
    }

    public static void saveNbaCredentials(Context context, String email, String password) {
        if (context == null) return;
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putString(KEY_NBA_EMAIL, email != null ? email : "")
                .putString(KEY_NBA_PASSWORD, password != null ? password : "")
                .apply();
        try {
            CookieManager.getInstance().flush();
        } catch (Exception ignored) {
        }
    }

    public static String getSavedNbaEmail(Context context) {
        if (context == null) return "";
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_NBA_EMAIL, "");
    }

    public static String getSavedNbaPassword(Context context) {
        if (context == null) return "";
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_NBA_PASSWORD, "");
    }

    public static void setLastNbaUrl(Context context, String url) {
        if (context == null || url == null) return;
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_LAST_NBA_URL, url).apply();
    }

    public static String getLastNbaUrl(Context context) {
        if (context == null) return "";
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_LAST_NBA_URL, "");
    }

    /**
     * If the Android Auto head unit presentation is currently active, loads the specified
     * URL directly onto the car screen (allowing the user or passenger to beam a game or
     * sign-in session from the phone straight to the car display).
     */
    public static boolean loadUrlOnCarDisplayIfActive(String url) {
        WebViewPresentation presentation = activeCarPresentationRef.get();
        if (presentation != null && url != null && !url.isEmpty()) {
            presentation.loadUrlOnUiThread(url);
            return true;
        }
        return false;
    }
}
