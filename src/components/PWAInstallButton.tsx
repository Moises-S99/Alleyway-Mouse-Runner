import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  CheckCircle,
  Copy,
  ExternalLink,
  X,
  Sparkles,
} from 'lucide-react';
import { soundFx } from '../services/audioEngine';
import { haptics } from '../services/haptics';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleInstallClick = async () => {
    soundFx.play('click');
    haptics.light();
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  const copyAppUrl = () => {
    soundFx.play('click');
    haptics.light();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const openPWABuilder = () => {
    soundFx.play('click');
    haptics.light();
    const currentUrl = encodeURIComponent(window.location.href);
    window.open(`https://www.pwabuilder.com?url=${currentUrl}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        title="Instalar App / Descargar APK"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm active:scale-95 ${
          isInstalled
            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black'
        }`}
      >
        {isInstalled ? (
          <>
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">APK Instalada</span>
            <span className="sm:hidden">Instalada</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5" />
            <span>Instalar APK</span>
          </>
        )}
      </button>

      {/* Fully Responsive & Scrollable Android / APK Installation Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-amber-500/70 rounded-2xl w-full max-w-md max-h-[88dvh] flex flex-col shadow-2xl text-left my-auto overflow-hidden">
            {/* Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">Instalar o Descargar APK</h3>
                  <p className="text-[11px] text-slate-400">Juego optimizado para Android 100% Offline</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                title="Cerrar ventana"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body (Guarantees no content is cut off on small phones) */}
            <div className="p-4 overflow-y-auto space-y-3.5 text-xs sm:text-sm text-slate-300">
              {/* Option 1: Direct Android WebAPK Installation */}
              <div className="bg-slate-950/90 p-3.5 rounded-xl border border-amber-500/40 shadow-inner">
                <p className="font-extrabold text-amber-400 text-xs sm:text-sm mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Método 1: Instalación Directa en Android</span>
                </p>
                <p className="text-slate-400 text-[11px] mb-2 leading-relaxed">
                  Android y Google Chrome compilan automáticamente este juego en un <strong>WebAPK nativo</strong> con icono en tu pantalla de inicio y cajón de apps, funcionando sin internet:
                </p>

                {isInstallable ? (
                  <button
                    onClick={async () => {
                      const res = await install();
                      if (res) setShowGuide(false);
                    }}
                    className="w-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition mb-2"
                  >
                    <Download className="w-4 h-4" />
                    INSTALAR EN ESTE DISPOSITIVO AHORA
                  </button>
                ) : (
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1 text-[11px] text-slate-300">
                    <p className="font-bold text-slate-200">📱 Si no sale el botón automático en tu navegador:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
                      <li>Toca los tres puntos (<strong>⋮</strong>) arriba a la derecha en Chrome.</li>
                      <li>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.</li>
                      <li>¡Listo! Tu teléfono lo instalará como app nativa completa.</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Option 2: Traditional .APK package generation */}
              <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800">
                <p className="font-extrabold text-sky-400 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Método 2: Descargar Archivo (.APK)</span>
                </p>
                <p className="text-slate-400 text-[11px] mb-2 leading-relaxed">
                  Para obtener un archivo instalador <strong>.apk</strong> o <strong>.aab</strong> tradicional para compartir o subir a tiendas:
                </p>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={openPWABuilder}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir PWABuilder (Generador Oficial de APK)
                  </button>

                  <button
                    onClick={copyAppUrl}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    {copied ? '¡Enlace de la app copiado!' : 'Copiar enlace de esta App'}
                  </button>
                </div>
              </div>

              {/* iOS instructions if opened on iPhone/iPad */}
              {isIOS && (
                <div className="bg-purple-950/50 p-3 rounded-xl border border-purple-800/60 text-xs">
                  <p className="font-bold text-purple-300 mb-1">🍎 En iPhone / iPad (Safari):</p>
                  <p className="text-[11px] text-slate-300">
                    Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba) y selecciona <strong>"Añadir a la pantalla de inicio"</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/90 flex justify-end shrink-0">
              <button
                onClick={() => setShowGuide(false)}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-5 rounded-xl text-xs transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
