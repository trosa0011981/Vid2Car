import React, { useState } from 'react';
import { BookmarkEntry } from '../../types/browser';
import { formatNavigableUrl, displayTitleForUrl, getFaviconUrl } from '../../utils/urlFormatter';
import { Star, Trash2, Check, Globe } from 'lucide-react';

interface SlotPickerDialogProps {
  isOpen: boolean;
  slotIndex: number;
  currentUrl: string | null;
  bookmarks: BookmarkEntry[];
  onSelectUrl: (url: string) => void;
  onClearSlot: () => void;
  onClose: () => void;
}

export const SlotPickerDialog: React.FC<SlotPickerDialogProps> = ({
  isOpen,
  slotIndex,
  currentUrl,
  bookmarks,
  onSelectUrl,
  onClearSlot,
  onClose,
}) => {
  const [customUrl, setCustomUrl] = useState('');

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      onSelectUrl(formatNavigableUrl(customUrl));
      setCustomUrl('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-white">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h3 className="text-xl font-bold">Configure Slot {slotIndex + 1}</h3>
            <p className="text-xs text-neutral-400 mt-1">
              Select a saved bookmark or enter a custom address
            </p>
          </div>
          {currentUrl && (
            <button
              onClick={() => {
                onClearSlot();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-400 text-xs font-semibold flex items-center gap-1.5 border border-red-800/50 bouncy-tap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Custom URL Input */}
        <form onSubmit={handleCustomSubmit} className="mt-4 flex gap-2">
          <input
            type="text"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 placeholder:text-neutral-500"
          />
          <button
            type="submit"
            disabled={!customUrl.trim()}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-sm bouncy-tap"
          >
            Assign
          </button>
        </form>

        {/* Bookmarks List */}
        <div className="mt-5">
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Saved Bookmarks
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {bookmarks.length === 0 ? (
              <div className="text-sm text-neutral-500 py-4 text-center">No bookmarks found</div>
            ) : (
              bookmarks.map((b) => {
                const isSelected = currentUrl === b.url;
                return (
                  <button
                    key={b.url}
                    onClick={() => {
                      onSelectUrl(b.url);
                      onClose();
                    }}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between gap-3 text-left transition-colors bouncy-tap border ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500/60 text-blue-200'
                        : 'bg-neutral-800/70 hover:bg-neutral-800 border-neutral-700/50 text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-neutral-700/60 flex items-center justify-center shrink-0 overflow-hidden">
                        <img
                          src={getFaviconUrl(b.url)}
                          alt=""
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-sm truncate">{b.title}</div>
                        <div className="text-xs text-neutral-400 truncate">{b.url}</div>
                      </div>
                    </div>

                    {isSelected && <Check className="w-5 h-5 text-blue-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-sm bouncy-tap"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
