import React from 'react';
import { AppSettings, localDB } from '../db/indexedDb';
import { Volume2, VolumeX, Smartphone, Sliders, Maximize, X, Download } from 'lucide-react';
import { soundFx } from '../services/audioEngine';
import { haptics } from '../services/haptics';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsUpdate: (newSettings: AppSettings) => void;
  onOpenDbManager?: () => void;
  onDownloadGame?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsUpdate,
  onOpenDbManager,
  onDownloadGame,
}) => {
  if (!isOpen) return null;

  const handleToggleSound = async () => {
    const updated = { ...settings, soundEnabled: !settings.soundEnabled };
    soundFx.enabled = updated.soundEnabled;
    if (updated.soundEnabled) soundFx.play('click');
    haptics.light();
    onSettingsUpdate(updated);
    await localDB.saveSettings(updated);
  };

  const handleToggleHaptics = async () => {
    const updated = { ...settings, hapticsEnabled: !settings.hapticsEnabled };
    haptics.enabled = updated.hapticsEnabled;
    if (updated.hapticsEnabled) haptics.jump();
    soundFx.play('click');
    onSettingsUpdate(updated);
    await localDB.saveSettings(updated);
  };

  const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    const updated = { ...settings, sfxVolume: vol };
    soundFx.volume = vol;
    onSettingsUpdate(updated);
    await localDB.saveSettings(updated);
  };

  const handleDifficultyChange = async (diff: 'facil' | 'normal' | 'dificil') => {
    soundFx.play('click');
    haptics.light();
    const updated = { ...settings, difficulty: diff };
    onSettingsUpdate(updated);
    await localDB.saveSettings(updated);
  };

  const toggleFullscreen = () => {
    soundFx.play('click');
    haptics.light();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl w-full max-w-md p-5 md:p-6 shadow-2xl text-slate-100 my-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg md:text-xl font-black text-white">Configuración del Juego</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs md:text-sm">
          {/* Sound FX Toggle & Volume */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-2 text-slate-200">
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                )}
                Efectos de Sonido FX
              </span>
              <button
                onClick={handleToggleSound}
                className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                  settings.soundEnabled
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {settings.soundEnabled ? 'ACTIVO' : 'MUDO'}
              </button>
            </div>

            {settings.soundEnabled && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Volumen FX</span>
                  <span>{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={handleVolumeChange}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
              </div>
            )}
          </div>

          {/* Haptic Vibration */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold flex items-center gap-2 text-slate-200">
                <Smartphone className="w-4 h-4 text-sky-400" />
                Vibración Háptica (Celular)
              </span>
              <span className="text-[11px] text-slate-400 block">
                Respuesta física táctil al saltar y recoger quesos
              </span>
            </div>
            <button
              onClick={handleToggleHaptics}
              className={`px-3 py-1 rounded-lg text-xs font-black transition shrink-0 ml-2 ${
                settings.hapticsEnabled
                  ? 'bg-sky-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {settings.hapticsEnabled ? 'ACTIVO' : 'OFF'}
            </button>
          </div>

          {/* Difficulty Preset */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
            <span className="font-bold block text-slate-200 mb-2">Dificultad de la Partida</span>
            <div className="grid grid-cols-3 gap-2">
              {(['facil', 'normal', 'dificil'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => handleDifficultyChange(diff)}
                  className={`py-2 px-1 text-xs font-extrabold rounded-lg capitalize border transition ${
                    settings.difficulty === diff
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Fullscreen Mode Button */}
          <button
            onClick={toggleFullscreen}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs transition"
          >
            <Maximize className="w-4 h-4 text-amber-400" />
            Alternar Pantalla Completa (Inmersivo)
          </button>

          {onDownloadGame && (
            <button
              onClick={() => {
                onClose();
                onDownloadGame();
              }}
              className="w-full flex items-center justify-center gap-2 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-600/60 text-emerald-300 hover:text-emerald-200 font-bold py-2.5 px-4 rounded-xl text-xs transition"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Descargar Copia del Juego (.html Autónomo Offline)
            </button>
          )}

          {onOpenDbManager && (
            <button
              onClick={() => {
                onClose();
                onOpenDbManager();
              }}
              className="w-full flex items-center justify-center gap-2 bg-slate-950/60 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 font-medium py-2 px-3 rounded-xl text-xs transition"
            >
              <span>💾</span> Exportar / Restaurar Copia de Respaldo (.JSON)
            </button>
          )}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-2.5 rounded-xl text-sm transition shadow-md active:scale-95"
          >
            Guardar y Volver
          </button>
        </div>
      </div>
    </div>
  );
};
