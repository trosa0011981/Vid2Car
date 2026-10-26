import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ExpressiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: string;
  showDragHandle?: boolean;
}

export const ExpressiveModal: React.FC<ExpressiveModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = 'max-h-[85vh]',
  showDragHandle = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Scrim backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Sheet Content Container */}
      <div
        className={`relative z-10 w-full max-w-3xl mx-auto bg-neutral-900 border-t border-neutral-800 rounded-t-[32px] shadow-2xl flex flex-col ${maxHeight} animate-slide-up overflow-hidden text-neutral-100`}
      >
        {/* Drag handle */}
        {showDragHandle && (
          <div
            className="w-full flex items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
            onClick={onClose}
          >
            <div className="w-12 h-1.5 rounded-full bg-neutral-600 hover:bg-neutral-500 transition-colors" />
          </div>
        )}

        {/* Optional Title Bar */}
        {(title || subtitle) && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800/80">
            <div>
              {title && <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>}
              {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors bouncy-tap"
              title="Close"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Scrollable sheet body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
};
