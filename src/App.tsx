/**
 * Alleyway Mouse Runner Mobile
 * Endless Runner optimized for Android devices with robust local IndexedDB database and 100% offline support.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { DatabaseModal } from './components/DatabaseModal';
import { LeaderboardView } from './components/LeaderboardView';
import { AchievementsView } from './components/AchievementsView';
import { SettingsModal } from './components/SettingsModal';
import { DownloadGameModal } from './components/DownloadGameModal';
import { downloadStandaloneGame } from './services/standaloneGameDownload';
import { getCustomIcon, DEFAULT_APP_ICON } from './services/customIconManager';
import {
  localDB,
  GameRecord,
  AppSettings,
  Achievement,
  PlayerProfile,
} from './db/indexedDb';
import { soundFx } from './services/audioEngine';
import { haptics } from './services/haptics';
import {
  Play,
  Trophy,
  Award,
  Settings,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowUp,
  Check,
  AlertCircle,
  Home,
  Download,
  Maximize,
  LogOut,
} from 'lucide-react';

enum AppView {
  MENU = 'menu',
  INSTRUCTIONS = 'instructions',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAMEOVER = 'gameover',
  RECORDS = 'records',
  ACHIEVEMENTS = 'achievements',
}

// Check if running inside the downloaded standalone offline file
const isStandaloneGame = typeof window !== 'undefined' && (
  window.location.protocol === 'file:' ||
  Boolean((window as unknown as { __IS_STANDALONE_BUNDLE__?: boolean }).__IS_STANDALONE_BUNDLE__)
);

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.MENU);
  const [score, setScore] = useState(0);
  const [finalRunStats, setFinalRunStats] = useState<{
    score: number;
    cheeses: number;
    obstacles: number;
    duration: number;
  }>({ score: 0, cheeses: 0, obstacles: 0, duration: 0 });

  // Database State
  const [topRecords, setTopRecords] = useState<GameRecord[]>([]);
  const [allRecords, setAllRecords] = useState<GameRecord[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    soundEnabled: true,
    hapticsEnabled: true,
    sfxVolume: 0.8,
    showTouchIndicator: true,
    difficulty: 'normal',
  });

  // UI Modals
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // In standalone file it's already downloaded. On web, it starts visible so user can download it once.
  const [isGameDownloaded, setIsGameDownloaded] = useState<boolean>(() => isStandaloneGame);

  const [customIcon, setCustomIcon] = useState<string>(getCustomIcon);
  const [hasEnteredGame, setHasEnteredGame] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const isTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
      return !isTouch;
    }
    return true;
  });

  // Jairo Sifontes Easter egg counter
  const [creatorTapCount, setCreatorTapCount] = useState(0);

  const handleTitleEasterEgg = () => {
    const next = creatorTapCount + 1;
    setCreatorTapCount(next);
    if (next >= 3) {
      soundFx.play('achievement');
      haptics.achievement();
      triggerBanner('⭐ Creado por Jairo Sifontes 🐭🧀');
      setCreatorTapCount(0);
    } else {
      soundFx.play('click');
      haptics.light();
    }
  };

  const enterNativeExperience = async () => {
    soundFx.play('click');
    haptics.light();
    setHasEnteredGame(true);
    await requestLandscapeFullscreen();
  };

  const handleExitGame = async () => {
    soundFx.play('click');
    haptics.light();

    // 1. Exit fullscreen mode if active
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {}
    }

    // 2. Unlock orientation if locked
    try {
      // @ts-ignore
      if (screen.orientation && screen.orientation.unlock) {
        // @ts-ignore
        screen.orientation.unlock();
      }
    } catch {}

    // 3. Return to launcher/closed state
    setHasEnteredGame(false);
    setCurrentView(AppView.MENU);

    // 4. Try window.close() (works in popups or standalone PWAs)
    try {
      window.close();
    } catch {}
  };

  // Panoramic Orientation Detection
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight > window.innerWidth;
    }
    return false;
  });

  useEffect(() => {
    const handleResizeOrOrient = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResizeOrOrient);
    window.addEventListener('orientationchange', handleResizeOrOrient);
    return () => {
      window.removeEventListener('resize', handleResizeOrOrient);
      window.removeEventListener('orientationchange', handleResizeOrOrient);
    };
  }, []);

  const requestLandscapeFullscreen = async () => {
    try {
      const docEl = document.documentElement as any;
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      }
      if (screen.orientation && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch (err) {
      console.warn('Fullscreen/landscape lock failed:', err);
    }
  };

  const handleDownloadGame = () => {
    soundFx.play('achievement');
    haptics.achievement();
    downloadStandaloneGame();
    // Once downloaded, disappear for this session
    setIsGameDownloaded(true);
    setIsDownloadModalOpen(true);
  };

  const handleClearRecords = async () => {
    await localDB.clearAllRecords();
    const prof = await localDB.getProfile();
    if (prof) {
      await localDB.saveProfile({ ...prof, bestScore: 0 });
    }
    await refreshDatabase();
  };

  // Game Over form
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [isRecordSaved, setIsRecordSaved] = useState(false);
  const [inputError, setInputError] = useState(false);

  // Achievement unlock banner
  const [unlockedBanner, setUnlockedBanner] = useState<string | null>(null);

  // Load Database data
  const refreshDatabase = useCallback(async () => {
    try {
      const top = await localDB.getTopRecords(4);
      setTopRecords(top);

      const all = await localDB.getAllRecords();
      setAllRecords(all);

      const achs = await localDB.getAchievements();
      setAchievements(achs);

      const prof = await localDB.getProfile();
      setProfile(prof);

      const sets = await localDB.getSettings();
      setSettings(sets);
      soundFx.enabled = sets.soundEnabled;
      soundFx.volume = sets.sfxVolume;
      haptics.enabled = sets.hapticsEnabled;
    } catch (err) {
      console.error('Error refreshing local DB:', err);
    }
  }, []);

  useEffect(() => {
    refreshDatabase();
  }, [refreshDatabase]);

  // One-time initial profile check: if user already has a custom name, remember it
  useEffect(() => {
    localDB.getProfile().then((prof) => {
      if (prof?.name && prof.name !== 'SuperRata') {
        setPlayerNameInput(prof.name);
      }
    });
  }, []);

  // Handle mobile visibility changes (auto-pause if minimized/backgrounded)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && currentView === AppView.PLAYING) {
        setCurrentView(AppView.PAUSED);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [currentView]);

  // Check if score qualifies for Top 4
  const qualifiesForTop4 = (checkScore: number) => {
    if (checkScore <= 0) return false;
    if (topRecords.length < 4) return true;
    return checkScore > topRecords[topRecords.length - 1].score;
  };

  const handleStartGame = () => {
    soundFx.play('click');
    haptics.light();
    requestLandscapeFullscreen();
    setScore(0);
    setIsRecordSaved(false);
    setInputError(false);
    setCurrentView(AppView.PLAYING);
  };

  const handlePauseToggle = () => {
    if (currentView === AppView.PLAYING) {
      soundFx.play('click');
      haptics.light();
      setCurrentView(AppView.PAUSED);
    } else if (currentView === AppView.PAUSED) {
      soundFx.play('click');
      haptics.light();
      setCurrentView(AppView.PLAYING);
    }
  };

  const handleGameOver = async (stats: {
    score: number;
    cheeses: number;
    obstacles: number;
    duration: number;
  }) => {
    setFinalRunStats(stats);
    setCurrentView(AppView.GAMEOVER);
    setIsRecordSaved(false);
    setInputError(false);

    // Update Profile in local DB
    await localDB.recordGameRun({
      score: stats.score,
      cheeses: stats.cheeses,
      obstacles: stats.obstacles,
      jumps: stats.obstacles + 3,
    });

    // Check & update achievements
    await checkAchievements(stats);
    await refreshDatabase();
  };

  const checkAchievements = async (stats: {
    score: number;
    cheeses: number;
    obstacles: number;
    duration: number;
  }) => {
    const currentProf = await localDB.getProfile();

    // 1. Primer salto
    const ach1 = await localDB.updateAchievementProgress('first_jump', 1, true);
    if (ach1 && ach1.unlockedAt && ach1.progress === 1) triggerBanner('¡Logro: Primer Salto! 🦘');

    // 2. Colección de quesos (10, 50, 100, 150, 300)
    const ach2 = await localDB.updateAchievementProgress('cheese_lover_10', currentProf.totalCheeses, true);
    if (ach2 && ach2.unlockedAt && ach2.progress >= 10 && ach2.progress - stats.cheeses < 10) {
      triggerBanner('¡Logro: Amante del Queso (10)! 🧀');
    }

    const ach3 = await localDB.updateAchievementProgress('cheese_king_50', currentProf.totalCheeses, true);
    if (ach3 && ach3.unlockedAt && ach3.progress >= 50 && ach3.progress - stats.cheeses < 50) {
      triggerBanner('¡Logro: Rey de la Ratonera (50)! 👑');
    }

    const ach100 = await localDB.updateAchievementProgress('cheese_master_100', currentProf.totalCheeses, true);
    if (ach100 && ach100.unlockedAt && ach100.progress >= 100 && ach100.progress - stats.cheeses < 100) {
      triggerBanner('¡Logro: Gran Banquete (100 Quesos)! 🧀✨');
    }

    const ach150 = await localDB.updateAchievementProgress('cheese_master_150', currentProf.totalCheeses, true);
    if (ach150 && ach150.unlockedAt && ach150.progress >= 150 && ach150.progress - stats.cheeses < 150) {
      triggerBanner('¡Logro Épico: Cosechador Supremo (150 Quesos)! 🧀👑');
    }

    const ach300 = await localDB.updateAchievementProgress('cheese_legend_300', currentProf.totalCheeses, true);
    if (ach300 && ach300.unlockedAt && ach300.progress >= 300 && ach300.progress - stats.cheeses < 300) {
      triggerBanner('¡LOGRO LEGENDARIO: Señor del Queso Dorado (300 Quesos)! 👑🧀');
    }

    // 2.1 Festines en una sola partida (30 y 45)
    if (stats.cheeses >= 30) {
      const achFestin = await localDB.updateAchievementProgress('cheese_run_30', stats.cheeses, true);
      if (achFestin && achFestin.unlockedAt) triggerBanner('¡Logro Difícil: Festín Gourmet (30 quesos en 1 partida)! ✨');
    }

    if (stats.cheeses >= 45) {
      const achFrenzy = await localDB.updateAchievementProgress('cheese_frenzy_45', stats.cheeses, true);
      if (achFrenzy && achFrenzy.unlockedAt) triggerBanner('¡LOGRO COLOSAL: Atracón Legendario (45 quesos en 1 partida)! 🏆🧀');
    }

    // 3. Evasión de trampas (20, 60 y 150)
    const ach4 = await localDB.updateAchievementProgress('trap_dodger_20', stats.obstacles, false);
    if (ach4 && ach4.unlockedAt && ach4.progress >= 20) {
      triggerBanner('¡Logro: Ágil Evasor (20 trampas)! ⚡');
    }

    const achTrap60 = await localDB.updateAchievementProgress('trap_master_60', stats.obstacles, false);
    if (achTrap60 && achTrap60.unlockedAt && achTrap60.progress >= 60) {
      triggerBanner('¡Logro Épico: Reflejos de Relámpago (60 trampas)! 🛡️');
    }

    const achTrap150 = await localDB.updateAchievementProgress('trap_overlord_150', stats.obstacles, false);
    if (achTrap150 && achTrap150.unlockedAt && achTrap150.progress >= 150) {
      triggerBanner('¡LOGRO SUPREMO: Inalcanzable (150 Trampas Esquivadas)! ⚡🛡️');
    }

    // 3.1 Saltos en el callejón (40 y 100)
    const achAcrobat = await localDB.updateAchievementProgress('acrobat_40', currentProf.totalJumps, true);
    if (achAcrobat && achAcrobat.unlockedAt && achAcrobat.progress >= 40) {
      triggerBanner('¡Logro: Acróbata del Asfalto (40 Saltos)! 🦘⚡');
    }

    const achJumps100 = await localDB.updateAchievementProgress('jumps_master_100', currentProf.totalJumps, true);
    if (achJumps100 && achJumps100.unlockedAt && achJumps100.progress >= 100) {
      triggerBanner('¡Logro Épico: Maestro del Salto Callejero (100 Saltos)! 👟💨');
    }

    // 4. Puntuaciones altas en una sola partida (300, 500, 750 y 1,000)
    if (stats.score >= 300) {
      const ach6 = await localDB.updateAchievementProgress('master_300', stats.score, true);
      if (ach6 && ach6.unlockedAt) triggerBanner('¡Logro: Maestro Roedor (+300 pts)! 🔥');
    }

    if (stats.score >= 500) {
      const ach500 = await localDB.updateAchievementProgress('legend_500', stats.score, true);
      if (ach500 && ach500.unlockedAt) triggerBanner('¡LOGRO LEGENDARIO: Racha Legendaria (+500 pts)! 🌟');
    }

    if (stats.score >= 750) {
      const ach750 = await localDB.updateAchievementProgress('score_titan_750', stats.score, true);
      if (ach750 && ach750.unlockedAt) triggerBanner('¡LOGRO TITÁNICO: Titán del Callejón (+750 pts)! 💎');
    }

    if (stats.score >= 1000) {
      const ach1000 = await localDB.updateAchievementProgress('score_myth_1000', stats.score, true);
      if (ach1000 && ach1000.unlockedAt) triggerBanner('¡LOGRO MÍTICO SUPREMO: Mito del Callejón (+1,000 PTS)! 🌌👑');
    }

    // 5. Podio (#Top 4 y #1 Absoluto)
    if (qualifiesForTop4(stats.score)) {
      const ach5 = await localDB.updateAchievementProgress('top4_champion', 1, true);
      if (ach5 && ach5.unlockedAt) triggerBanner('¡Logro: Top 4 Callejero! 🏆');
    }

    const topRecs = await localDB.getTopRecords(1);
    if (topRecs.length === 0 || stats.score > topRecs[0].score) {
      const achPodium1 = await localDB.updateAchievementProgress('podium_first', 1, true);
      if (achPodium1 && achPodium1.unlockedAt) triggerBanner('¡LOGRO SUPREMO: Rey Absoluto del Callejón (#1)! 🥇');
    }

    // 6. Supervivencia de tiempo (60s y 90s)
    if (stats.duration >= 60) {
      const achSurv = await localDB.updateAchievementProgress('survivor_60', stats.duration, true);
      if (achSurv && achSurv.unlockedAt) triggerBanner('¡Logro de Resistencia: Superviviente (60s)! ⏱️');
    }

    if (stats.duration >= 90) {
      const achSurv90 = await localDB.updateAchievementProgress('survivor_90', stats.duration, true);
      if (achSurv90 && achSurv90.unlockedAt) triggerBanner('¡LOGRO HEROICO: Inmortal del Asfalto (90s continuos)! ⏳🔥');
    }

    // 7. Puntos acumulados totales (1,500 pts)
    const achTotal = await localDB.updateAchievementProgress('total_score_1500', currentProf.totalScore, true);
    if (achTotal && achTotal.unlockedAt && achTotal.progress >= 1500) {
      triggerBanner('¡Logro Épico: Leyenda Urbana (1,500 Pts Totales)! 🏅');
    }

    // 8. Total de partidas jugadas (20 y 30)
    const achVet = await localDB.updateAchievementProgress('veteran_20', currentProf.totalGames, true);
    if (achVet && achVet.unlockedAt && achVet.progress >= 20) {
      triggerBanner('¡Logro: Veterano del Asfalto (20 Partidas)! 🎖️');
    }

    const achVet30 = await localDB.updateAchievementProgress('games_veteran_30', currentProf.totalGames, true);
    if (achVet30 && achVet30.unlockedAt && achVet30.progress >= 30) {
      triggerBanner('¡Logro Épico: Guerrero Incansable (30 Partidas)! ⚔️🐭');
    }
  };

  const triggerBanner = (text: string) => {
    soundFx.play('achievement');
    haptics.achievement();
    setUnlockedBanner(text);
    setTimeout(() => setUnlockedBanner(null), 4000);
  };

  const handleSaveRecord = async () => {
    if (isRecordSaved) return;

    const trimmed = playerNameInput.trim();
    if (!trimmed) {
      soundFx.play('error');
      haptics.error();
      setInputError(true);
      return;
    }

    const clean = trimmed.substring(0, 14).replace(/[^a-zA-Z0-9 _-]/g, '') || 'Jugador';

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });

    await localDB.addRecord({
      playerName: clean,
      score: finalRunStats.score,
      cheeses: finalRunStats.cheeses,
      obstaclesJumped: finalRunStats.obstacles,
      durationSeconds: finalRunStats.duration,
      createdAt: dateFormatted,
      timestamp: Date.now(),
    });

    // Update active profile name
    if (profile) {
      await localDB.saveProfile({ ...profile, name: clean });
    }

    setIsRecordSaved(true);
    setInputError(false);
    soundFx.play('cheese');
    haptics.cheese();
    await refreshDatabase();
  };

  // Jump trigger for mobile on-screen jump button
  const triggerMobileJump = () => {
    window.dispatchEvent(new CustomEvent('alleyway_jump_action'));
  };

  return (
    <div className="flex flex-col h-dvh min-h-dvh max-h-dvh w-full bg-slate-950 text-slate-100 select-none overflow-x-hidden safe-left safe-right">
      {/* 🎮 NATIVE GAME TAP-TO-ENTER LAUNCHER FOR MOBILE & FULLSCREEN */}
      {!hasEnteredGame && (
        <div
          onClick={enterNativeExperience}
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-3 sm:p-4 text-center cursor-pointer select-none animate-fade-in overflow-y-auto"
        >
          <div className="w-full max-w-sm landscape:max-w-xl flex flex-col landscape:flex-row items-center justify-center landscape:gap-6 my-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 landscape:w-20 landscape:h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.5)] mb-3 landscape:mb-0 animate-bounce overflow-hidden border-2 border-amber-300 shrink-0">
              <img
                src={customIcon || DEFAULT_APP_ICON}
                alt="Icono del juego"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== DEFAULT_APP_ICON) {
                    target.src = DEFAULT_APP_ICON;
                  }
                }}
              />
            </div>

            <div className="flex flex-col items-center landscape:items-start text-center landscape:text-left gap-3">
              <h1 className="text-xl sm:text-3xl landscape:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-100 to-amber-400 tracking-wide leading-tight">
                ALLEYWAY MOUSE
              </h1>

              <button
                onClick={enterNativeExperience}
                className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black py-2.5 sm:py-3 px-6 sm:px-8 rounded-xl text-sm sm:text-base shadow-[0_0_25px_rgba(245,158,11,0.6)] flex items-center gap-2 active:scale-95 transition transform hover:scale-105"
              >
                <Maximize className="w-4 h-4 fill-current" />
                <span>TOCA PARA ENTRAR AL JUEGO</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Achievement Banner */}
      {unlockedBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-4 py-2.5 rounded-2xl shadow-2xl font-black text-xs md:text-sm animate-bounce border-2 border-amber-300">
          <Sparkles className="w-4 h-4" />
          <span>{unlockedBanner}</span>
        </div>
      )}

      {/* TOP ANDROID APP BAR */}
      <header
        className={`w-full max-w-4xl mx-auto px-3 py-2 sm:py-2.5 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md rounded-b-2xl shadow-sm shrink-0 safe-top z-20 ${
          currentView === AppView.PLAYING ? 'landscape:hidden' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundFx.play('click');
              setCurrentView(AppView.MENU);
            }}
            className="flex items-center gap-2 text-left"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-base sm:text-lg shadow-md shrink-0 overflow-hidden border border-amber-400/40">
              <img
                src={customIcon || DEFAULT_APP_ICON}
                alt="Icono"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== DEFAULT_APP_ICON) {
                    target.src = DEFAULT_APP_ICON;
                  }
                }}
              />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 leading-tight">
                MOUSE RUNNER
              </h1>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold block">
                Android Edition
              </span>
            </div>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!isGameDownloaded && (
            <button
              onClick={handleDownloadGame}
              title="Descargar Juego Autónomo (100% Offline para PC o Celular)"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-md active:scale-95 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Descargar Juego</span>
              <span className="sm:hidden">Descargar</span>
            </button>
          )}

          <button
            onClick={() => {
              soundFx.play('click');
              haptics.light();
              setIsSettingsModalOpen(true);
            }}
            title="Ajustes del Juego"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={handleExitGame}
            title="Salir del Juego (Cerrar Pantalla Completa)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/70 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-700/60 active:scale-95 transition"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-xs font-bold text-rose-300">Salir</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main
        className={`flex-1 w-full max-w-4xl mx-auto min-h-0 flex flex-col items-center ${
          currentView === AppView.PLAYING || currentView === AppView.PAUSED
            ? 'p-1.5 sm:p-2 landscape:p-1 justify-between overflow-hidden'
            : 'p-2 sm:p-4 justify-start sm:justify-center overflow-y-auto overscroll-contain'
        }`}
      >
        {/* VIEW 1: GAME RUNNER CANVAS (When Playing or Paused) */}
        {(currentView === AppView.PLAYING || currentView === AppView.PAUSED) && (
          <div className="w-full h-full flex flex-col justify-between items-center min-h-0 gap-1 sm:gap-2">
            {/* IN-GAME HUD */}
            <div className="w-full flex items-center justify-between px-2 shrink-0">
              <div className="bg-slate-900/90 border border-amber-500/40 px-3 py-1 sm:py-1.5 rounded-xl shadow-lg flex items-center gap-2">
                <span className="text-amber-400 font-extrabold text-xs sm:text-sm">PUNTOS:</span>
                <span className="text-white font-black text-base sm:text-xl">{score}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePauseToggle}
                  className="bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-amber-400 p-2 rounded-xl shadow-md active:scale-95 flex items-center justify-center"
                  title="Pausa"
                >
                  <Pause className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Helper Banner in Portrait Mode */}
            {isPortrait && (
              <div className="w-full bg-gradient-to-r from-amber-500/20 via-sky-500/20 to-amber-500/20 border border-amber-500/40 px-2.5 py-1.5 rounded-xl flex items-center justify-between text-[11px] text-amber-300 animate-pulse shrink-0">
                <span className="flex items-center gap-1.5 font-bold truncate">
                  <span>🔄</span> Gira tu teléfono a horizontal para ver el ratón más grande
                </span>
                <button
                  onClick={requestLandscapeFullscreen}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[10px] whitespace-nowrap active:scale-95 transition ml-2 shrink-0 shadow"
                >
                  Girar Ahora
                </button>
              </div>
            )}

            {/* CANVAS FLEX CONTAINER */}
            <div className="flex-1 min-h-0 w-full flex items-center justify-center relative">
              <GameCanvas
                isPlaying={currentView === AppView.PLAYING || currentView === AppView.PAUSED}
                isPaused={currentView === AppView.PAUSED}
                onGameOver={handleGameOver}
                onScoreUpdate={setScore}
                onPauseToggle={handlePauseToggle}
                soundEnabled={settings.soundEnabled}
                hapticsEnabled={settings.hapticsEnabled}
                difficulty={settings.difficulty}
              />

              {/* PAUSE OVERLAY */}
              {currentView === AppView.PAUSED && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 sm:p-6 z-30">
                  <div className="bg-slate-900 border-2 border-amber-500/50 p-5 sm:p-6 rounded-2xl shadow-2xl text-center max-w-xs w-full max-h-[90%] overflow-y-auto">
                    <h2 className="text-xl sm:text-2xl font-black text-amber-400 mb-3 tracking-wider">PAUSA</h2>

                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 mb-4 text-xs text-slate-300">
                      <p>Puntos actuales: <strong className="text-amber-400 text-base">{score}</strong></p>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <button
                        onClick={handlePauseToggle}
                        className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black py-2.5 rounded-xl text-sm shadow-md active:scale-95"
                      >
                        REANUDAR
                      </button>

                      <button
                        onClick={() => {
                          const updated = { ...settings, soundEnabled: !settings.soundEnabled };
                          setSettings(updated);
                          soundFx.enabled = updated.soundEnabled;
                          localDB.saveSettings(updated);
                        }}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
                      >
                        {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
                        Sonido: {settings.soundEnabled ? 'ACTIVO' : 'MUTE'}
                      </button>

                      <button
                        onClick={() => setCurrentView(AppView.MENU)}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-xl text-xs"
                      >
                        Salir al Menú
                      </button>

                      <button
                        onClick={handleExitGame}
                        className="w-full bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
                        Salir del Juego
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* MOBILE JUMP TAP BAR (Super comfortable for one-thumb phone play!) */}
            <div className="w-full shrink-0 mt-0.5 sm:mt-1 flex justify-center safe-bottom landscape:hidden">
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  triggerMobileJump();
                }}
                className="w-full max-w-md bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 hover:from-slate-700 hover:to-slate-600 border-2 border-amber-500/40 active:border-amber-400 text-amber-300 active:text-amber-200 font-black py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm tracking-wide active:scale-[0.98] transition-transform"
              >
                <ArrowUp className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>TOCA AQUÍ O LA PANTALLA PARA SALTAR</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: MAIN MENU */}
        {currentView === AppView.MENU && (
          <div className="w-full max-w-md landscape:max-w-2xl mx-auto my-auto bg-slate-900/95 border-2 border-slate-700 p-3.5 sm:p-5 landscape:p-3.5 rounded-2xl shadow-2xl text-center text-slate-100 flex flex-col landscape:grid landscape:grid-cols-2 landscape:gap-3.5 gap-2.5 sm:gap-3 my-auto">
            {/* Left Column / Header block */}
            <div className="flex flex-col justify-between text-center landscape:text-left gap-2">
              <div>
                <h2
                  onClick={handleTitleEasterEgg}
                  className="text-2xl sm:text-3xl md:text-4xl landscape:text-xl landscape:sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 drop-shadow-md cursor-pointer select-none active:scale-95 transition leading-tight mt-1"
                  title="Toca para descubrir el secreto"
                >
                  ALLEYWAY MOUSE
                </h2>
                <p className="text-slate-400 font-medium text-[11px] sm:text-xs mt-0.5">
                  ¡Esquiva trampas y recoge quesos en el callejón!
                </p>
              </div>

              {/* Profile badge / quick stats */}
              {profile && (
                <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{profile.avatar || '🐭'}</span>
                    <div className="text-left">
                      <span className="font-bold text-slate-200 block text-xs">{profile.name}</span>
                      <span className="text-[10px] text-slate-400">Récord</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-amber-400 text-sm">{profile.bestScore} pts</span>
                    <span className="text-[10px] text-yellow-500 block">🧀 {profile.totalCheeses} quesos</span>
                  </div>
                </div>
              )}

              {/* Footer info */}
              <div className="text-[10px] text-slate-500 font-medium tracking-wide flex items-center justify-center landscape:justify-start gap-1.5 pt-0.5">
                <span>Alleyway Edition</span>
                <span className="text-slate-700">•</span>
                <span>v2.4</span>
              </div>
            </div>

            {/* Right Column / Menu Buttons */}
            <div className="flex flex-col gap-2 justify-center">
              <button
                onClick={() => {
                  soundFx.play('click');
                  haptics.light();
                  setCurrentView(AppView.INSTRUCTIONS);
                }}
                className="w-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black py-2.5 sm:py-3 px-4 rounded-xl text-sm sm:text-base shadow-[0_0_20px_rgba(251,191,36,0.25)] flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                JUGAR AHORA
              </button>

              <button
                onClick={() => {
                  soundFx.play('click');
                  haptics.light();
                  setCurrentView(AppView.RECORDS);
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 font-bold py-2 sm:py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                MEJORES 4 RÉCORDS
              </button>

              <button
                onClick={() => {
                  soundFx.play('click');
                  haptics.light();
                  setCurrentView(AppView.ACHIEVEMENTS);
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold py-2 sm:py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Award className="w-3.5 h-3.5 text-yellow-400" />
                LOGROS Y MEDALLAS
              </button>

              {!isGameDownloaded && (
                <button
                  onClick={handleDownloadGame}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black py-2 sm:py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  DESCARGAR JUEGO (Offline)
                </button>
              )}

              <button
                onClick={handleExitGame}
                className="w-full bg-slate-900/90 hover:bg-rose-950/40 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-700/60 font-bold py-2 sm:py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                SALIR DEL JUEGO
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: INSTRUCTIONS */}
        {currentView === AppView.INSTRUCTIONS && (
          <div className="w-full max-w-sm landscape:max-w-md mx-auto my-auto bg-slate-900/95 border-2 border-sky-500/50 p-3 sm:p-5 landscape:p-3 rounded-2xl shadow-2xl text-center text-slate-100 flex flex-col gap-2.5 sm:gap-3 max-h-[92dvh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">PUNTUACIÓN</h2>

            <div className="text-left bg-slate-950/80 p-3 sm:p-4 rounded-xl border border-slate-800 space-y-2 text-xs md:text-sm">
              <p className="text-slate-400 font-bold uppercase text-[11px] tracking-wider text-center mb-1">
                Reglas del juego
              </p>

              <div className="flex items-center justify-between bg-slate-800/60 p-2 sm:p-2.5 rounded-lg border border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">🧀</span>
                  <span className="text-amber-400 font-bold text-xs sm:text-sm">Recoger Queso</span>
                </div>
                <span className="text-white font-black text-xs sm:text-sm">+10 Pts</span>
              </div>

              <div className="flex items-center justify-between bg-slate-800/60 p-2 sm:p-2.5 rounded-lg border border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">🚧</span>
                  <span className="text-emerald-400 font-bold text-xs sm:text-sm">Saltar Obstáculo</span>
                </div>
                <span className="text-white font-black text-xs sm:text-sm">+15 Pts</span>
              </div>

              <div className="text-[11px] text-slate-400 mt-2 text-center">
                💡 Consejo: Toca cualquier lugar de la pantalla para saltar en tu dispositivo táctil.
              </div>
            </div>

            <button
              onClick={handleStartGame}
              className="w-full bg-gradient-to-r from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 text-white font-black py-2.5 sm:py-3 px-6 rounded-xl text-sm sm:text-base shadow-lg active:scale-95 transition"
            >
              ¡Entendido! Comenzar
            </button>
          </div>
        )}

        {/* VIEW 4: LEADERBOARD / RECORDS */}
        {currentView === AppView.RECORDS && (
          <LeaderboardView
            records={allRecords}
            onBack={() => {
              soundFx.play('click');
              setCurrentView(AppView.MENU);
            }}
            onClearRecords={handleClearRecords}
          />
        )}

        {/* VIEW 5: ACHIEVEMENTS */}
        {currentView === AppView.ACHIEVEMENTS && (
          <AchievementsView
            achievements={achievements}
            onBack={() => {
              soundFx.play('click');
              setCurrentView(AppView.MENU);
            }}
          />
        )}

        {/* VIEW 6: GAME OVER SCREEN */}
        {currentView === AppView.GAMEOVER && (
          <div className="w-full max-w-md landscape:max-w-2xl mx-auto my-auto bg-slate-900/95 border-2 border-red-600/70 p-3 sm:p-4 landscape:p-3 rounded-2xl shadow-2xl text-center text-slate-100 flex flex-col gap-2 sm:gap-2.5 max-h-[92dvh] overflow-y-auto">
            <h2 className="text-2xl sm:text-4xl font-black text-red-500 drop-shadow-md">
              ¡PERDISTE!
            </h2>

            {/* Score Card */}
            <div className="bg-slate-950/80 py-2 px-4 rounded-xl border border-slate-800 inline-block mx-auto">
              <span className="text-slate-400 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider block">
                Puntuación Final
              </span>
              <span className="text-3xl sm:text-5xl font-black text-amber-400 leading-none my-0.5 block">
                {finalRunStats.score}
              </span>
              <div className="flex justify-center gap-3 text-[11px] sm:text-xs text-slate-400 mt-0.5">
                <span>🧀 {finalRunStats.cheeses} quesos</span>
                <span>•</span>
                <span>⚡ {finalRunStats.obstacles} evasiones</span>
              </div>
            </div>

            {/* MANDATORY TOP 4 ENTRY FORM */}
            {qualifiesForTop4(finalRunStats.score) && !isRecordSaved && (
              <div className="p-2.5 sm:p-3 bg-amber-500/10 border-2 border-amber-500/60 rounded-xl text-left space-y-1.5 sm:space-y-2">
                <p className="text-amber-300 font-black text-xs sm:text-sm text-center flex items-center justify-center gap-1">
                  <span>🎉</span> ¡ENTRASTE EN EL TOP 4 DE LA BASE DE DATOS!
                </p>
                <p className="text-slate-300 text-[10px] sm:text-[11px] text-center font-medium">
                  Escribe tu nombre para guardar tu récord permanentemente (Obligatorio):
                </p>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      maxLength={14}
                      autoFocus
                      value={playerNameInput}
                      onChange={(e) => {
                        setPlayerNameInput(e.target.value);
                        setInputError(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRecord();
                      }}
                      placeholder="Escribe tu nombre aquí..."
                      className="w-full bg-slate-950 border-2 border-slate-700 focus:border-amber-400 text-white px-3 py-2 pr-8 rounded-xl text-xs outline-none transition"
                    />
                    {playerNameInput.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setPlayerNameInput('');
                          setInputError(false);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white bg-slate-800 rounded-full w-5 h-5 flex items-center justify-center text-[10px] transition"
                        title="Borrar texto"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleSaveRecord}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs whitespace-nowrap shadow-md active:scale-95 transition"
                  >
                    GUARDAR
                  </button>
                </div>

                {inputError && (
                  <div className="text-rose-300 font-bold text-xs bg-rose-950/90 border border-rose-700 px-2.5 py-1.5 rounded-lg text-center animate-shake flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Por favor escribe tu nombre antes de continuar.
                  </div>
                )}
              </div>
            )}

            {isRecordSaved && (
              <div className="bg-emerald-950/80 border border-emerald-600 text-emerald-300 py-1 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                <Check className="w-4 h-4" />
                ¡Récord guardado exitosamente en IndexedDB!
              </div>
            )}

            {/* TOP 4 LEADERBOARD PREVIEW */}
            <div className="text-left">
              <span className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-wider block text-center mb-1">
                🏆 Tabla de los 4 Mejores Puntajes
              </span>
              <div className="bg-slate-950/90 p-2 sm:p-2.5 rounded-xl border border-slate-800 space-y-1">
                {topRecords.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex justify-between items-center py-0.5 sm:py-1 px-2 rounded-lg bg-slate-900/80 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span>{['🥇', '🥈', '🥉', '🏅'][idx] || '🏅'}</span>
                      <span className="font-extrabold text-slate-200">{item.playerName}</span>
                    </div>
                    <span className="font-black text-amber-400">{item.score} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-2 sm:gap-2.5 mt-0.5">
              <button
                onClick={() => {
                  if (qualifiesForTop4(finalRunStats.score) && !isRecordSaved) {
                    handleSaveRecord();
                    return;
                  }
                  handleStartGame();
                }}
                className="flex-1 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black py-2.5 sm:py-3 px-3 rounded-xl text-xs sm:text-sm shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                <RotateCcw className="w-4 h-4" />
                Volver a jugar
              </button>

              <button
                onClick={() => {
                  if (qualifiesForTop4(finalRunStats.score) && !isRecordSaved) {
                    handleSaveRecord();
                    return;
                  }
                  soundFx.play('click');
                  setCurrentView(AppView.MENU);
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold py-2.5 sm:py-3 px-3 rounded-xl text-xs sm:text-sm active:scale-95 transition"
              >
                Salir al Menú
              </button>
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM ANDROID NAVIGATION BAR (Visible in Menu and Subviews) */}
      {currentView !== AppView.PLAYING && currentView !== AppView.PAUSED && (
        <nav className="w-full max-w-md mx-auto px-4 py-1.5 sm:py-2 border-t border-slate-800/80 bg-slate-900/90 backdrop-blur-md rounded-t-2xl flex justify-around items-center text-[10px] font-bold text-slate-400 shrink-0 safe-bottom landscape-compact-nav z-20">
          <button
            onClick={() => {
              soundFx.play('click');
              setCurrentView(AppView.MENU);
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              currentView === AppView.MENU ? 'text-amber-400' : 'hover:text-slate-200'
            }`}
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Inicio</span>
          </button>

          <button
            onClick={() => {
              soundFx.play('click');
              setCurrentView(AppView.RECORDS);
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              currentView === AppView.RECORDS ? 'text-amber-400' : 'hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Récords</span>
          </button>

          <button
            onClick={() => {
              soundFx.play('click');
              setCurrentView(AppView.ACHIEVEMENTS);
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              currentView === AppView.ACHIEVEMENTS ? 'text-amber-400' : 'hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Logros</span>
          </button>

          <button
            onClick={() => {
              soundFx.play('click');
              setIsSettingsModalOpen(true);
            }}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl hover:text-slate-200 transition"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            <span>Ajustes</span>
          </button>
        </nav>
      )}

      {/* MODAL 1: ROBUST LOCAL DATABASE (INDEXEDDB) */}
      <DatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onDataChanged={refreshDatabase}
      />

      {/* MODAL 2: SETTINGS MODAL */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSettingsUpdate={setSettings}
        onOpenDbManager={() => setIsDbModalOpen(true)}
        onDownloadGame={!isStandaloneGame ? handleDownloadGame : undefined}
      />

      {/* MODAL 3: DOWNLOAD STANDALONE GAME (OFFLINE FOR PC & MOBILE) */}
      <DownloadGameModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />
    </div>
  );
}
