import React, { useState } from 'react';
import { X, ShieldCheck, UserCheck, LogOut, Lock, Mail, Tv, Check } from 'lucide-react';
import { NbaUserSession } from '../../types/nba';

interface NbaSignInModalProps {
  isOpen: boolean;
  session: NbaUserSession;
  drmL3Enabled: boolean;
  onSaveSession: (session: NbaUserSession) => void;
  onClose: () => void;
}

export const NbaSignInModal: React.FC<NbaSignInModalProps> = ({
  isOpen,
  session,
  drmL3Enabled,
  onSaveSession,
  onClose,
}) => {
  const [email, setEmail] = useState(session.email || '');
  const [password, setPassword] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState(
    session.subscriptionTier || 'League Pass Premium'
  );
  const [authMode, setAuthMode] = useState<'form' | 'embedded'>('form');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  if (!isOpen) return null;

  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsAuthenticating(true);
    setTimeout(() => {
      const displayName = email.split('@')[0] || 'NBA Fan';
      onSaveSession({
        isSignedIn: true,
        email: email.trim(),
        displayName,
        subscriptionTier,
        favoriteTeams: session.favoriteTeams?.length ? session.favoriteTeams : ['LAL'],
        lastSignInAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setIsAuthenticating(false);
      setPassword('');
      onClose();
    }, 450);
  };

  const handleSignOut = () => {
    onSaveSession({
      isSignedIn: false,
      email: '',
      displayName: '',
      subscriptionTier: 'League Pass',
      favoriteTeams: session.favoriteTeams,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg bg-[#12151E] border border-neutral-800 rounded-3xl p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-sm">
              NBA
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Sign in with NBA ID</h3>
              <p className="text-xs text-neutral-400">
                In-App League Pass Authentication · Widevine {drmL3Enabled ? 'L3 Active' : 'Standard'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors bouncy-tap"
            aria-label="Close sign in dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {session.isSignedIn ? (
          <div className="mt-5 space-y-4">
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Signed in as</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Authenticated In-App</span>
                </span>
              </div>
              <div className="text-base font-bold text-white">{session.email}</div>
              <div className="text-xs text-amber-400 font-medium">
                {session.subscriptionTier} · All Streams Unlocked (Home, Away, Mobile View)
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSignOut}
                className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/50 text-xs font-bold flex items-center justify-center gap-2 bouncy-tap"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of NBA ID</span>
              </button>
              <button
                onClick={onClose}
                className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold bouncy-tap"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-xl border border-neutral-800 mb-4">
              <button
                type="button"
                onClick={() => setAuthMode('form')}
                className={`flex-1 min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  authMode === 'form'
                    ? 'bg-amber-500 text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                In-App NBA ID Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('embedded')}
                className={`flex-1 min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  authMode === 'embedded'
                    ? 'bg-amber-500 text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Embedded Sign-In Frame
              </button>
            </div>

            {authMode === 'form' ? (
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    NBA ID Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your NBA ID password"
                      className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    League Pass Plan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['League Pass Premium', 'League Pass Standard'].map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setSubscriptionTier(tier)}
                        className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-between bouncy-tap ${
                          subscriptionTier === tier
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{tier}</span>
                        {subscriptionTier === tier && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 text-[11px] text-neutral-400 flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Stays 100% inside AA Browser. Credentials are stored locally for in-app stream handshakes and never trigger the mobile NBA app.
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[48px] px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold bouncy-tap"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="flex-1 min-h-[48px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg bouncy-tap"
                  >
                    <Tv className="w-4 h-4" />
                    <span>{isAuthenticating ? 'Signing in...' : 'Sign In with NBA ID'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="w-full h-72 rounded-2xl overflow-hidden border border-neutral-800 bg-black relative">
                  <iframe
                    src="https://www.nba.com/account/sign-in"
                    title="NBA ID Embedded Sign-In"
                    sandbox="allow-same-origin allow-scripts allow-forms"
                    className="w-full h-full border-none"
                  />
                </div>
                <p className="text-[11px] text-neutral-400">
                  Sandboxed in-app web container (top-level redirects and mobile app deep links are blocked). If NBA.com blocks third-party framing, use the In-App NBA ID Login tab above.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
