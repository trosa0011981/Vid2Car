import React from 'react';

interface WavyProgressBarProps {
  isLoading: boolean;
  progress?: number;
}

export const WavyProgressBar: React.FC<WavyProgressBarProps> = ({ isLoading, progress = 70 }) => {
  if (!isLoading) return null;

  return (
    <div className="relative w-full h-1 overflow-hidden bg-neutral-800/60 z-30">
      <div
        className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-sky-300 transition-all duration-300 relative"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute inset-0 bg-white/30 animate-pulse" />
      </div>
    </div>
  );
};
