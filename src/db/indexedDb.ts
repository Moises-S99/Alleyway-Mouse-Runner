/**
 * Robust IndexedDB database management for Alleyway Mouse Runner Mobile
 * Handles offline persistence, schema migrations, statistics, achievements, and JSON backup/restore.
 * Includes a zero-crash memory and localStorage fallback for file:// protocol and restricted webviews.
 */

export interface GameRecord {
  id?: number;
  playerName: string;
  score: number;
  cheeses: number;
  obstaclesJumped: number;
  durationSeconds: number;
  createdAt: string;
  timestamp: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: string;
  totalGames: number;
  totalScore: number;
  totalCheeses: number;
  totalJumps: number;
  bestScore: number;
  lastPlayed: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  progress: number;
  maxProgress: number;
}

export interface AppSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  sfxVolume: number;
  showTouchIndicator: boolean;
  difficulty: 'facil' | 'normal' | 'dificil';
  isGameDownloaded?: boolean;
}

export interface DatabaseBackup {
  version: number;
  exportedAt: string;
  app: string;
  records: GameRecord[];
  profile: PlayerProfile;
  achievements: Achievement[];
  settings: AppSettings;
}

const DB_NAME = 'AlleywayMouseDB';
const DB_VERSION = 1;

const DEFAULT_PROFILE: PlayerProfile = {
  id: 'default_player',
  name: 'SuperRata',
  avatar: '🐭',
  totalGames: 0,
  totalScore: 0,
  totalCheeses: 0,
  totalJumps: 0,
  bestScore: 0,
  lastPlayed: new Date().toISOString(),
};

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  sfxVolume: 0.8,
  showTouchIndicator: true,
  difficulty: 'normal',
};

const DEFAULT_RECORDS: Omit<GameRecord, 'id'>[] = [
  {
    playerName: 'Jairo Sifontes',
    score: 850,
    cheeses: 42,
    obstaclesJumped: 35,
    durationSeconds: 120,
    createdAt: 'Récord Oficial',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    playerName: 'RataVeloz',
    score: 620,
    cheeses: 31,
    obstaclesJumped: 24,
    durationSeconds: 95,
    createdAt: 'Récord Oficial',
    timestamp: Date.now() - 1000 * 60 * 60 * 48,
  },
  {
    playerName: 'QuesoMaster',
    score: 480,
    cheeses: 24,
    obstaclesJumped: 18,
    durationSeconds: 70,
    createdAt: 'Récord Oficial',
    timestamp: Date.now() - 1000 * 60 * 60 * 72,
  },
  {
    playerName: 'RoedorUrbano',
    score: 350,
    cheeses: 18,
    obstaclesJumped: 12,
    durationSeconds: 50,
    createdAt: 'Récord Oficial',
    timestamp: Date.now() - 1000 * 60 * 60 * 96,
  },
];

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_run',
    title: 'Primeros Pasos',
    description: 'Completa tu primera carrera por los callejones oscuros.',
    icon: '🐾',
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'cheese_lover_25',
    title: 'Amante del Queso',
    description: 'Recolecta un total de 25 pedazos de queso.',
    icon: '🧀',
    unlockedAt: null,
    progress: 0,
    maxProgress: 25,
  },
  {
    id: 'trap_dodger_20',
    title: 'Saltador Experto',
    description: 'Esquiva 20 trampas y cajas con saltos precisos.',
    icon: '🚧',
    unlockedAt: null,
    progress: 0,
    maxProgress: 20,
  },
  {
    id: 'trap_master_60',
    title: 'Reflejos de Relámpago',
    description: 'Esquiva 60 obstáculos con éxito en total.',
    icon: '🛡️',
    unlockedAt: null,
    progress: 0,
    maxProgress: 60,
  },
  {
    id: 'top4_champion',
    title: 'Top 4 Callejero',
    description: 'Entra en el podio de los 4 mejores récords.',
    icon: '🏆',
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'podium_first',
    title: 'Rey Absoluto del Callejón',
    description: 'Consigue la puntuación más alta y alcanza el puesto #1 del Top 4.',
    icon: '🥇',
    unlockedAt: null,
    progress: 0,
    maxProgress: 1,
  },
  {
    id: 'master_300',
    title: 'Maestro Roedor',
    description: 'Alcanza más de 300 puntos en una sola partida.',
    icon: '🔥',
    unlockedAt: null,
    progress: 0,
    maxProgress: 300,
  },
  {
    id: 'legend_500',
    title: 'Racha Legendaria',
    description: 'Supera la impresionante cifra de 500 puntos en una sola partida.',
    icon: '🌟',
    unlockedAt: null,
    progress: 0,
    maxProgress: 500,
  },
  {
    id: 'survivor_60',
    title: 'Superviviente Callejero',
    description: 'Sobrevive más de 60 segundos continuos en una sola partida.',
    icon: '⏱️',
    unlockedAt: null,
    progress: 0,
    maxProgress: 60,
  },
  {
    id: 'total_score_1500',
    title: 'Leyenda Urbana',
    description: 'Acumula más de 1,500 puntos combinados entre todas tus partidas.',
    icon: '🏅',
    unlockedAt: null,
    progress: 0,
    maxProgress: 1500,
  },
  {
    id: 'veteran_20',
    title: 'Veterano del Asfalto',
    description: 'Juega 20 partidas en total demostrando tu constancia.',
    icon: '🎖️',
    unlockedAt: null,
    progress: 0,
    maxProgress: 20,
  },
  {
    id: 'cheese_master_100',
    title: 'Gran Banquete',
    description: 'Recolecta 100 pedazos de queso en total.',
    icon: '🧀✨',
    unlockedAt: null,
    progress: 0,
    maxProgress: 100,
  },
  {
    id: 'cheese_legend_300',
    title: 'Señor del Queso Dorado',
    description: 'Recolecta 300 pedazos de queso en tu carrera callejera.',
    icon: '👑🧀',
    unlockedAt: null,
    progress: 0,
    maxProgress: 300,
  },
  {
    id: 'cheese_frenzy_45',
    title: 'Atracón Legendario',
    description: 'Recoge 45 pedazos de queso en una sola partida sin descanso.',
    icon: '🏆🧀',
    unlockedAt: null,
    progress: 0,
    maxProgress: 45,
  },
  {
    id: 'acrobat_40',
    title: 'Acróbata del Asfalto',
    description: 'Realiza 40 saltos acrobáticos en el callejón.',
    icon: '🦘⚡',
    unlockedAt: null,
    progress: 0,
    maxProgress: 40,
  },
  {
    id: 'jumps_master_100',
    title: 'Maestro del Salto Callejero',
    description: 'Realiza 100 saltos en total esquivando todos los peligros.',
    icon: '👟💨',
    unlockedAt: null,
    progress: 0,
    maxProgress: 100,
  },
  {
    id: 'trap_overlord_150',
    title: 'Inalcanzable',
    description: 'Esquiva 150 obstáculos con éxito a lo largo de tu carrera.',
    icon: '⚡🛡️',
    unlockedAt: null,
    progress: 0,
    maxProgress: 150,
  },
  {
    id: 'score_titan_750',
    title: 'Titán del Callejón',
    description: 'Alcanza la impresionante puntuación de 750 puntos en una sola partida.',
    icon: '💎',
    unlockedAt: null,
    progress: 0,
    maxProgress: 750,
  },
  {
    id: 'score_myth_1000',
    title: 'Mito Supremo',
    description: '¡Supera la colosal marca de 1,000 puntos en una sola partida!',
    icon: '🌌',
    unlockedAt: null,
    progress: 0,
    maxProgress: 1000,
  },
  {
    id: 'survivor_90',
    title: 'Inmortal del Asfalto',
    description: 'Sobrevive más de 90 segundos continuos esquivando trampas.',
    icon: '⏳🔥',
    unlockedAt: null,
    progress: 0,
    maxProgress: 90,
  },
  {
    id: 'games_veteran_30',
    title: 'Guerrero Incansable',
    description: 'Completa 30 partidas totales en los callejones.',
    icon: '⚔️🐭',
    unlockedAt: null,
    progress: 0,
    maxProgress: 30,
  },
];

class RobustDatabase {
  private db: IDBDatabase | null = null;
  private isInitializing: Promise<IDBDatabase | null> | null = null;
  private useFallback = false;

  // In-memory / localStorage fallback stores
  private memRecords: GameRecord[] = [];
  private memProfile: PlayerProfile = { ...DEFAULT_PROFILE };
  private memAchievements: Achievement[] = [...DEFAULT_ACHIEVEMENTS];
  private memSettings: AppSettings = { ...DEFAULT_SETTINGS };

  constructor() {
    this.memRecords = DEFAULT_RECORDS.map((r, i) => ({ ...r, id: i + 1 }));
    this.loadFromLocalStorageFallback();
  }

  private loadFromLocalStorageFallback() {
    try {
      if (typeof localStorage === 'undefined') return;
      const rec = localStorage.getItem('mouse_runner_fallback_records');
      if (rec) this.memRecords = JSON.parse(rec);
      const prof = localStorage.getItem('mouse_runner_fallback_profile');
      if (prof) this.memProfile = JSON.parse(prof);
      const ach = localStorage.getItem('mouse_runner_fallback_achievements');
      if (ach) this.memAchievements = JSON.parse(ach);
      const set = localStorage.getItem('mouse_runner_fallback_settings');
      if (set) this.memSettings = JSON.parse(set);
    } catch {}
  }

  private saveToLocalStorageFallback() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem('mouse_runner_fallback_records', JSON.stringify(this.memRecords));
      localStorage.setItem('mouse_runner_fallback_profile', JSON.stringify(this.memProfile));
      localStorage.setItem('mouse_runner_fallback_achievements', JSON.stringify(this.memAchievements));
      localStorage.setItem('mouse_runner_fallback_settings', JSON.stringify(this.memSettings));
    } catch {}
  }

  async getDB(): Promise<IDBDatabase | null> {
    if (this.useFallback) return null;
    if (this.db) return this.db;
    if (this.isInitializing) return this.isInitializing;

    this.isInitializing = new Promise<IDBDatabase | null>((resolve) => {
      if (typeof indexedDB === 'undefined') {
        this.useFallback = true;
        resolve(null);
        return;
      }

      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          try {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('records')) {
              const recordStore = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
              recordStore.createIndex('by_score', 'score', { unique: false });
              recordStore.createIndex('by_timestamp', 'timestamp', { unique: false });
              recordStore.createIndex('by_playerName', 'playerName', { unique: false });
            }
            if (!db.objectStoreNames.contains('profile')) {
              db.createObjectStore('profile', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('achievements')) {
              db.createObjectStore('achievements', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('settings')) {
              db.createObjectStore('settings', { keyPath: 'key' });
            }
          } catch {
            this.useFallback = true;
          }
        };

        request.onsuccess = async () => {
          this.db = request.result;
          await this.seedDefaultsIfEmpty();
          resolve(this.db);
        };

        request.onerror = () => {
          // IndexedDB denied (common on file:// or restricted webviews)
          this.useFallback = true;
          resolve(null);
        };
      } catch {
        this.useFallback = true;
        resolve(null);
      }
    });

    return this.isInitializing;
  }

  private async seedDefaultsIfEmpty(): Promise<void> {
    try {
      const records = await this.getAllRecords();
      if (records.length === 0) {
        for (const item of DEFAULT_RECORDS) {
          await this.addRawRecord(item);
        }
      }

      const profile = await this.getProfile();
      if (!profile) {
        await this.saveProfile(DEFAULT_PROFILE);
      }

      const achievements = await this.getAchievements();
      for (const ach of DEFAULT_ACHIEVEMENTS) {
        if (!achievements.some((a) => a.id === ach.id)) {
          await this.saveAchievement(ach);
        }
      }

      const settings = await this.getSettings();
      if (!settings) {
        await this.saveSettings(DEFAULT_SETTINGS);
      }
    } catch (err) {
      console.warn('Default seeding handled:', err);
    }
  }

  // --- RECORDS ---
  async addRecord(record: Omit<GameRecord, 'id'>): Promise<number> {
    const db = await this.getDB();
    if (!db) {
      const newId = (this.memRecords.length > 0 ? Math.max(...this.memRecords.map((r) => r.id || 0)) : 0) + 1;
      const newRec: GameRecord = { ...record, id: newId };
      this.memRecords.push(newRec);
      this.memRecords.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
      this.saveToLocalStorageFallback();
      return newId;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('records', 'readwrite');
        const store = tx.objectStore('records');
        const request = store.add(record);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => resolve(Date.now());
      } catch {
        resolve(Date.now());
      }
    });
  }

  private async addRawRecord(record: Omit<GameRecord, 'id'>): Promise<void> {
    const db = await this.getDB();
    if (!db) {
      this.memRecords.push({ ...record, id: this.memRecords.length + 1 });
      this.saveToLocalStorageFallback();
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('records', 'readwrite');
        const store = tx.objectStore('records');
        const request = store.add(record);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async getAllRecords(): Promise<GameRecord[]> {
    const db = await this.getDB();
    if (!db) {
      return [...this.memRecords].sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('records', 'readonly');
        const store = tx.objectStore('records');
        const request = store.getAll();

        request.onsuccess = () => {
          const records = (request.result as GameRecord[]) || [];
          records.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
          resolve(records.length > 0 ? records : [...this.memRecords]);
        };
        request.onerror = () => resolve([...this.memRecords]);
      } catch {
        resolve([...this.memRecords]);
      }
    });
  }

  async getTopRecords(limit = 4): Promise<GameRecord[]> {
    const all = await this.getAllRecords();
    return all.slice(0, limit);
  }

  async deleteRecord(id: number): Promise<void> {
    const db = await this.getDB();
    this.memRecords = this.memRecords.filter((r) => r.id !== id);
    this.saveToLocalStorageFallback();

    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('records', 'readwrite');
        const store = tx.objectStore('records');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async clearAllRecords(): Promise<void> {
    this.memRecords = [];
    this.saveToLocalStorageFallback();
    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('records', 'readwrite');
        const store = tx.objectStore('records');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // --- PROFILE ---
  async getProfile(): Promise<PlayerProfile> {
    const db = await this.getDB();
    if (!db) return { ...this.memProfile };

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('profile', 'readonly');
        const store = tx.objectStore('profile');
        const request = store.get('default_player');

        request.onsuccess = () => resolve(request.result || { ...this.memProfile });
        request.onerror = () => resolve({ ...this.memProfile });
      } catch {
        resolve({ ...this.memProfile });
      }
    });
  }

  async saveProfile(profile: PlayerProfile): Promise<void> {
    this.memProfile = { ...profile };
    this.saveToLocalStorageFallback();
    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('profile', 'readwrite');
        const store = tx.objectStore('profile');
        const request = store.put({ ...profile, id: 'default_player' });
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async recordGameRun(run: { score: number; cheeses: number; obstacles: number; jumps: number }): Promise<PlayerProfile> {
    const profile = await this.getProfile();
    const updated: PlayerProfile = {
      ...profile,
      totalGames: profile.totalGames + 1,
      totalScore: profile.totalScore + run.score,
      totalCheeses: profile.totalCheeses + run.cheeses,
      totalJumps: profile.totalJumps + run.jumps,
      bestScore: Math.max(profile.bestScore, run.score),
      lastPlayed: new Date().toISOString(),
    };
    await this.saveProfile(updated);
    return updated;
  }

  // --- ACHIEVEMENTS ---
  async getAchievements(): Promise<Achievement[]> {
    const db = await this.getDB();
    if (!db) return [...this.memAchievements];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('achievements', 'readonly');
        const store = tx.objectStore('achievements');
        const request = store.getAll();

        request.onsuccess = () => {
          const res = (request.result as Achievement[]) || [];
          resolve(res.length > 0 ? res : [...this.memAchievements]);
        };
        request.onerror = () => resolve([...this.memAchievements]);
      } catch {
        resolve([...this.memAchievements]);
      }
    });
  }

  async saveAchievement(ach: Achievement): Promise<void> {
    const idx = this.memAchievements.findIndex((a) => a.id === ach.id);
    if (idx >= 0) this.memAchievements[idx] = { ...ach };
    else this.memAchievements.push({ ...ach });
    this.saveToLocalStorageFallback();

    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('achievements', 'readwrite');
        const store = tx.objectStore('achievements');
        const request = store.put(ach);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async updateAchievementProgress(
    id: string,
    progressDelta: number,
    absolute = false
  ): Promise<Achievement | null> {
    const achievements = await this.getAchievements();
    const target = achievements.find((a) => a.id === id);
    if (!target) return null;

    const newProgress = absolute ? progressDelta : target.progress + progressDelta;
    const capped = Math.min(target.maxProgress, newProgress);
    const isUnlocked = capped >= target.maxProgress;

    const updated: Achievement = {
      ...target,
      progress: capped,
      unlockedAt: target.unlockedAt || (isUnlocked ? new Date().toISOString() : null),
    };

    await this.saveAchievement(updated);
    return updated;
  }

  // --- SETTINGS ---
  async getSettings(): Promise<AppSettings> {
    const db = await this.getDB();
    if (!db) return { ...this.memSettings };

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const request = store.get('app_settings');

        request.onsuccess = () => {
          if (request.result && request.result.value) {
            resolve({ ...DEFAULT_SETTINGS, ...request.result.value });
          } else {
            resolve({ ...this.memSettings });
          }
        };
        request.onerror = () => resolve({ ...this.memSettings });
      } catch {
        resolve({ ...this.memSettings });
      }
    });
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    this.memSettings = { ...settings };
    this.saveToLocalStorageFallback();
    const db = await this.getDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');
        const request = store.put({ key: 'app_settings', value: settings });
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // --- BACKUP & RESTORE ---
  async exportBackup(): Promise<string> {
    const records = await this.getAllRecords();
    const profile = await this.getProfile();
    const achievements = await this.getAchievements();
    const settings = await this.getSettings();

    const backupData: DatabaseBackup = {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      app: 'Alleyway Mouse Runner Mobile',
      records,
      profile,
      achievements,
      settings,
    };

    return JSON.stringify(backupData, null, 2);
  }

  async importBackup(jsonString: string): Promise<{ success: boolean; message: string; count: number }> {
    try {
      const data = JSON.parse(jsonString) as Partial<DatabaseBackup>;

      if (!data.records || !Array.isArray(data.records)) {
        throw new Error('El archivo no contiene un formato de respaldo válido de Alleyway Mouse Runner.');
      }

      this.memRecords = data.records.map((r, i) => ({ ...r, id: r.id || i + 1 }));
      if (data.profile) this.memProfile = { ...data.profile };
      if (data.achievements) this.memAchievements = [...data.achievements];
      if (data.settings) this.memSettings = { ...data.settings };
      this.saveToLocalStorageFallback();

      const db = await this.getDB();
      if (db) {
        try {
          const tx = db.transaction(['records', 'profile', 'achievements', 'settings'], 'readwrite');
          const recordStore = tx.objectStore('records');
          recordStore.clear();
          for (const rec of data.records) {
            const { id: _, ...item } = rec;
            recordStore.add(item);
          }
          if (data.profile) tx.objectStore('profile').put({ ...data.profile, id: 'default_player' });
          if (data.achievements) {
            const achStore = tx.objectStore('achievements');
            achStore.clear();
            for (const ach of data.achievements) achStore.put(ach);
          }
          if (data.settings) tx.objectStore('settings').put({ key: 'app_settings', value: data.settings });
        } catch {}
      }

      return {
        success: true,
        message: `Base de datos restaurada con éxito: ${data.records.length} partidas recuperadas.`,
        count: data.records.length,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido al importar el archivo JSON';
      return { success: false, message: errorMsg, count: 0 };
    }
  }

  async getStorageEstimate(): Promise<{ usage: number; quota: number; formatted: string }> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const formatted = `${(usage / (1024 * 1024)).toFixed(2)} MB / ${(quota / (1024 * 1024)).toFixed(0)} MB`;
        return { usage, quota, formatted };
      } catch {}
    }
    return { usage: 0, quota: 0, formatted: 'Almacenamiento Local Autónomo (100% Offline)' };
  }
}

export const localDB = new RobustDatabase();
