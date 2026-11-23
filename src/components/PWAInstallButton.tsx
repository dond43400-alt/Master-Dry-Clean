import React, { useState } from 'react';
import { Download, Smartphone, X, Share, PlusSquare, MoreVertical } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Automatically suppress when already running in standalone app mode
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="ਫੋਨ ਵਿੱਚ ਐਪ ਵਾਂਗ ਇੰਸਟਾਲ ਕਰੋ (Install App)"
        className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm shadow-sky-600/20 transition-all cursor-pointer active:scale-95"
      >
        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">ਫੋਨ ਐਪ ਇੰਸਟਾਲ ਕਰੋ</span>
        <span className="sm:hidden">Install App</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {isIOS ? 'iPhone / iPad ਵਿੱਚ ਇੰਸਟਾਲ ਕਰੋ' : 'Phone ਵਿੱਚ App ਵਾਂਗ ਇੰਸਟਾਲ ਕਰੋ'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Home Screen Icon & Full-Screen App
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs sm:text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>
                    Safari ਵਿੱਚ ਹੇਠਾਂ <Share className="w-4 h-4 inline text-sky-600 mx-0.5" />{' '}
                    <strong>Share</strong> ਬਟਨ ਦਬਾਓ।
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>
                    ਹੇਠਾਂ ਸਕ੍ਰੌਲ ਕਰਕੇ <PlusSquare className="w-4 h-4 inline text-sky-600 mx-0.5" />{' '}
                    <strong>Add to Home Screen</strong> 'ਤੇ ਟੈਪ ਕਰੋ।
                  </span>
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs sm:text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    ਆਪਣੇ ਫੋਨ ਦੇ Chrome ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਇਸ ਐਪ ਦਾ URL ਸਿੱਧਾ ਖੋਲ੍ਹੋ।
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    ਉੱਪਰ ਸੱਜੇ ਪਾਸੇ <MoreVertical className="w-3.5 h-3.5 inline text-slate-700" />{' '}
                    <strong>3-Dots Menu</strong> 'ਤੇ ਟੈਪ ਕਰਕੇ{' '}
                    <strong>"Add to Home screen" / "Install app"</strong> ਚੁਣੋ।
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  ਇੰਸਟਾਲ ਕਰਨ ਤੋਂ ਬਾਅਦ ਇਹ ਬਿਨਾਂ ਬ੍ਰਾਊਜ਼ਰ ਪੱਟੀ ਦੇ ਬਿਲਕੁਲ ਨਾਰਮਲ APK ਐਪ ਵਾਂਗ ਫੁੱਲ-ਸਕ੍ਰੀਨ ਚੱਲੇਗੀ।
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              ਠੀਕ ਹੈ (Got it)
            </button>
          </div>
        </div>
      )}
    </>
  );
};
