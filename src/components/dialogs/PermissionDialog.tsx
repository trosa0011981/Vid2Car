import React from 'react';
import { Mic, MapPin, Shield } from 'lucide-react';
import { extractHost } from '../../utils/urlFormatter';

export type PermissionType = 'microphone' | 'location';

interface PermissionDialogProps {
  isOpen: boolean;
  type: PermissionType;
  url: string;
  onAllowOnce: () => void;
  onAllowHost: (host: string) => void;
  onDeny: () => void;
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({
  isOpen,
  type,
  url,
  onAllowOnce,
  onAllowHost,
  onDeny,
}) => {
  if (!isOpen) return null;

  const host = extractHost(url);
  const isMic = type === 'microphone';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onDeny} />

      <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-blue-600/20 text-blue-400">
            {isMic ? <Mic className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {isMic ? 'Microphone Access Request' : 'Location Access Request'}
            </h3>
            <p className="text-xs text-neutral-400">Site Permission</p>
          </div>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed mb-2">
          This site wants to {isMic ? 'use your microphone for voice audio' : 'access your geographic position'}:
        </p>
        <div className="p-2.5 rounded-xl bg-neutral-800 text-xs text-blue-400 font-mono mb-4 break-all">
          {host}
        </div>

        <div className="text-[11px] text-neutral-400 space-y-1 mb-6">
          <div>&bull; {isMic ? 'Audio will only be captured when active' : 'Precise coordinates may be shared'}</div>
          <div>&bull; Allow once grants permission only during this visit</div>
          <div>&bull; Always allow saves authorization for {host}</div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onAllowHost(host)}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold bouncy-tap shadow"
          >
            Always allow for this host
          </button>

          <button
            onClick={onAllowOnce}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold bouncy-tap"
          >
            Allow once
          </button>

          <button
            onClick={onDeny}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-xs font-semibold bouncy-tap"
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  );
};
