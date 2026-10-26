package com.kododake.aabrowser;

import android.content.Intent;
import android.content.res.Configuration;

import androidx.annotation.NonNull;
import androidx.car.app.Screen;
import androidx.car.app.Session;

/**
 * Android Auto Session for AABrowser (NBA League Pass Edition).
 * Creates and manages the AABrowserNavigationScreen so the app runs inside
 * standard Google Android Auto without parked-only driving blocks.
 */
public class AABrowserCarSession extends Session {

    @NonNull
    @Override
    public Screen onCreateScreen(@NonNull Intent intent) {
        DiagnosticLogCollector diagnostics = DiagnosticLogCollector.getInstance(getCarContext());
        diagnostics.logIntent("AABrowserCarSession.onCreateScreen", intent, null);
        return new AABrowserNavigationScreen(getCarContext());
    }

    @Override
    public void onNewIntent(@NonNull Intent intent) {
        super.onNewIntent(intent);
        DiagnosticLogCollector diagnostics = DiagnosticLogCollector.getInstance(getCarContext());
        diagnostics.logIntent("AABrowserCarSession.onNewIntent", intent, null);
    }

    @Override
    public void onCarConfigurationChanged(@NonNull Configuration newConfiguration) {
        super.onCarConfigurationChanged(newConfiguration);
        DiagnosticLogCollector diagnostics = DiagnosticLogCollector.getInstance(getCarContext());
        diagnostics.logConfiguration("AABrowserCarSession.onCarConfigurationChanged", newConfiguration);
    }
}
