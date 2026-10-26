import React, { useState } from 'react';
import { BookmarkEntry } from '../../types/browser';
import { ExpressiveModal } from '../common/ExpressiveModal';
import {
  Star,
  Plus,
  Trash2,
  Edit2,
  Check,
  Pin,
  ExternalLink,
  Search,
  X,
} from 'lucide-react';
import { getFaviconUrl } from '../../utils/urlFormatter';

interface BookmarksSheetProps {
  isOpen: boolean;
  bookmarks: BookmarkEntry[];
  currentUrl: string;
  currentPageTitle: string;
  startPageSlots: (string | null)[];
  onClose: () => void;
  onSelectBookmark: (url: string) => void;
  onAddBookmark: (url: string, title: string) => void;
  onUpdateBookmarkTitle: (url: string, newTitle: string) => void;
  onDeleteBookmark: (url: string) => void;
  onPinToSlot: (url: string, slotIndex: number) => void;
}

export const BookmarksSheet: React.FC<BookmarksSheetProps> = ({
  isOpen,
  bookmarks,
  currentUrl,
  currentPageTitle,
  startPageSlots,
  onClose,
  onSelectBookmark,
  onAddBookmark,
  onUpdateBookmarkTitle,
  onDeleteBookmark,
  onPinToSlot,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [editingUrl, setEditingUrl] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');
  const [pinPickerUrl, setPinPickerUrl] = useState<string | null>(null);

  const isCurrentUrlBookmarked = bookmarks.some((b) => b.url === currentUrl);
  const canAddCurrent = Boolean(currentUrl && !isCurrentUrlBookmarked);

  const filteredBookmarks = bookmarks.filter(
    (b) =>
      b.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      b.url.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleStartEdit = (b: BookmarkEntry) => {
    setEditingUrl(b.url);
    setEditTitleInput(b.title);
  };

  const handleSaveEdit = (url: string) => {
    if (editTitleInput.trim()) {
      onUpdateBookmarkTitle(url, editTitleInput.trim());
    }
    setEditingUrl(null);
  };

  return (
    <ExpressiveModal isOpen={isOpen} onClose={onClose} maxHeight="max-h-[88vh]">
      <div className="flex flex-col gap-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <h3 className="text-xl font-bold text-white">Bookmarks</h3>
              <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-xs font-semibold text-neutral-300">
                {bookmarks.length}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Manage saved pages and pin shortcuts to your start page.
            </p>
          </div>

          {canAddCurrent && (
            <button
              onClick={() => {
                onAddBookmark(currentUrl, currentPageTitle || currentUrl);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5 shadow bouncy-tap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Current</span>
            </button>
          )}
        </div>

        {/* Filter Input */}
        {bookmarks.length > 4 && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter bookmarks..."
              className="w-full bg-neutral-800/80 text-white pl-10 pr-4 py-2 rounded-xl text-xs border border-neutral-700 focus:outline-none focus:border-amber-400"
            />
          </div>
        )}

        {/* Bookmarks list */}
        <div className="space-y-2">
          {filteredBookmarks.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-sm">
              No bookmarks found
            </div>
          ) : (
            filteredBookmarks.map((b) => {
              const slotIdx = startPageSlots.indexOf(b.url);
              const isPinned = slotIdx >= 0;
              const isEditing = editingUrl === b.url;

              return (
                <div
                  key={b.url}
                  onClick={() => {
                    if (!isEditing) {
                      onSelectBookmark(b.url);
                      onClose();
                    }
                  }}
                  className="p-3.5 rounded-2xl bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 flex items-center justify-between gap-3 cursor-pointer transition-colors bouncy-tap"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-neutral-700/60 flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src={getFaviconUrl(b.url)}
                        alt=""
                        className="w-5 h-5 object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    <div className="truncate flex-1">
                      {isEditing ? (
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editTitleInput}
                            onChange={(e) => setEditTitleInput(e.target.value)}
                            className="bg-neutral-900 border border-neutral-600 rounded-lg px-2.5 py-1 text-xs text-white flex-1 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(b.url)}
                            className="p-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate text-white">
                              {b.title}
                            </span>
                            {isPinned && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-bold tracking-wide">
                                Slot {slotIdx + 1}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-400 truncate mt-0.5">
                            {b.url}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Pin to Slot dropdown or quick toggle */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setPinPickerUrl(pinPickerUrl === b.url ? null : b.url)
                        }
                        className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                          isPinned
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-neutral-700/60 hover:bg-neutral-600 text-neutral-300'
                        }`}
                        title="Pin to Start Page Slot"
                      >
                        <Pin className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">
                          {isPinned ? `Slot ${slotIdx + 1}` : 'Pin'}
                        </span>
                      </button>

                      {/* Slot selector menu */}
                      {pinPickerUrl === b.url && (
                        <div className="absolute right-0 top-10 z-40 bg-neutral-900 border border-neutral-700 rounded-2xl p-2 shadow-2xl w-44 space-y-1">
                          <div className="text-[10px] uppercase font-bold text-neutral-400 px-2 py-1">
                            Assign to Slot
                          </div>
                          {[0, 1, 2, 3, 4, 5].map((slotNumber) => (
                            <button
                              key={slotNumber}
                              onClick={() => {
                                onPinToSlot(b.url, slotNumber);
                                setPinPickerUrl(null);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                                slotIdx === slotNumber
                                  ? 'bg-blue-600 text-white'
                                  : 'hover:bg-neutral-800 text-neutral-300'
                              }`}
                            >
                              <span>Slot {slotNumber + 1}</span>
                              {slotIdx === slotNumber && <Check className="w-3.5 h-3.5" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <button
                        onClick={() => handleStartEdit(b)}
                        className="p-2 rounded-xl bg-neutral-700/60 hover:bg-neutral-600 text-neutral-300 hover:text-white"
                        title="Edit title"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => onDeleteBookmark(b.url)}
                      className="p-2 rounded-xl bg-neutral-700/60 hover:bg-red-900/60 text-neutral-300 hover:text-red-300"
                      title="Delete bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </ExpressiveModal>
  );
};
