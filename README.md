# AA Browser - Automotive Web Experience (React Edition)

<div align="center">
  <img src="/bmc-logo.svg" width="64" height="64" alt="AA Browser Logo" />
  <h1>AA Browser</h1>
  <p><strong>The modern WebView browser experience designed specifically for car screens and Android Auto head units.</strong></p>
</div>

---

## ✨ Features & Architecture

AA Browser has been rewritten as a high-performance React application preserving all core business logic and car-first features:

- 🎨 **Material 3 Expressive Design:** Built specifically for dashboard and head unit screens with fluid expressive animations, true-black AMOLED theme, and touch-friendly controls.
- 🗂️ **Multi-Tab Management:** Desktop-class tab management supporting up to 8 tabs with tab switching, smooth reordering, active tab indicators, and session persistence in local storage.
- 🚀 **Customizable Start Page:** Up to 6 quick-link shortcut tiles with custom slot assignment, drag-and-drop reordering, automotive digital clock, cached site icons, and custom wallpaper support.
- 📱 **Car Floating Action Button (FAB):** Auto-hiding in-app floating button (hides after 3 seconds of web page interaction) with configurable screen positions (bottom-left, bottom-right, top-left, top-right) and mode switching (Open Menu vs Focus URL Bar).
- 🔍 **Universal Address Bar:** Smart URL formatter handling direct URLs and search queries, with HTTPS TLS security indicators and cleartext HTTP warnings.
- 🖥️ **Desktop Mode & User Agent Switching:** Instant toggle between Mobile and Desktop viewports, with support for Android Chrome, Safari iOS/macOS, Firefox, Microsoft Edge, Samsung Internet, and custom User Agent strings.
- 🎚️ **Global Display Scale:** Scale browser UI and web content together from 40% to 200% with preset chips (80%, 100%, 120%, 140%) to optimize readability on any vehicle head unit distance.
- 📲 **Quick QR Code Sharing:** Live QR code generation allowing drivers and passengers to scan any open URL and continue browsing on mobile devices.
- 🚗 **Dashboard Simulator:** Toggle between full-screen responsive browsing and simulated Automotive Head Unit bezel with dashboard status bar (parked mode indicator 🅿️, signal, battery, and clock).
- ☕ **Sponsors & Community:** Built-in Buy Me a Coffee and GitHub Sponsors section with live donor recognition from `sponsors.json`.

---

## 🚀 Running the App

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Build for production
npm run build
```

---

## 📄 License & Attribution

This application is licensed under the GNU General Public License version 3 (GPLv3).
Attribution to the original repository: [https://github.com/kododake/AABrowser](https://github.com/kododake/AABrowser)

**Stay safe, keep your eyes on the road, and happy browsing! 🚗💨**
