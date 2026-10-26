package com.kododake.aabrowser;

import androidx.annotation.NonNull;
import androidx.car.app.CarAppService;
import androidx.car.app.Session;
import androidx.car.app.validation.HostValidator;

/**
 * Primary Android Auto CarAppService declared with category
 * androidx.car.app.category.NAVIGATION and ACCESS_SURFACE.
 *
 * Allows AABrowser (NBA League Pass Edition) to run inside standard Google Android Auto
 * alongside Google Maps, Spotify, and Coolwalk split-screen while remaining active
 * when the vehicle is in motion.
 */
public class AABrowserCarAppService extends CarAppService {

    @NonNull
    @Override
    public HostValidator createHostValidator() {
        return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR;
    }

    @NonNull
    @Override
    public Session onCreateSession() {
        DiagnosticLogCollector.getInstance(this)
                .logEvent("CAR_SERVICE", "AABrowserCarAppService.onCreateSession() bound by Android Auto host");
        return new AABrowserCarSession();
    }
}
