# Keep WebView and JavaScript interface classes intact
-keepattributes *Annotation*,JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.kododake.aabrowser.** { *; }
-dontwarn android.webkit.**
