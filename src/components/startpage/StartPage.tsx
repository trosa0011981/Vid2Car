import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  ExternalLink,
  Coffee,
  Heart,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  X,
  QrCode,
  MoveUp,
  MoveDown,
  Settings2,
} from 'lucide-react';
import { BookmarkEntry } from '../../types/browser';
import {
  formatNavigableUrl,
  displayTitleForUrl,
  extractHost,
  getFaviconUrl,
  isNbaUrl,
  BUY_ME_A_COFFEE_URL,
  GITHUB_REPO_URL,
  AA_ANYTHING_RELEASE_URL,
} from '../../utils/urlFormatter';
import { SlotPickerDialog } from './SlotPickerDialog';

interface StartPageProps {
  slots: (string | null)[];
  bookmarks: BookmarkEntry[];
  hasResumePage: boolean;
  lastVisitedUrl: string | null;
  customBackgroundUri: string | null;
  hideSponsors: boolean;
  showAAAnythingPromotion: boolean;
  onNavigate: (url: string) => void;
  onResumeLastPage: () => void;
  onUpdateSlot: (index: number, url: string | null) => void;
  onMoveSlot: (fromIndex: number, toIndex: number) => void;
  onDismissAAAnything: () => void;
}

export const StartPage: React.FC<StartPageProps> = ({
  slots,
  bookmarks,
  hasResumePage,
  lastVisitedUrl,
  customBackgroundUri,
  hideSponsors,
  showAAAnythingPromotion,
  onNavigate,
  onResumeLastPage,
  onUpdateSlot,
  onMoveSlot,
  onDismissAAAnything,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [photoOnlyMode, setPhotoOnlyMode] = useState(false);
  const [activeSponsorTab, setActiveSponsorTab] = useState<'bmc' | 'github'>('bmc');
  const [selectedSlotForEdit, setSelectedSlotForEdit] = useState<number | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onNavigate(formatNavigableUrl(searchInput));
    }
  };

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-between overflow-y-auto select-none"
      onClick={() => {
        if (photoOnlyMode) setPhotoOnlyMode(false);
      }}
    >
      {/* Background wallpaper */}
      {customBackgroundUri ? (
        <div
          className="fixed inset-0 bg-cover bg-center -z-10 brightness-[0.7]"
          style={{ backgroundImage: `url(${customBackgroundUri})` }}
        />
      ) : (
        <div className="fixed inset-0 bg-gradient-to-br from-neutral-950 via-[#0e121a] to-[#080a0f] -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))]" />
        </div>
      )}

      {/* Photo Only Mode overlay notice */}
      {photoOnlyMode && (
        <div className="fixed top-6 right-6 z-30 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md text-xs text-neutral-300 border border-white/10 animate-pulse">
          Photo Only Mode &bull; Tap anywhere to return
        </div>
      )}

      {/* Main Content Area */}
      {!photoOnlyMode && (
        <div className="w-full max-w-4xl px-4 py-8 mx-auto flex flex-col items-center gap-6">
          {/* Header & Automotive Clock */}
          <div className="flex flex-col items-center text-center">
            <div className="text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-md">
              {formattedTime}
            </div>
            <div className="text-sm md:text-base font-medium text-neutral-400 mt-1">
              {formattedDate}
            </div>

            <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-800/80 border border-neutral-700/80 text-xs text-blue-400 font-semibold tracking-wide">
              <span>AABROWSER</span>
              <span className="text-neutral-500">&bull;</span>
              <span className="text-neutral-300">Car Head Unit Edition</span>
            </div>
          </div>

          {/* Search bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="w-full max-w-xl relative flex items-center group"
          >
            <div className="absolute left-4 text-neutral-400 group-focus-within:text-blue-400 transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search Google or enter web address"
              className="w-full bg-neutral-900/90 hover:bg-neutral-900 focus:bg-neutral-950 border border-neutral-700/80 focus:border-blue-500 rounded-2xl pl-12 pr-12 py-3.5 text-base text-white placeholder:text-neutral-500 shadow-xl backdrop-blur-md focus:outline-none transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-4 p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* AA Anything Promotion Card */}
          {showAAAnythingPromotion && (
            <div className="w-full max-w-2xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-md flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600/30 text-blue-400 shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Bring Your Favorite Apps to Android Auto 🚗✨
                  </h4>
                  <p className="text-xs text-neutral-300 mt-0.5 max-w-md">
                    Don&apos;t limit your dashboard. Watch media, browse freely, and run daily apps on the big screen with AA Anything.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={AA_ANYTHING_RELEASE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 bouncy-tap shadow"
                >
                  <span>Get App</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={onDismissAAAnything}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 bouncy-tap"
                  title="Dismiss announcement"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 6 Quick Links Grid */}
          <div className="w-full max-w-2xl">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Quick Links ({slots.filter(Boolean).length}/6)
              </span>
              <span className="text-xs text-neutral-500">Tap to open or reassign</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {slots.map((url, index) => {
                const title = url ? displayTitleForUrl(url) : `Slot ${index + 1}`;
                const host = url ? extractHost(url) : '';
                const isNbaSlot = url ? isNbaUrl(url) : false;

                if (!url) {
                  return (
                    <button
                      key={`empty-${index}`}
                      onClick={() => setSelectedSlotForEdit(index)}
                      className="h-28 rounded-2xl border-2 border-dashed border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 hover:bg-neutral-900/70 p-4 flex flex-col items-center justify-center gap-2 text-neutral-500 hover:text-neutral-300 transition-all bouncy-tap group"
                    >
                      <div className="w-10 h-10 rounded-full bg-neutral-800/80 group-hover:bg-neutral-700 flex items-center justify-center text-neutral-400">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-semibold">Slot {index + 1}</div>
                      <div className="text-[10px] text-neutral-500">Tap to assign</div>
                    </button>
                  );
                }

                return (
                  <div
                    key={`slot-${index}-${url}`}
                    className={`relative group h-28 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg backdrop-blur-md transition-all cursor-pointer border ${
                      isNbaSlot
                        ? 'bg-gradient-to-br from-[#13192B]/95 via-neutral-900/95 to-[#2A1018]/90 border-amber-500/35 hover:border-amber-400/70'
                        : 'bg-neutral-900/80 hover:bg-neutral-800/90 border-neutral-800 hover:border-neutral-700'
                    }`}
                    onClick={() => onNavigate(url)}
                  >
                    <div className="flex items-start justify-between">
                      {isNbaSlot ? (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1D428A] to-[#C8102E] border border-white/20 flex flex-col items-center justify-center shrink-0 shadow-md">
                          <span className="text-[10px] font-black tracking-tighter text-white leading-none">
                            NBA
                          </span>
                          <span className="text-[8px] font-bold tracking-widest text-amber-300 leading-none mt-0.5">
                            LP
                          </span>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700/60 p-1.5 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          <img
                            src={getFaviconUrl(url)}
                            alt=""
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {/* Slot actions on hover/focus */}
                      <div
                        className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {index > 0 && (
                          <button
                            onClick={() => onMoveSlot(index, index - 1)}
                            className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
                            title="Move Left"
                          >
                            <MoveUp className="w-3 h-3 -rotate-90" />
                          </button>
                        )}
                        {index < slots.length - 1 && (
                          <button
                            onClick={() => onMoveSlot(index, index + 1)}
                            className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
                            title="Move Right"
                          >
                            <MoveDown className="w-3 h-3 -rotate-90" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedSlotForEdit(index)}
                          className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
                          title="Configure Slot"
                        >
                          <Settings2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="truncate">
                      <div className="font-semibold text-sm text-white truncate drop-shadow-sm flex items-center gap-1.5">
                        <span className="truncate">{title}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        {isNbaSlot ? 'nba.com · In-App Games' : host}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sponsors Section */}
          {!hideSponsors && (
            <div className="w-full max-w-2xl bg-neutral-900/80 border border-neutral-800 rounded-3xl p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                  <span className="font-bold text-sm text-white">Support AA Browser</span>
                </div>

                <div className="flex rounded-xl bg-neutral-800 p-1 border border-neutral-700/60">
                  <button
                    onClick={() => setActiveSponsorTab('bmc')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      activeSponsorTab === 'bmc'
                        ? 'bg-amber-400 text-black shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Buy Me a Coffee
                  </button>
                  <button
                    onClick={() => setActiveSponsorTab('github')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      activeSponsorTab === 'github'
                        ? 'bg-pink-600 text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    GitHub Sponsors
                  </button>
                </div>
              </div>

              {activeSponsorTab === 'bmc' ? (
                <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      If AA Browser made your parked breaks or road trip stops more enjoyable, treating me to a coffee helps keep development active and new updates rolling! ☕✨
                    </p>
                    <div className="mt-3">
                      <a
                        href={BUY_ME_A_COFFEE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFDD00] hover:bg-[#ffe633] text-black font-bold text-xs shadow-md bouncy-tap"
                      >
                        <Coffee className="w-4 h-4" />
                        <span>Buy Me a Coffee</span>
                      </a>
                    </div>
                  </div>

                  <div className="flex flex-col items-center bg-white p-2.5 rounded-2xl shadow-inner shrink-0">
                    <img
                      src="/app/src/main/assets/bmc-qr-code.png"
                      alt="Buy Me a Coffee QR"
                      className="w-20 h-20 object-contain"
                      onError={(e) => {
                        // Fallback QR code icon
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span className="text-[10px] text-neutral-800 font-semibold mt-1">
                      Scan on phone
                    </span>
                  </div>
                </div>
              ) : (
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      Special thanks to our open source sponsors and code contributors who keep this project independent and free for all automotive head units! 🚀
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <a
                        href="https://github.com/sponsors/kododake"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow bouncy-tap"
                      >
                        <Heart className="w-4 h-4 fill-white" />
                        <span>Sponsor on GitHub</span>
                      </a>
                      <a
                        href={GITHUB_REPO_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold border border-neutral-700 bouncy-tap"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>GitHub Repo</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center gap-3 pt-2">
            {hasResumePage && (
              <button
                onClick={onResumeLastPage}
                className="px-4 py-2 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-semibold flex items-center gap-2 border border-neutral-700/80 shadow bouncy-tap"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                <span>Resume Last Page</span>
              </button>
            )}

            <button
              onClick={() => setPhotoOnlyMode(true)}
              className="px-4 py-2 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold flex items-center gap-2 border border-neutral-700/80 shadow bouncy-tap"
            >
              <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>Photo Mode</span>
            </button>
          </div>
        </div>
      )}

      {/* Slot Picker Dialog */}
      {selectedSlotForEdit !== null && (
        <SlotPickerDialog
          isOpen={true}
          slotIndex={selectedSlotForEdit}
          currentUrl={slots[selectedSlotForEdit]}
          bookmarks={bookmarks}
          onSelectUrl={(url) => {
            onUpdateSlot(selectedSlotForEdit, url);
            setSelectedSlotForEdit(null);
          }}
          onClearSlot={() => {
            onUpdateSlot(selectedSlotForEdit, null);
            setSelectedSlotForEdit(null);
          }}
          onClose={() => setSelectedSlotForEdit(null)}
        />
      )}
    </div>
  );
};
