import React, { useState, useEffect } from 'react';
import { ExpressiveModal } from '../common/ExpressiveModal';
import { RefreshCw, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { GITHUB_REPO_URL } from '../../utils/urlFormatter';

interface VersionCheckSheetProps {
  isOpen: boolean;
  installedVersion: string;
  onClose: () => void;
}

export const VersionCheckSheet: React.FC<VersionCheckSheetProps> = ({
  isOpen,
  installedVersion,
  onClose,
}) => {
  const [isChecking, setIsChecking] = useState(true);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releaseUrl, setReleaseUrl] = useState<string>(
    `${GITHUB_REPO_URL}/releases/latest`
  );
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsChecking(true);
      setHasError(false);

      fetch('https://api.github.com/repos/kododake/AABrowser/releases/latest')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch release');
          return res.json();
        })
        .then((data) => {
          const tag = data.tag_name || 'v3.3';
          setLatestVersion(tag.replace(/^v/, ''));
          if (data.html_url) setReleaseUrl(data.html_url);
          setIsChecking(false);
        })
        .catch(() => {
          // Fallback gracefully to current known release
          setLatestVersion('3.3');
          setIsChecking(false);
        });
    }
  }, [isOpen]);

  const isUpToDate =
    latestVersion !== null &&
    latestVersion.trim().toLowerCase() === installedVersion.trim().toLowerCase();

  return (
    <ExpressiveModal isOpen={isOpen} onClose={onClose} maxHeight="max-h-[80vh]">
      <div className="flex flex-col items-center gap-4 pb-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
          <RefreshCw className={`w-6 h-6 ${isChecking ? 'animate-spin' : ''}`} />
        </div>

        <div>
          <h3 className="text-xl font-bold text-white">Check for Updates</h3>
          <p className="text-xs text-neutral-400 mt-1">
            See if a newer version of AA Browser is available for your car.
          </p>
        </div>

        {/* Status Card */}
        <div className="w-full max-w-md bg-neutral-800/80 border border-neutral-700/80 rounded-3xl p-6 shadow-xl text-left">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-700/60">
            <span className="text-xs text-neutral-400 font-medium">Installed Version</span>
            <span className="text-sm font-bold text-white px-2.5 py-0.5 rounded-full bg-neutral-700">
              v{installedVersion}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Latest Release</span>
            <span className="text-sm font-bold text-blue-400">
              {isChecking ? 'Checking...' : latestVersion ? `v${latestVersion}` : 'v3.3'}
            </span>
          </div>

          {/* Result state */}
          <div className="mt-6 pt-4 border-t border-neutral-700/60">
            {isChecking ? (
              <div className="flex items-center gap-3 text-neutral-400 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>Contacting GitHub API releases...</span>
              </div>
            ) : isUpToDate ? (
              <div className="flex items-center gap-3 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                <span>You are using the latest version of AA Browser!</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-amber-400 text-xs font-semibold">
                <AlertCircle className="w-5 h-5" />
                <span>New update available! (v{latestVersion})</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="w-full max-w-md mt-2 flex flex-col gap-2">
          {!isChecking && !isUpToDate && (
            <a
              href={releaseUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 bouncy-tap shadow"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View Latest Release on GitHub</span>
            </a>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs bouncy-tap"
          >
            Close
          </button>
        </div>
      </div>
    </ExpressiveModal>
  );
};
