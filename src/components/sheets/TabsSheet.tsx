import React from 'react';
import { TabSessionEntry } from '../../types/browser';
import { ExpressiveModal } from '../common/ExpressiveModal';
import { Plus, X, Layers, MoveUp, MoveDown, Check } from 'lucide-react';
import { getFaviconUrl } from '../../utils/urlFormatter';

interface TabsSheetProps {
  isOpen: boolean;
  tabs: TabSessionEntry[];
  activeTabIndex: number;
  maxTabs?: number;
  onClose: () => void;
  onSelectTab: (index: number) => void;
  onCloseTab: (index: number) => void;
  onNewTab: () => void;
  onMoveTab: (fromIndex: number, toIndex: number) => void;
}

export const TabsSheet: React.FC<TabsSheetProps> = ({
  isOpen,
  tabs,
  activeTabIndex,
  maxTabs = 8,
  onClose,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onMoveTab,
}) => {
  return (
    <ExpressiveModal isOpen={isOpen} onClose={onClose} maxHeight="max-h-[88vh]">
      <div className="flex flex-col gap-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <h3 className="text-xl font-bold text-white">Tabs</h3>
              <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-xs font-semibold text-neutral-300">
                {tabs.length} / {maxTabs}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Switch between open tabs or close pages you no longer need.
            </p>
          </div>

          <button
            onClick={() => {
              if (tabs.length < maxTabs) {
                onNewTab();
                onClose();
              }
            }}
            disabled={tabs.length >= maxTabs}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 shadow bouncy-tap"
          >
            <Plus className="w-4 h-4" />
            <span>New Tab</span>
          </button>
        </div>

        {/* Tab Items List */}
        <div className="space-y-2">
          {tabs.map((tab, index) => {
            const isActive = index === activeTabIndex;
            return (
              <div
                key={tab.id || `tab-${index}`}
                onClick={() => {
                  onSelectTab(index);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 border cursor-pointer transition-all bouncy-tap ${
                  isActive
                    ? 'bg-blue-600/20 border-blue-500/70 text-white shadow-md'
                    : 'bg-neutral-800/60 hover:bg-neutral-800 border-neutral-700/50 text-neutral-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-neutral-700/60 flex items-center justify-center shrink-0 overflow-hidden">
                    {tab.url ? (
                      <img
                        src={getFaviconUrl(tab.url)}
                        alt=""
                        className="w-5 h-5 object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Layers className="w-4 h-4 text-blue-400" />
                    )}
                  </div>

                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate text-white">
                        {tab.title || (tab.url ? tab.url : 'Start Page')}
                      </span>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/30 text-blue-300 text-[10px] font-bold tracking-wide">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-400 truncate mt-0.5">
                      {tab.url || 'aabrowser://start'}
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center gap-1.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {index > 0 && (
                    <button
                      onClick={() => onMoveTab(index, index - 1)}
                      className="p-1.5 rounded-lg bg-neutral-700/60 hover:bg-neutral-600 text-neutral-300 hover:text-white"
                      title="Move up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {index < tabs.length - 1 && (
                    <button
                      onClick={() => onMoveTab(index, index + 1)}
                      className="p-1.5 rounded-lg bg-neutral-700/60 hover:bg-neutral-600 text-neutral-300 hover:text-white"
                      title="Move down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onCloseTab(index)}
                    className="p-1.5 rounded-lg bg-neutral-700/60 hover:bg-red-900/60 text-neutral-300 hover:text-red-300 transition-colors"
                    title="Close tab"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ExpressiveModal>
  );
};
