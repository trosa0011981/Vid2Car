import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Volume2, Car, Maximize, Smartphone } from 'lucide-react';

interface CarFrameToolbarProps {
  isCarBezelMode: boolean;
  onToggleCarBezel: () => void;
  scalePercent: number;
}

export const CarFrameToolbar: React.FC<CarFrameToolbarProps> = ({
  isCarBezelMode,
  onToggleCarBezel,
  scalePercent,
}) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="w-full bg-neutral-950/90 border-b border-neutral-800/80 px-4 py-1.5 flex items-center justify-between text-xs text-neutral-400 select-none z-30">
      {/* Left: Car connection status & Parked badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-blue-400 font-bold tracking-wider">
          <Car className="w-4 h-4" />
          <span className="hidden sm:inline">ANDROID AUTO</span>
        </div>
        <div className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px] flex items-center gap-1 border border-amber-500/30">
          <span>🅿️</span>
          <span>PARKED MODE</span>
        </div>
        {scalePercent !== 100 && (
          <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 text-[10px]">
            Scale: {scalePercent}%
          </span>
        )}
      </div>

      {/* Middle: Automotive Clock */}
      <div className="font-semibold text-white tracking-wide">{timeString}</div>

      {/* Right: Indicators & View mode toggle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-neutral-400">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <Volume2 className="w-3.5 h-3.5" />
          <Battery className="w-4 h-4 text-emerald-400" />
        </div>

        <button
          onClick={onToggleCarBezel}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors border bouncy-tap ${
            isCarBezelMode
              ? 'bg-blue-600/30 text-blue-300 border-blue-500/40'
              : 'bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700'
          }`}
          title={isCarBezelMode ? 'Switch to Full Browser View' : 'Simulate Car Dashboard Head Unit Screen'}
        >
          {isCarBezelMode ? <Maximize className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
          <span className="hidden sm:inline">{isCarBezelMode ? 'Fit Window' : 'Dash Screen'}</span>
        </button>
      </div>
    </div>
  );
};
