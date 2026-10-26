import React, { useEffect, useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { QuickActionButtonMode, QuickActionButtonPosition } from '../../types/browser';

interface FloatingActionButtonProps {
  mode: QuickActionButtonMode;
  position: QuickActionButtonPosition;
  alwaysVisible: boolean;
  isStartPage: boolean;
  isInFullscreen: boolean;
  onClick: () => void;
  lastInteractionTime: number;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  mode,
  position,
  alwaysVisible,
  isStartPage,
  isInFullscreen,
  onClick,
  lastInteractionTime,
}) => {
  const [visible, setVisible] = useState(true);

  // Auto-hide behavior after 3 seconds of inactivity on web pages
  useEffect(() => {
    if (alwaysVisible || isStartPage) {
      setVisible(true);
      return;
    }

    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [lastInteractionTime, alwaysVisible, isStartPage]);

  // Handle position classes
  const positionClasses = {
    bottom_left: 'bottom-6 left-6',
    bottom_right: 'bottom-6 right-6',
    top_left: 'top-16 left-6',
    top_right: 'top-16 right-6',
  }[position];

  return (
    <div
      className={`fixed ${positionClasses} z-40 transition-all duration-300 ease-out ${
        visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 pointer-events-none'
      }`}
    >
      <button
        onClick={onClick}
        className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-xl flex items-center justify-center bouncy-tap border-2 border-white/20 backdrop-blur-md focus:outline-none"
        title={mode === 'menu' ? 'Open browser menu' : 'Focus address bar'}
        aria-label={mode === 'menu' ? 'Open browser menu' : 'Focus address bar'}
      >
        {mode === 'menu' ? <Menu className="w-7 h-7" /> : <Search className="w-6 h-6" />}
      </button>
    </div>
  );
};
