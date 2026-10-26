# NBA League Pass Automotive Wrapper for AA Browser

Transform NBA League Pass inside AA Browser into a self-contained, touch-friendly automotive dashboard wrapper that parses daily NBA matchups into high-contrast game tiles, provides an in-app multi-feed stream selector (Home, Away, Mobile View, Condensed Recap), and manages NBA ID sign-in while staying 100% inside AA Browser without ever triggering the native NBA app on your phone.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following product and architectural choices have been confirmed from your feedback and will govern the implementation:

- **Confirmed Decision 1 — Strictly In-App Execution (Block Native Phone App Hijacking)**: Tapping the **NBA League Pass** tile on the Start Page, browsing games, signing in, and playing streams will stay **100% inside AA Browser**. We will intercept NBA routes internally before the browser or OS can evaluate Android App Links (`https://www.nba.com/*`, `intent://`, or `nba://` deep links) and eliminate external `window.open` / `target="_blank"` redirects so it **never** triggers or opens the native NBA app on your phone.
- **Confirmed Decision 2 — In-App Stream Selector & Video Playback**: Tapping a game tile opens an in-app **Stream Selector & Player View** where you can choose between **Home Feed**, **Away Feed**, **Mobile View (Zoomed Camera)**, or **Game Recap** and tap a prominent **Play Stream** button to play directly within the AA Browser viewport with Widevine L3 compatibility active.
- **Confirmed Decision 3 — Custom NBA Games Dashboard Features**: The wrapper displays a horizontal **Date Scroller** (to browse yesterday, today, and upcoming dates), a **Hide Scores** spoiler toggle switch in the header, and individual **Game Tiles** with official team logos, win-loss records, live game clock/status, and scores (masked when Hide Scores is active).
- **Confirmed Decision 4 — In-App NBA ID Authentication**: A dedicated **Sign In with NBA ID** button and session status indicator sit in the top-right corner of the NBA wrapper header, opening an in-app sign-in modal that authenticates and stores your session state locally inside AA Browser.
- **Confirmed Decision 5 — Start Page Quick-Link Tile**: A dedicated **NBA League Pass** quick-link tile is added right alongside the existing YouTube tile on the main landing page and in the default bookmarks list.

---

### 1. Overview & Core Concept

- **What It Does**: Provides a built-in NBA League Pass experience right inside AA Browser. When you tap the **NBA League Pass** tile on the Start Page (or enter `nba.com/games` in the address bar), AA Browser intercepts the request internally so Android OS App Links are never triggered. It renders a custom automotive dashboard where you can browse matchups by date, toggle score spoilers off, sign in with your NBA ID, and watch Home, Away, or Mobile View streams inside the app's own video player.
- **Target Audience / Persona**: Drivers and passengers using AA Browser on an Android Auto head unit or dashboard display while parked who want a seamless, in-app NBA League Pass experience without being kicked out to their phone's native NBA app.
- **Key Value**: Prevents Android deep-link hijacking, replaces dense web clutter with 48px+ automotive touch targets, provides instant spoiler protection, and supports direct broadcast feed switching (Home, Away, Mobile View) with Widevine L3 playback inside the current app.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Start Page Launch (No External App Trigger)**: On the AA Browser Start Page, the user taps the **NBA League Pass** tile located right beside the **YouTube** tile. The internal router transitions the current tab directly into the built-in NBA League Pass Wrapper view without firing a top-level OS link intent.
  2. **Games & Scores Dashboard**: The custom NBA League Pass wrapper opens inside the active browser tab. The top bar displays the NBA League Pass wordmark, an in-app **Wrapper / Embedded Web View** toggle, a **Hide Scores** toggle switch, and the top-right **Sign In with NBA ID** button (or authenticated user badge).
  3. **Date Navigation & Spoiler Control**: Below the header, a single-line horizontal date carousel lets the user tap across Yesterday, Today, and Upcoming dates. Toggling **Hide Scores** immediately masks numerical points and win-loss spoilers across all tiles while preserving team logos, records, and game status (`FINAL`, `LIVE Q4`, or tip-off time).
  4. **Game Selection & Stream Feed Picker**: Tapping any game tile (or its **Watch** button) opens the in-app **Game Stream & Player Screen**. Here the user selects from large segmented feed cards:
     - **Home Team Stream** (Local broadcast commentary)
     - **Away Team Stream** (Visiting broadcast commentary)
     - **Mobile View Stream** (Zoomed-in courtside camera angle)
     - **Full Game Recap** (Condensed highlight stream)
  5. **In-App Stream Playback & Widevine Enforcement**: Pressing the primary **Play Stream** button starts the embedded video player right inside the current tab with Widevine L3 compatibility active. If the user switches to the embedded web view mode, all links are sandboxed inside the current tab so no external app or popup can be launched.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-contrast automotive sports broadcast console designed for zero-glare cabin legibility and rapid visual scanning.
  - *Color Palette & Mood*:
    - Dominant Canvas (60%): True-black AMOLED background (`#090A0F`) and deep slate containers (`#12151E`) to eliminate cabin glare.
    - Structural Surfaces (30%): Elevated game cards (`#1A1E2B`) with subtle hairline borders (`rgba(255, 255, 255, 0.08)`) and crisp white/silver typography (`#F8FAFC` / `#94A3B8`).
    - Accent Budget (10%): Official NBA League Pass Gold (`#F59E0B` / `#FBBF24`) for primary Watch/Play CTAs, active stream feeds, and League Pass indicators, paired with live broadcast crimson (`#EF4444`) for live game clocks.
  - *Typography & Hierarchy*:
    - Display & Team Names: `Plus Jakarta Sans` (Bold/ExtraBold) for team matchups and section headers.
    - Scores, Records & Game Clocks: `JetBrains Mono` with `tabular-nums` (`font-variant-numeric: tabular-nums`) so scores (`136 - 109`) and records (`2-1`) align with broadcast precision.
  - *Component Styling & Layout*:
    - Responsive 2-column to 3-column grid of game tiles on widescreen head units (`max-w-6xl`), ensuring every interactive control has a minimum `48x48px` touch hitbox.
    - Adheres to zero-pill discipline for static metadata (rendering records and broadcast info as clean unboxed text with `·` separators) while making the Date Scroller, Hide Scores switch, and Stream Feed selectors tactile interactive buttons.
- **Interactive Feedback & Motion**:
  - Tactile `.bouncy-tap` scale feedback (`scale(0.96)` within 150ms) on every game tile, date button, and stream selector card.
  - Smooth skeleton shimmer state while fetching live scoreboard data for the selected date.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Deep-Link & App-Link Suppression (Staying 100% In-App)**:
  - *Chosen Approach*: Intercept all `nba.com` URLs inside AA Browser's internal tab state router before any native OS navigation occurs, remove all `target="_blank"` / `window.open` calls for NBA routes, and enforce strict iframe sandboxing (`allow-same-origin allow-scripts allow-forms allow-presentation` without `allow-top-navigation` or `allow-popups`) when rendering embedded web streams.
  - *Why*: On Android, standard `<a href="https://www.nba.com/...">` navigations or popups trigger Android App Links, which immediately yank focus away from Android Auto / AA Browser and open the mobile NBA app on the phone. By handling routing in-memory and blocking top-level navigation and `intent://` schemes, the entire experience remains locked inside AA Browser.
- **Decision 2 — Live Scoreboard Data Feed + Curated Matchup Fallback**:
  - *Chosen Approach*: Fetch real-time NBA schedule and scoreboard data from official NBA CDN JSON feeds (`cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json`), backed by rich game datasets (including the exact matchups from your screenshots: Lakers vs. Jazz, Pacers vs. Nets, Clippers vs. Thunder, plus daily schedules) if offline or CORS-restricted.
  - *Why*: Consuming structured scoreboard JSON delivers instant load times, official team logos, accurate quarter/clock states, and zero risk of triggering web-based "Open in NBA App" smart banners.
- **Decision 3 — In-App Stream Feed Selection & Widevine L3 Support**:
  - *Chosen Approach*: Keep the Widevine L3 Enforcer enabled by default in `BrowserSettings`, and provide an in-app multi-stream video player (`Home`, `Away`, `Mobile View`, `Recap`) with an optional in-tab sandboxed web stream mode that stays strictly inside the current viewport.
  - *Why*: Gives you full control over selecting Home, Away, or Mobile View camera feeds with a dedicated **Play Stream** button while staying inside the current app screen.
- **Decision 4 — Start Page Slot Migration**:
  - *Chosen Approach*: Update the default Start Page slots and bookmarks so **NBA League Pass** is automatically placed in Slot 3 right next to **YouTube** (Slot 2) and **Google** (Slot 1), including an automatic migration so existing saved local storage sessions also receive the new **NBA League Pass** tile immediately.
  - *Why*: Ensures the new tile appears right alongside YouTube on your main landing page without requiring a manual reset.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        AA Browser Root Application                        │
│  ┌─────────────────────────┐               ┌───────────────────────────┐  │
│  │   Start Page Dashboard  │               │   Browser Settings Store  │  │
│  │  • Slot 1: Google       │               │  • drmL3Enforcer: true    │  │
│  │  • Slot 2: YouTube      │               │  • NBA ID Session State   │  │
│  │  • Slot 3: NBA League   │──────────────▶│  • Hide Scores Preference │  │
│  │            Pass (NEW)   │  In-Memory    └───────────────────────────┘  │
│  └─────────────────────────┘  Tab State                                   │
│                                    │ (No OS Intent / No App Link Trigger) │
│                                    ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │            In-App WebView Router & Deep-Link Blocker                │  │
│  │   Matches nba.com/games* ──▶ Renders In-App NBA Wrapper Component   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                      │
│                                    ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                 NBA League Pass Automotive Wrapper                  │  │
│  │  ┌───────────────────────────────────────────────────────────────┐  │  │
│  │  │ Top Bar: NBA League Pass · [Hide Scores] · [In-App Web View]  │  │  │
│  │  │          · [Sign In with NBA ID / Account Badge]              │  │  │
│  │  └───────────────────────────────────────────────────────────────┘  │  │
│  │  ┌───────────────────────────────────────────────────────────────┐  │  │
│  │  │ Date Scroller:  <  [Sun 25]  [Mon 26]  [Tue 27]  [Wed 28]  >  │  │  │
│  │  └───────────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────┐ ┌─────────────────────┐ ┌───────────────┐  │  │
│  │  │ Game Tile: LAL-UTA  │ │ Game Tile: IND-BKN  │ │ Game Tile ... │  │  │
│  │  │ Logos · Records     │ │ Logos · Records     │ │               │  │  │
│  │  │ Score (or Hidden)   │ │ Score (or Hidden)   │ │               │  │  │
│  │  │ [ ▶ Watch Stream ]  │ │ [ ▶ Watch Stream ]  │ │               │  │  │
│  │  └──────────┬──────────┘ └──────────┬──────────┘ └───────────────┘  │  │
│  └─────────────┼───────────────────────┼───────────────────────────────┘  │
│                └───────────┬───────────┘                                  │
│                            ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │             In-App Game Stream Selector & Video Player              │  │
│  │  • Stream Feeds: [Home Stream] [Away Stream] [Mobile View] [Recap]  │  │
│  │  • Primary Control: [ ▶ Play Stream (In-App Widevine L3 Player) ]   │  │
│  │  • Sandboxed Mode: [ Switch to In-Tab Embedded Stream Frame ]       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `NbaGame`: `gameId`, `gameCode`, `gameStatus` (`1` Scheduled, `2` Live, `3` Final), `gameStatusText` (e.g., `FINAL`, `Q4 02:14`, `7:30 PM ET`), `date`, `awayTeam` (`teamId`, `tricode`, `name`, `record`, `score`, `logoUrl`, `leader`), `homeTeam` (`teamId`, `tricode`, `name`, `record`, `score`, `logoUrl`, `leader`), `streams` (array of available feeds: `home`, `away`, `mobile`, `recap` with stream metadata and embedded playback streams).
  - `NbaUserSession`: `isSignedIn`, `email`, `displayName`, `subscriptionTier` (`League Pass Premium`), `authToken`, persisted in localStorage.
  - `NbaWrapperPreferences`: `hideScores` (boolean), `selectedDate` (ISO date string), `viewMode` (`wrapper` | `embedded_web`).

- **Interactive Component & State Mapping**:
  - **Start Page Tile & Deep-Link Suppression**: Tapping the **NBA League Pass** tile calls AA Browser's internal `onNavigate('https://www.nba.com/games')` state transition, which updates the React tab state in-memory and renders `<NbaLeaguePassWrapper />` directly inside the viewport—never invoking browser-level link navigation or Android OS intent resolution.
  - **Date Selection Handler**: Clicking any date in the horizontal scroller updates `selectedDate`, loads the matchups for that date, and renders the game tiles.
  - **Hide Scores Toggle**: Toggling the switch in the header or NBA ID dropdown menu flips `hideScores` in state and localStorage, replacing numeric scores with `•••` and hiding game leader point spoilers until revealed.
  - **In-App NBA ID Sign-In Modal**: Clicking `Sign In` in the top-right opens the dropdown menu (`Sign in with NBA ID`, `Hide Scores` toggle, `Help`) matching your screenshot, and opens an in-app NBA ID login modal that authenticates and stores your session inside AA Browser.
  - **In-App Stream Selection & Play Handler**: Clicking a game tile opens the stream view inside the wrapper, defaults to the **Home Team Stream**, lets the user switch between **Home**, **Away**, **Mobile View (Zoomed)**, and **Recap**, and plays the stream right inside the current tab when **Play Stream** is pressed.
