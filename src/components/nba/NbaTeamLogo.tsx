import React, { useState } from 'react';
import { getNbaTeamLogoUrl } from '../../services/nbaService';

interface NbaTeamLogoProps {
  teamId: number;
  tricode: string;
  primaryColor: string;
  size?: 'sm' | 'md' | 'lg';
}

export const NbaTeamLogo: React.FC<NbaTeamLogoProps> = ({
  teamId,
  tricode,
  primaryColor,
  size = 'md',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const dimensions = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-xs',
    lg: 'w-16 h-16 text-base',
  }[size];

  if (imgFailed) {
    return (
      <div
        className={`${dimensions} rounded-full flex items-center justify-center font-extrabold text-white tracking-tight shrink-0 border border-white/15`}
        style={{ backgroundColor: primaryColor }}
      >
        {tricode}
      </div>
    );
  }

  return (
    <div
      className={`${dimensions} rounded-full bg-neutral-900/80 border border-neutral-800 flex items-center justify-center p-1 shrink-0 overflow-hidden`}
    >
      <img
        src={getNbaTeamLogoUrl(teamId)}
        alt={`${tricode} logo`}
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain"
        onError={() => setImgFailed(true)}
      />
    </div>
  );
};
