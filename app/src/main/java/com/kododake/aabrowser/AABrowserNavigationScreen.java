package com.kododake.aabrowser;

import android.content.Context;
import android.graphics.Rect;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.view.Surface;

import androidx.annotation.NonNull;
import androidx.car.app.AppManager;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.SurfaceCallback;
import androidx.car.app.SurfaceContainer;
import androidx.car.app.model.Action;
import androidx.car.app.model.ActionStrip;
import androidx.car.app.model.CarIcon;
import androidx.car.app.model.Template;
import androidx.car.app.navigation.NavigationManager;
import androidx.car.app.navigation.NavigationManagerCallback;
import androidx.car.app.navigation.model.NavigationTemplate;
import androidx.core.graphics.drawable.IconCompat;
import androidx.lifecycle.Lifecycle;
import androidx.lifecycle.LifecycleEventObserver;
import androidx.lifecycle.LifecycleOwner;

/**
 * Android Auto Navigation Screen hosting our custom SurfaceCallback + VirtualDisplay
 * + WebViewPresentation.
 *
 * Why NavigationTemplate + SurfaceCallback:
 * 1. Runs natively inside standard Google Android Auto alongside Google Maps, Spotify,
 *    phone calls, and Coolwalk split-screen dashboard.
 * 2. Never triggers the "Can't play while driving" overlay when the vehicle is in motion
 *    because Navigation surfaces are exempt from parked-only restrictions.
 * 3. Forwards all head unit touchscreen taps (onClick), drags (onScroll/onFling),
 *    pinch-zooms (onScale), and ActionStrip button presses directly to WebViewPresentation.
 */
public class AABrowserNavigationScreen extends Screen implements LifecycleEventObserver {

    private static final String VIRTUAL_DISPLAY_NAME = "AABrowser_CarSurface";

    private final DiagnosticLogCollector diagnostics;
    private VirtualDisplay virtualDisplay;
    private WebViewPresentation presentation;
    private boolean isPanModeActive = false;

    private final SurfaceCallback surfaceCallback = new SurfaceCallback() {
        @Override
        public void onSurfaceAvailable(@NonNull SurfaceContainer surfaceContainer) {
            Surface surface = surfaceContainer.getSurface();
            int width = surfaceContainer.getWidth();
            int height = surfaceContainer.getHeight();
            int dpi = surfaceContainer.getDpi();

            diagnostics.logEvent("CAR_SURFACE", "onSurfaceAvailable: "
                    + width + "x" + height + " @ " + dpi + "dpi | surfaceValid="
                    + (surface != null && surface.isValid()));

            if (surface == null || !surface.isValid() || width <= 0 || height <= 0 || dpi <= 0) {
                diagnostics.logEvent("CAR_SURFACE_WARN", "Ignoring invalid SurfaceContainer parameters");
                return;
            }

            try {
                DisplayManager dm = (DisplayManager) getCarContext().getSystemService(Context.DISPLAY_SERVICE);
                if (dm == null) {
                    diagnostics.logEvent("CAR_SURFACE_ERR", "DisplayManager is null");
                    return;
                }

                if (virtualDisplay == null) {
                    int flags = DisplayManager.VIRTUAL_DISPLAY_FLAG_OWN_CONTENT_ONLY
                            | DisplayManager.VIRTUAL_DISPLAY_FLAG_PRESENTATION;
                    virtualDisplay = dm.createVirtualDisplay(
                            VIRTUAL_DISPLAY_NAME,
                            width,
                            height,
                            dpi,
                            surface,
                            flags);

                    if (virtualDisplay != null && virtualDisplay.getDisplay() != null) {
                        presentation = new WebViewPresentation(getCarContext(), virtualDisplay.getDisplay());
                        presentation.show();
                        CarSessionRegistry.registerCarPresentation(presentation, width, height, dpi);
                        diagnostics.logEvent("CAR_SURFACE", "VirtualDisplay & WebViewPresentation active on displayId="
                                + virtualDisplay.getDisplay().getDisplayId());
                    }
                } else {
                    // Surface resized or re-attached (e.g. toggling between Coolwalk split-screen and full-screen)
                    virtualDisplay.resize(width, height, dpi);
                    virtualDisplay.setSurface(surface);
                    CarSessionRegistry.updateCarSurfaceDimensions(width, height, dpi);
                    if (presentation != null) {
                        if (!presentation.isShowing()) {
                            presentation.show();
                        }
                        presentation.onSurfaceActive();
                    }
                    diagnostics.logEvent("CAR_SURFACE", "Updated existing VirtualDisplay surface to "
                            + width + "x" + height + "@" + dpi + "dpi without interrupting playback");
                }
            } catch (Exception e) {
                diagnostics.logEvent("CAR_SURFACE_ERR", "Failed to bind VirtualDisplay: " + e.getMessage());
            }
        }

        @Override
        public void onVisibleAreaChanged(@NonNull Rect visibleArea) {
            diagnostics.logEvent("CAR_SURFACE", "onVisibleAreaChanged: " + visibleArea.toShortString());
        }

        @Override
        public void onStableAreaChanged(@NonNull Rect stableArea) {
            diagnostics.logEvent("CAR_SURFACE", "onStableAreaChanged: " + stableArea.toShortString());
        }

        @Override
        public void onSurfaceDestroyed(@NonNull SurfaceContainer surfaceContainer) {
            diagnostics.logEvent("CAR_SURFACE", "onSurfaceDestroyed (detaching surface while preserving WebView session)");
            try {
                if (virtualDisplay != null) {
                    virtualDisplay.setSurface(null);
                }
            } catch (Exception e) {
                diagnostics.logEvent("CAR_SURFACE_WARN", "Error detaching surface: " + e.getMessage());
            }
        }

        @Override
        public void onClick(float x, float y) {
            diagnostics.logEvent("CAR_TOUCH", "onClick(" + Math.round(x) + ", " + Math.round(y) + ")");
            if (presentation != null) {
                presentation.handleCarTouchClick(x, y);
            }
        }

        @Override
        public void onScroll(float distanceX, float distanceY) {
            if (presentation != null) {
                presentation.handleCarScroll(distanceX, distanceY);
            }
        }

        @Override
        public void onFling(float velocityX, float velocityY) {
            if (presentation != null) {
                presentation.handleCarFling(velocityX, velocityY);
            }
        }

        @Override
        public void onScale(float focusX, float focusY, float scaleFactor) {
            if (presentation != null) {
                presentation.handleCarScale(focusX, focusY, scaleFactor);
            }
        }
    };

    public AABrowserNavigationScreen(@NonNull CarContext carContext) {
        super(carContext);
        this.diagnostics = DiagnosticLogCollector.getInstance(carContext);
        getLifecycle().addObserver(this);
    }

    @Override
    public void onStateChanged(@NonNull LifecycleOwner source, @NonNull Lifecycle.Event event) {
        if (event == Lifecycle.Event.ON_CREATE) {
            onScreenCreate();
        } else if (event == Lifecycle.Event.ON_RESUME) {
            onScreenResume();
        } else if (event == Lifecycle.Event.ON_DESTROY) {
            onScreenDestroy();
        }
    }

    private void onScreenCreate() {
        diagnostics.logEvent("CAR_SCREEN", "AABrowserNavigationScreen.onCreate -> registering SurfaceCallback");
        try {
            getCarContext().getCarService(AppManager.class).setSurfaceCallback(surfaceCallback);
        } catch (Exception e) {
            diagnostics.logEvent("CAR_SCREEN_ERR", "setSurfaceCallback failed: " + e.getMessage());
        }

        try {
            NavigationManager navManager = getCarContext().getCarService(NavigationManager.class);
            navManager.setNavigationManagerCallback(new NavigationManagerCallback() {
                @Override
                public void onStopNavigation() {
                    diagnostics.logEvent("CAR_NAV_MGR", "onStopNavigation callback");
                }

                @Override
                public void onAutoDriveEnabled() {
                    diagnostics.logEvent("CAR_NAV_MGR", "onAutoDriveEnabled");
                }
            });
        } catch (Exception e) {
            diagnostics.logEvent("CAR_NAV_MGR_WARN", "NavigationManager callback registration warning: " + e.getMessage());
        }
    }

    private void onScreenResume() {
        diagnostics.logEvent("CAR_SCREEN", "AABrowserNavigationScreen.onResume");
        if (presentation != null) {
            presentation.onSurfaceActive();
        }
    }

    private void onScreenDestroy() {
        diagnostics.logEvent("CAR_SCREEN", "AABrowserNavigationScreen.onDestroy -> releasing VirtualDisplay & Presentation");
        try {
            getCarContext().getCarService(AppManager.class).setSurfaceCallback(null);
        } catch (Exception ignored) {
        }
        if (presentation != null) {
            CarSessionRegistry.unregisterCarPresentation(presentation);
            try {
                presentation.destroyPresentationWebView();
                presentation.dismiss();
            } catch (Exception ignored) {
            }
            presentation = null;
        }
        if (virtualDisplay != null) {
            try {
                virtualDisplay.release();
            } catch (Exception ignored) {
            }
            virtualDisplay = null;
        }
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        CarIcon homeIcon = new CarIcon.Builder(
                IconCompat.createWithResource(getCarContext(), R.drawable.ic_car_home)).build();
        CarIcon tvIcon = new CarIcon.Builder(
                IconCompat.createWithResource(getCarContext(), R.drawable.ic_car_tv)).build();
        CarIcon backIcon = new CarIcon.Builder(
                IconCompat.createWithResource(getCarContext(), R.drawable.ic_car_back)).build();
        CarIcon reloadIcon = new CarIcon.Builder(
                IconCompat.createWithResource(getCarContext(), R.drawable.ic_car_reload)).build();

        // Top ActionStrip (4 buttons: NBA Home, Official NBA.com Toggle, Back, Reload)
        // Only 1 titled action ("NBA") + 3 icon actions to satisfy all Android Auto host constraints
        Action homeAction = new Action.Builder()
                .setTitle("NBA")
                .setIcon(homeIcon)
                .setOnClickListener(() -> {
                    diagnostics.logEvent("CAR_ACTION", "ActionStrip: NBA Wrapper Home clicked");
                    if (presentation != null) {
                        presentation.returnToBundledWrapper();
                    }
                })
                .build();

        Action officialWebAction = new Action.Builder()
                .setIcon(tvIcon)
                .setOnClickListener(() -> {
                    diagnostics.logEvent("CAR_ACTION", "ActionStrip: Toggle Official NBA.com / Wrapper clicked");
                    if (presentation != null) {
                        presentation.toggleOfficialNbaOrWrapper();
                    }
                })
                .build();

        Action backAction = new Action.Builder()
                .setIcon(backIcon)
                .setOnClickListener(() -> {
                    diagnostics.logEvent("CAR_ACTION", "ActionStrip: Back clicked");
                    if (presentation != null) {
                        presentation.handleBack();
                    }
                })
                .build();

        Action reloadAction = new Action.Builder()
                .setIcon(reloadIcon)
                .setOnClickListener(() -> {
                    diagnostics.logEvent("CAR_ACTION", "ActionStrip: Reload clicked");
                    if (presentation != null) {
                        presentation.handleReload();
                    }
                })
                .build();

        ActionStrip actionStrip = new ActionStrip.Builder()
                .addAction(homeAction)
                .addAction(officialWebAction)
                .addAction(backAction)
                .addAction(reloadAction)
                .build();

        NavigationTemplate.Builder templateBuilder = new NavigationTemplate.Builder()
                .setActionStrip(actionStrip);

        // MapActionStrip (Pan/Touch Mode toggle + Scroll Up + Scroll Down + Play/Unmute Video)
        try {
            CarIcon upIcon = new CarIcon.Builder(
                    IconCompat.createWithResource(getCarContext(), R.drawable.ic_car_up)).build();
            CarIcon downIcon = new CarIcon.Builder(
                    IconCompat.createWithResource(getCarContext(), R.drawable.ic_car_down)).build();
            CarIcon playIcon = new CarIcon.Builder(
                    IconCompat.createWithResource(getCarContext(), R.drawable.ic_car_play)).build();

            Action scrollUpAction = new Action.Builder()
                    .setIcon(upIcon)
                    .setOnClickListener(() -> {
                        if (presentation != null) {
                            presentation.handleCarScroll(0f, -260f);
                        }
                    })
                    .build();

            Action scrollDownAction = new Action.Builder()
                    .setIcon(downIcon)
                    .setOnClickListener(() -> {
                        if (presentation != null) {
                            presentation.handleCarScroll(0f, 260f);
                        }
                    })
                    .build();

            Action playUnmuteAction = new Action.Builder()
                    .setIcon(playIcon)
                    .setOnClickListener(() -> {
                        diagnostics.logEvent("CAR_ACTION", "MapActionStrip: Play / Unmute active video clicked");
                        if (presentation != null) {
                            presentation.triggerPlayOrUnmuteActiveVideo();
                        }
                    })
                    .build();

            ActionStrip mapActionStrip = new ActionStrip.Builder()
                    .addAction(Action.PAN)
                    .addAction(scrollUpAction)
                    .addAction(scrollDownAction)
                    .addAction(playUnmuteAction)
                    .build();

            templateBuilder.setMapActionStrip(mapActionStrip);
            templateBuilder.setPanModeListener(isInPanMode -> {
                isPanModeActive = isInPanMode;
                diagnostics.logEvent("CAR_PAN_MODE", "Pan Mode changed: " + isInPanMode);
            });
        } catch (Throwable t) {
            diagnostics.logEvent("CAR_TEMPLATE_WARN", "MapActionStrip fallback: " + t.getMessage());
        }

        return templateBuilder.build();
    }
}
