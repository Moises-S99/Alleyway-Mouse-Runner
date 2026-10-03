import React, { useState } from 'react';
import { GameRecord } from '../db/indexedDb';
import { Trophy, Clock, Trash2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { soundFx } from '../services/audioEngine';
import { haptics } from '../services/haptics';

interface LeaderboardViewProps {
  records: GameRecord[];
  onBack: () => void;
  onClearRecords: () => Promise<void>;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ records, onBack, onClearRecords }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const top4 = records.slice(0, 4);
  const remaining = records.slice(4);

  const medals = ['🥇', '🥈', '🥉', '🏅'];
  const rankColors = [
    'border-amber-400/60 bg-gradient-to-r from-amber-500/20 to-slate-900',
    'border-slate-400/60 bg-gradient-to-r from-slate-400/20 to-slate-900',
    'border-amber-700/60 bg-gradient-to-r from-amber-700/20 to-slate-900',
    'border-slate-700 bg-slate-900/90',
  ];

  const handleConfirmClear = async () => {
    try {
      setIsDeleting(true);
      soundFx.play('hit');
      haptics.impact();
      await onClearRecords();
      setShowConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-md landscape:max-w-3xl mx-auto my-auto bg-slate-900/95 border-2 border-slate-700 p-3 sm:p-4 landscape:p-3 rounded-2xl shadow-2xl text-slate-100 flex flex-col max-h-[92dvh] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
          <h2 className="text-base sm:text-xl md:text-2xl font-black text-white">Mejores Récords</h2>
        </div>
        <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
          Top 4 Oficial
        </span>
      </div>

      {/* Confirmation Box to Delete Records */}
      {showConfirm && (
        <div className="bg-rose-950/90 border-2 border-rose-500/80 p-2.5 sm:p-3 rounded-xl space-y-1.5 text-center animate-shake my-1 shrink-0">
          <div className="flex items-center justify-center gap-1.5 text-rose-300 font-extrabold text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>¿Eliminar todos los récords?</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-300">
            Se borrarán permanentemente todos los puntajes guardados para empezar desde cero.
          </p>
          <div className="flex gap-2 pt-1 max-w-xs mx-auto">
            <button
              onClick={() => {
                soundFx.play('click');
                setShowConfirm(false);
              }}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-1 px-3 rounded-lg text-xs transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmClear}
              disabled={isDeleting}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-1 px-3 rounded-lg text-xs shadow-md transition flex items-center justify-center gap-1 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeleting ? 'Borrando...' : 'Sí, Eliminar'}
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Container for Top 4 and History */}
      <div className="overflow-y-auto flex-1 pr-1 overscroll-contain space-y-2 mt-2">
        {/* Top 4 Podium Grid (2 columns in landscape mode) */}
        <div className="grid grid-cols-1 landscape:grid-cols-2 gap-2">
          {top4.length === 0 ? (
            <div className="col-span-full p-4 text-center text-slate-400 text-xs sm:text-sm bg-slate-950/50 rounded-xl border border-slate-800">
              Aún no hay récords registrados. ¡Sé el primero en jugar!
            </div>
          ) : (
            top4.map((rec, index) => (
              <div
                key={rec.id || index}
                className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border ${rankColors[index] || 'border-slate-800 bg-slate-950'} shadow-md`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl sm:text-2xl shrink-0">{medals[index] || '🏅'}</span>
                  <div className="min-w-0">
                    <span className="font-extrabold text-xs sm:text-sm text-white block truncate">
                      {rec.playerName}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span>🧀 {rec.cheeses} quesos</span>
                      <span>•</span>
                      <span>⚡ {rec.obstaclesJumped} saltos</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <span className="text-sm sm:text-base font-black text-amber-400 block">
                    {rec.score} pts
                  </span>
                  <span className="text-[9px] text-slate-500">{rec.createdAt}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Additional Historical Records */}
        {remaining.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-800/60">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> Historial de otras partidas
            </p>
            <div className="grid grid-cols-1 landscape:grid-cols-2 gap-1.5 bg-slate-950/70 p-2 rounded-xl border border-slate-800 text-xs">
              {remaining.map((item, i) => (
                <div
                  key={item.id || i}
                  className="flex justify-between items-center py-1 px-2 rounded-lg bg-slate-900/60 text-slate-300"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-500 font-bold text-[10px]">#{i + 5}</span>
                    <span className="font-semibold text-slate-200 text-xs truncate">{item.playerName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-1">
                    <span className="text-slate-400 text-[10px]">🧀 {item.cheeses}</span>
                    <span className="font-bold text-amber-400 text-xs">{item.score} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Buttons: Eliminar Récords & Volver al Menú */}
      <div className="flex gap-2 mt-2 pt-2 border-t border-slate-800/80 shrink-0">
        {records.length > 0 && !showConfirm && (
          <button
            onClick={() => {
              soundFx.play('click');
              haptics.light();
              setShowConfirm(true);
            }}
            className="flex-1 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 hover:text-rose-200 border border-rose-800/60 font-bold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="truncate">Eliminar Récords</span>
          </button>
        )}

        <button
          onClick={onBack}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold py-2 px-3 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-1.5 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Menú</span>
        </button>
      </div>
    </div>
  );
};
