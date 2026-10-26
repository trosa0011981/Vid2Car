package com.kododake.aabrowser;

import android.app.Application;
import android.content.res.Configuration;

/**
 * Application entry point that automatically starts the background Android Auto
 * & WebView DiagnosticLogCollector the instant the process starts—requiring zero
 * UI interaction on the car head unit screen.
 */
public class AABrowserApplication extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        DiagnosticLogCollector collector = DiagnosticLogCollector.getInstance(this);
        collector.logEvent("APP_LIFECYCLE", "AABrowserApplication.onCreate() — Background Auto-Logger initialized automatically");
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        DiagnosticLogCollector.getInstance(this).logConfiguration("APP_CONFIG_CHANGED", newConfig);
    }
}
