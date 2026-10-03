import React from 'react';
import { Achievement } from '../db/indexedDb';
import { Award, CheckCircle2, Lock, ArrowLeft } from 'lucide-react';

interface AchievementsViewProps {
  achievements: Achievement[];
  onBack: () => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({ achievements, onBack }) => {
  const unlockedCount = achievements.filter((a) => a.unlockedAt !== null).length;
  const progressPercent = Math.round((unlockedCount / (achievements.length || 1)) * 100);

  return (
    <div className="w-full max-w-md landscape:max-w-3xl mx-auto my-auto bg-slate-900/95 border-2 border-slate-700 p-3 sm:p-4 landscape:p-3 rounded-2xl shadow-2xl text-slate-100 flex flex-col max-h-[92dvh] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
          <h2 className="text-base sm:text-xl md:text-2xl font-black text-white">Logros Desbloqueables</h2>
        </div>
        <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
          {unlockedCount} / {achievements.length}
        </span>
      </div>

      {/* Progress Bar (Compact) */}
      <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-xl border border-slate-800 my-1.5 shrink-0">
        <div className="flex justify-between text-[11px] sm:text-xs font-semibold mb-1 text-slate-300">
          <span>Progreso General</span>
          <span className="text-amber-400">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Achievements List (2 columns in landscape mode) */}
      <div className="overflow-y-auto flex-1 pr-1 overscroll-contain my-1">
        <div className="grid grid-cols-1 landscape:grid-cols-2 gap-2">
          {achievements.map((ach) => {
            const isUnlocked = !!ach.unlockedAt;
            const currentProgress = Math.min(ach.progress, ach.maxProgress);
            const percent = Math.round((currentProgress / ach.maxProgress) * 100);

            return (
              <div
                key={ach.id}
                className={`p-2 sm:p-2.5 rounded-xl border transition ${
                  isUnlocked
                    ? 'bg-slate-950/90 border-amber-500/40 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800/80 opacity-75'
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-2.5">
                  <div
                    className={`text-xl sm:text-2xl p-1.5 sm:p-2 rounded-xl border shrink-0 ${
                      isUnlocked
                        ? 'bg-amber-500/20 border-amber-500/50'
                        : 'bg-slate-800/60 border-slate-700'
                    }`}
                  >
                    {ach.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="font-extrabold text-xs sm:text-sm text-white truncate">{ach.title}</h3>
                      {isUnlocked ? (
                        <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> Hecho
                        </span>
                      ) : (
                        <span className="text-[9px] sm:text-[10px] text-slate-400 flex items-center gap-0.5 shrink-0">
                          <Lock className="w-2.5 h-2.5" /> Bloqueado
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-snug line-clamp-2">
                      {ach.description}
                    </p>

                    {/* Progress info if not unlocked */}
                    {!isUnlocked && ach.maxProgress > 1 && (
                      <div className="mt-1.5">
                        <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                          <span>Progreso</span>
                          <span>
                            {currentProgress} / {ach.maxProgress}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Volver Button (Always visible) */}
      <div className="pt-2 border-t border-slate-800/80 shrink-0">
        <button
          onClick={onBack}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold py-2 px-4 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-1.5 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Menú</span>
        </button>
      </div>
    </div>
  );
};
