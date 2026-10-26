import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { ExpressiveModal } from '../common/ExpressiveModal';
import { QrCode as QrIcon, Copy, ExternalLink, Check } from 'lucide-react';

interface QrShareSheetProps {
  isOpen: boolean;
  url: string;
  onClose: () => void;
}

export const QrShareSheet: React.FC<QrShareSheetProps> = ({ isOpen, url, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current && url) {
      QRCode.toCanvas(
        canvasRef.current,
        url,
        {
          width: 220,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error(error);
        }
      );
    }
  }, [isOpen, url]);

  const handleCopy = () => {
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <ExpressiveModal isOpen={isOpen} onClose={onClose} maxHeight="max-h-[85vh]">
      <div className="flex flex-col items-center gap-4 pb-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
          <QrIcon className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-xl font-bold text-white">Share via QR Code</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
            Scan from your phone to continue browsing on another device
          </p>
        </div>

        {/* QR Code Canvas Card */}
        <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-neutral-800">
          <canvas ref={canvasRef} className="rounded-xl" />
        </div>

        {/* URL Card */}
        <div className="w-full max-w-md bg-neutral-800/80 border border-neutral-700/80 rounded-2xl p-3.5 text-left">
          <div className="text-[11px] text-neutral-400 font-semibold mb-1">Target Address</div>
          <div className="text-xs text-blue-400 truncate select-all">{url || 'No active URL'}</div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full max-w-md">
          <button
            onClick={handleCopy}
            className="flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700 bouncy-tap shadow"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-neutral-300" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 bouncy-tap shadow"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open External</span>
          </a>
        </div>
      </div>
    </ExpressiveModal>
  );
};
