import React, { useState } from 'react';
import {
  Download,
  CheckCircle,
  Monitor,
  Smartphone,
  Share2,
  X,
  Sparkles,
  WifiOff,
  UserCheck,
} from 'lucide-react';
import { downloadStandaloneGame } from '../services/standaloneGameDownload';
import { soundFx } from '../services/audioEngine';
import { haptics } from '../services/haptics';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface DownloadGameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadGameModal: React.FC<DownloadGameModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, install } = usePWAInstall();
  const [downloadCount, setDownloadCount] = useState(1);

  if (!isOpen) return null;

  const handleDownloadAgain = () => {
    soundFx.play('click');
    haptics.light();
    downloadStandaloneGame();
    setDownloadCount((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/70 rounded-2xl w-full max-w-md max-h-[90dvh] flex flex-col shadow-2xl text-left my-auto overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-md">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">Descargar Juego Autónomo</h3>
              <p className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                ¡Descargado en tu dispositivo!
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.play('click');
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs sm:text-sm text-slate-300">
          {/* Success Banner */}
          <div className="bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-transparent border border-amber-500/50 p-3 rounded-xl">
            <p className="font-extrabold text-amber-300 text-xs sm:text-sm flex items-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Archivo: Raton_Callejero_Juego_Completo.html</span>
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              El juego completo se ha descargado a tu carpeta de <strong>Descargas</strong>. Es un archivo autónomo que contiene gráficos, sonidos, física y récords.
            </p>
          </div>

          {/* Key Advantages */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300"><strong>100% Offline</strong>: No necesita internet.</span>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-slate-300"><strong>Sin Google</strong>: No pide ninguna cuenta.</span>
            </div>
          </div>

          {/* Guide 1: Computer */}
          <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800">
            <p className="font-bold text-white text-xs sm:text-sm flex items-center gap-2 mb-1.5">
              <Monitor className="w-4 h-4 text-sky-400" />
              <span>Cómo jugarlo en tu Computadora (PC / Mac):</span>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300 pl-1">
              <li>Ve a tu carpeta de <strong>Descargas</strong>.</li>
              <li>Haz doble clic en <strong>Raton_Callejero_Juego_Completo.html</strong>.</li>
              <li>Se abrirá al instante en Chrome, Edge, Safari o Firefox.</li>
              <li>¡Juega con la <strong>Barra Espaciadora</strong> o Flecha Arriba!</li>
            </ol>
          </div>

          {/* Guide 2: Mobile / Tablet */}
          <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800">
            <p className="font-bold text-white text-xs sm:text-sm flex items-center gap-2 mb-1.5">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>Cómo jugarlo en Celular o pasarlo a otro equipo:</span>
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300 pl-1">
              <li>Abre el archivo descargado desde la app <strong>Descargas</strong> o <strong>Archivos</strong> de tu teléfono.</li>
              <li>Puedes pasarlo por <strong>WhatsApp, Telegram, Bluetooth o USB</strong> a cualquier amigo o dispositivo y funcionará siempre.</li>
            </ul>

            {/* PWA Option if applicable */}
            {isInstallable && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-800">
                <button
                  onClick={async () => {
                    soundFx.play('click');
                    await install();
                    onClose();
                  }}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Instalar también como icono en la pantalla de inicio
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/90 flex gap-2 justify-between shrink-0">
          <button
            onClick={handleDownloadAgain}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar otra copia ({downloadCount})
          </button>
          <button
            onClick={() => {
              soundFx.play('click');
              onClose();
            }}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 px-5 rounded-xl text-xs active:scale-95 transition"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
