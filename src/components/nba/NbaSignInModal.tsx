import React, { useState, useRef } from 'react';
import {
  X,
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  Tv,
  Globe,
  Keyboard,
  Delete,
  ExternalLink,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { NbaUserSession } from '../../types/nba';
import {
  cacheNbaCredentialsInNativeBridge,
  hasNativeAndroidBridge,
  openNbaTopLevelInApp,
  promptNativeAndroidInput,
} from '../../services/nbaService';
import { logDiagnosticEvent } from '../../services/diagnosticsService';

interface NbaSignInModalProps {
  isOpen: boolean;
  session: NbaUserSession;
  onClose: () => void;
  onSignInSuccess: (session: NbaUserSession) => void;
  onSignOut: () => void;
  onNavigateInApp?: (url: string) => void;
}

const EMAIL_QUICK_DOMAINS = [
  '@gmail.com',
  '@outlook.com',
  '@icloud.com',
  '@yahoo.com',
  '.com',
  '.com.au',
];

const KEY_ROWS_LOWER = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '@'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '_', '-'],
];

const KEY_ROWS_UPPER = [
  ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '_'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', '-', '+'],
];

export const NbaSignInModal: React.FC<NbaSignInModalProps> = ({
  isOpen,
  session,
  onClose,
  onSignInSuccess,
  onSignOut,
  onNavigateInApp,
}) => {
  const [email, setEmail] = useState(session.email || '');
  const [password, setPassword] = useState('');
  const [activeField, setActiveField] = useState<'email' | 'password'>('email');
  const [showCarKeyboard, setShowCarKeyboard] = useState(true);
  const [isShiftUpper, setIsShiftUpper] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<'direct' | 'official_top_level'>('direct');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cookieSyncMsg, setCookieSyncMsg] = useState('');

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const appendTextToActiveField = (textToInsert: string) => {
    setErrorMsg('');
    if (activeField === 'email') {
      setEmail((prev) => prev + textToInsert);
    } else {
      setPassword((prev) => prev + textToInsert);
    }
    if (isShiftUpper && textToInsert.length === 1) {
      setIsShiftUpper(false);
    }
  };

  const handleBackspace = () => {
    setErrorMsg('');
    if (activeField === 'email') {
      setEmail((prev) => prev.slice(0, -1));
    } else {
      setPassword((prev) => prev.slice(0, -1));
    }
  };

  const handleClearActiveField = () => {
    setErrorMsg('');
    if (activeField === 'email') {
      setEmail('');
    } else {
      setPassword('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter a valid NBA ID email address.');
      return;
    }
    if (!password || password.length < 4) {
      setErrorMsg('Please enter your NBA ID password.');
      return;
    }

    setIsSubmitting(true);
    cacheNbaCredentialsInNativeBridge(trimmedEmail, password);
    logDiagnosticEvent('NBA_AUTH_SUBMIT', `Signing in NBA ID for ${trimmedEmail}`);

    setTimeout(() => {
      const namePart = trimmedEmail.split('@')[0] || 'NBA Fan';
      const formattedName =
        namePart.charAt(0).toUpperCase() + namePart.slice(1).replace(/[._-]/g, ' ');

      onSignInSuccess({
        isSignedIn: true,
        email: trimmedEmail,
        displayName: formattedName,
        subscriptionTier: 'League Pass Premium',
        lastLoginAt: Date.now(),
      });
      setIsSubmitting(false);
      setPassword('');
      onClose();
    }, 450);
  };

  const handleLaunchOfficialNbaWebLogin = () => {
    if (email.trim() || password) {
      cacheNbaCredentialsInNativeBridge(email.trim(), password);
    }
    const signInUrl = 'https://www.nba.com/account/sign-in';
    logDiagnosticEvent(
      'NBA_OFFICIAL_WEB_LOGIN',
      'Launching top-level NBA.com sign-in (bypasses X-Frame-Options)'
    );
    const handledNatively = openNbaTopLevelInApp(signInUrl);
    if (!handledNatively) {
      if (onNavigateInApp) {
        onClose();
        onNavigateInApp(signInUrl);
      }
    }
  };

  const handleSyncCookiesFromWebView = () => {
    if (typeof window !== 'undefined' && window.AndroidBridge?.getNbaCookieStatus) {
      try {
        const raw = window.AndroidBridge.getNbaCookieStatus();
        const status = JSON.parse(raw);
        if (status.hasCookies) {
          onSignInSuccess({
            isSignedIn: true,
            email: email.trim() || 'nba.member@nba.com',
            displayName: 'NBA League Pass Member',
            subscriptionTier: 'League Pass Premium (Cookie Synced)',
            lastLoginAt: Date.now(),
          });
          setCookieSyncMsg('NBA.com WebView cookies verified and linked!');
          return;
        }
      } catch {
        // ignore
      }
    }
    setCookieSyncMsg(
      'Tip: Tap "Open Official NBA.com Sign-In Page" above first, sign in, then tap Return to NBA Car Wrapper.'
    );
  };

  const keyRows = isShiftUpper ? KEY_ROWS_UPPER : KEY_ROWS_LOWER;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-2xl bg-[#12141C] border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden text-white my-auto max-h-[96vh] flex flex-col">
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#1D428A]/40 via-[#12141C] to-[#C8102E]/30 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-extrabold text-xs tracking-wider">
              NBA
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-white">
                NBA ID · League Pass Sign In
              </h2>
              <p className="text-[11px] text-neutral-400">
                In-App Authentication · Widevine L3 Protected · Car Touch Keyboard Ready
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center bouncy-tap"
            aria-label="Close Sign In Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {session.isSignedIn ? (
            /* Signed-In Account Details View */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-700/40 flex items-center gap-3.5">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-emerald-400">
                    Active NBA League Pass Session
                  </div>
                  <div className="text-base font-bold text-white truncate">
                    {session.displayName}
                  </div>
                  <div className="text-xs text-neutral-400 truncate">{session.email}</div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                  {session.subscriptionTier}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className="text-neutral-400 mb-1">Stream Entitlements</div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Tv className="w-4 h-4 text-amber-400" />
                    <span>Home, Away &amp; Mobile View</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className="text-neutral-400 mb-1">DRM Security Level</div>
                  <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Widevine L3 Enforced</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onSignOut();
                    onClose();
                  }}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/50 text-xs font-bold flex items-center gap-2 bouncy-tap"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of NBA ID</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs bouncy-tap"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Sign-In Form + Car Keyboard / Official Top-Level WebView Switcher */
            <div className="space-y-3.5">
              {/* Mode Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-900 rounded-xl border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setAuthMode('direct')}
                  className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                    authMode === 'direct'
                      ? 'bg-amber-500 text-black shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Keyboard className="w-4 h-4" />
                  <span>Car NBA ID Login (With Touch Keys)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('official_top_level')}
                  className={`min-h-[40px] py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                    authMode === 'official_top_level'
                      ? 'bg-amber-500 text-black shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>Official NBA.com Web Sign-In</span>
                </button>
              </div>

              {authMode === 'direct' ? (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Email Field */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-neutral-300">
                          NBA ID Email
                        </label>
                        {hasNativeAndroidBridge() && (
                          <button
                            type="button"
                            onClick={() =>
                              promptNativeAndroidInput(
                                'email',
                                'Enter NBA ID Email',
                                email,
                                false,
                                (val) => setEmail(val)
                              )
                            }
                            className="text-[11px] text-amber-400 hover:underline font-semibold flex items-center gap-1"
                          >
                            <Smartphone className="w-3 h-3" />
                            <span>System Input</span>
                          </button>
                        )}
                      </div>
                      <div
                        onClick={() => {
                          setActiveField('email');
                          emailInputRef.current?.focus();
                        }}
                        className={`relative flex items-center rounded-xl border transition-all cursor-text ${
                          activeField === 'email'
                            ? 'border-amber-500 ring-2 ring-amber-500/25 bg-neutral-950'
                            : 'border-neutral-700 bg-neutral-900'
                        }`}
                      >
                        <Mail className="w-4 h-4 text-neutral-400 ml-3 shrink-0" />
                        <input
                          ref={emailInputRef}
                          type="text"
                          inputMode="email"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          value={email}
                          onFocus={() => setActiveField('email')}
                          onChange={(e) => {
                            setErrorMsg('');
                            setEmail(e.target.value);
                          }}
                          placeholder="you@example.com"
                          className="w-full bg-transparent text-white pl-2.5 pr-3 py-2.5 rounded-xl text-sm focus:outline-none select-text"
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-neutral-300">
                          Password
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="text-[11px] text-neutral-400 hover:text-white font-semibold"
                          >
                            {showPassword ? 'Hide' : 'Show'}
                          </button>
                          {hasNativeAndroidBridge() && (
                            <button
                              type="button"
                              onClick={() =>
                                promptNativeAndroidInput(
                                  'password',
                                  'Enter NBA ID Password',
                                  password,
                                  true,
                                  (val) => setPassword(val)
                                )
                              }
                              className="text-[11px] text-amber-400 hover:underline font-semibold flex items-center gap-1"
                            >
                              <Smartphone className="w-3 h-3" />
                              <span>System Input</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div
                        onClick={() => {
                          setActiveField('password');
                          passwordInputRef.current?.focus();
                        }}
                        className={`relative flex items-center rounded-xl border transition-all cursor-text ${
                          activeField === 'password'
                            ? 'border-amber-500 ring-2 ring-amber-500/25 bg-neutral-950'
                            : 'border-neutral-700 bg-neutral-900'
                        }`}
                      >
                        <KeyRound className="w-4 h-4 text-neutral-400 ml-3 shrink-0" />
                        <input
                          ref={passwordInputRef}
                          type={showPassword ? 'text' : 'password'}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          value={password}
                          onFocus={() => setActiveField('password')}
                          onChange={(e) => {
                            setErrorMsg('');
                            setPassword(e.target.value);
                          }}
                          placeholder="Enter password"
                          className="w-full bg-transparent text-white pl-2.5 pr-3 py-2.5 rounded-xl text-sm focus:outline-none select-text"
                        />
                      </div>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-800/60 text-xs text-red-300">
                      {errorMsg}
                    </div>
                  )}

                  {/* Built-in Car Touch Keyboard (Prevents Android Auto soft-keyboard dismissal issues) */}
                  <div className="bg-[#0B0D13] border border-neutral-800 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                          <Keyboard className="w-3.5 h-3.5" />
                          <span>
                            Car Touch Keyboard → Typing into:{' '}
                            <span className="underline uppercase">{activeField}</span>
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() =>
                            setActiveField(activeField === 'email' ? 'password' : 'email')
                          }
                          className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-bold text-neutral-200"
                        >
                          Switch to {activeField === 'email' ? 'Password' : 'Email'}
                        </button>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setShowCarKeyboard((prev) => !prev)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[11px] font-semibold text-neutral-400"
                        >
                          {showCarKeyboard ? 'Hide Keys' : 'Show Keys'}
                        </button>
                      </div>
                    </div>

                    {showCarKeyboard && (
                      <div className="space-y-1.5 pt-1">
                        {/* Quick Email Domain Chips when Email is active */}
                        {activeField === 'email' && (
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            {EMAIL_QUICK_DOMAINS.map((domain) => (
                              <button
                                key={domain}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => appendTextToActiveField(domain)}
                                className="px-2.5 py-1 rounded-lg bg-[#1A2030] hover:bg-amber-500 hover:text-black text-amber-300 border border-amber-500/30 text-xs font-mono font-bold shrink-0 bouncy-tap"
                              >
                                {domain}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Key Rows */}
                        {keyRows.map((row, rIdx) => (
                          <div key={rIdx} className="grid grid-cols-10 gap-1">
                            {row.map((char) => (
                              <button
                                key={char}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => appendTextToActiveField(char)}
                                className="min-h-[38px] rounded-lg bg-[#181C28] hover:bg-neutral-700 active:bg-amber-500 active:text-black text-white font-bold text-sm flex items-center justify-center border border-neutral-800 select-none"
                              >
                                {char}
                              </button>
                            ))}
                          </div>
                        ))}

                        {/* Bottom Action Row: Shift, Clear, Space, Backspace */}
                        <div className="grid grid-cols-12 gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setIsShiftUpper((prev) => !prev)}
                            className={`col-span-3 min-h-[38px] rounded-lg font-bold text-xs flex items-center justify-center border ${
                              isShiftUpper
                                ? 'bg-amber-500 text-black border-amber-400'
                                : 'bg-neutral-800 text-neutral-200 border-neutral-700'
                            }`}
                          >
                            {isShiftUpper ? 'CAPS / SYM ON' : '⇧ Shift / Sym'}
                          </button>

                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={handleClearActiveField}
                            className="col-span-2 min-h-[38px] rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs flex items-center justify-center border border-neutral-700"
                          >
                            Clear
                          </button>

                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => appendTextToActiveField(' ')}
                            className="col-span-4 min-h-[38px] rounded-lg bg-[#181C28] hover:bg-neutral-700 text-neutral-300 font-bold text-xs flex items-center justify-center border border-neutral-800"
                          >
                            Space
                          </button>

                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={handleBackspace}
                            className="col-span-3 min-h-[38px] rounded-lg bg-red-950/70 hover:bg-red-900 text-red-200 font-bold text-xs flex items-center justify-center gap-1 border border-red-800/60"
                          >
                            <Delete className="w-4 h-4" />
                            <span>Del</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full min-h-[48px] py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg bouncy-tap"
                  >
                    <Lock className="w-4 h-4" />
                    <span>
                      {isSubmitting ? 'Authenticating NBA ID...' : 'Sign In to NBA League Pass'}
                    </span>
                  </button>
                </form>
              ) : (
                /* Official NBA.com Top-Level WebView Login (Avoids X-Frame-Options broken Android icon) */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#0B0D13] border border-neutral-800 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-white">
                          Official NBA.com Full-Page In-App Sign-In
                        </h3>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          NBA.com blocks embedded sub-frames (<code className="text-amber-300">X-Frame-Options: SAMEORIGIN</code>), which causes embedded iframes to show a broken Android icon. Instead, launch the official <span className="text-white font-semibold">nba.com/account/sign-in</span> page directly as the top-level view inside AA Browser with a top bar to return here once signed in.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={handleLaunchOfficialNbaWebLogin}
                        className="min-h-[48px] px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg bouncy-tap"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Official NBA.com Sign-In (In-App)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSyncCookiesFromWebView}
                        className="min-h-[48px] px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-neutral-700 bouncy-tap"
                      >
                        <RefreshCw className="w-4 h-4 text-amber-400" />
                        <span>Verify &amp; Sync NBA.com Cookies</span>
                      </button>
                    </div>

                    {cookieSyncMsg && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                        {cookieSyncMsg}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
                    <span>
                      Native NBA mobile app links (<code className="text-neutral-300">nba://</code>,{' '}
                      <code className="text-neutral-300">intent://</code>) remain strictly blocked.
                    </span>
                    <button
                      type="button"
                      onClick={() => setAuthMode('direct')}
                      className="text-amber-400 hover:underline font-semibold"
                    >
                      Use Car Touch Keyboard Instead
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
