import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { extractHost } from '../../utils/urlFormatter';

interface InsecureHttpDialogProps {
  isOpen: boolean;
  url: string;
  onAllowOnce: () => void;
  onAllowHost: (host: string) => void;
  onCancel: () => void;
}

export const InsecureHttpDialog: React.FC<InsecureHttpDialogProps> = ({
  isOpen,
  url,
  onAllowOnce,
  onAllowHost,
  onCancel,
}) => {
  if (!isOpen) return null;

  const host = extractHost(url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-300">Insecure Connection</h3>
            <p className="text-xs text-neutral-400">Security Warning</p>
          </div>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed">
          You are about to open an HTTP (insecure) site: <strong className="text-white break-all">{url}</strong>.
          This connection does not use TLS encryption and may expose data to network attackers.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => onAllowHost(host)}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 bouncy-tap"
          >
            Always allow for this host ({host})
          </button>

          <button
            onClick={onAllowOnce}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold bouncy-tap"
          >
            Allow once
          </button>

          <button
            onClick={onCancel}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold bouncy-tap shadow"
          >
            Go back to safety (recommended)
          </button>
        </div>
      </div>
    </div>
  );
};
