import React, { useState, useEffect, useRef } from 'react';
import {
  localDB,
  GameRecord,
  PlayerProfile,
} from '../db/indexedDb';
import {
  Database,
  Download,
  Upload,
  Trash2,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  X,
  FileJson,
} from 'lucide-react';
import { soundFx } from '../services/audioEngine';
import { haptics } from '../services/haptics';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [storageInfo, setStorageInfo] = useState<string>('Calculando...');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = async () => {
    try {
      const recs = await localDB.getAllRecords();
      setRecords(recs);

      const prof = await localDB.getProfile();
      setProfile(prof);

      const estimate = await localDB.getStorageEstimate();
      setStorageInfo(estimate.formatted);
    } catch {
      setStatusMessage({ type: 'error', text: 'Error al consultar IndexedDB local.' });
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setStatusMessage(null);
      setIsConfirmingClear(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportBackup = async () => {
    soundFx.play('click');
    haptics.light();
    try {
      const jsonString = await localDB.exportBackup();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `mouse-runner-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      soundFx.play('achievement');
      haptics.achievement();
      setStatusMessage({
        type: 'success',
        text: '¡Copia de seguridad JSON exportada con éxito!',
      });
      onDataChanged();
      loadData();
    } catch {
      soundFx.play('error');
      setStatusMessage({ type: 'error', text: 'Fallo al exportar el archivo de respaldo.' });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundFx.play('click');
    try {
      const text = await file.text();
      const result = await localDB.importBackup(text);
      if (result.success) {
        soundFx.play('achievement');
        haptics.achievement();
        setStatusMessage({ type: 'success', text: result.message });
        await loadData();
        onDataChanged();
      } else {
        soundFx.play('error');
        haptics.error();
        setStatusMessage({ type: 'error', text: result.message });
      }
    } catch {
      soundFx.play('error');
      setStatusMessage({ type: 'error', text: 'Archivo JSON corrupto o inválido.' });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteRecord = async (id?: number) => {
    if (id === undefined) return;
    soundFx.play('click');
    haptics.light();
    await localDB.deleteRecord(id);
    await loadData();
    onDataChanged();
  };

  const handleClearAll = async () => {
    soundFx.play('hit');
    haptics.impact();
    await localDB.clearAllRecords();
    setIsConfirmingClear(false);
    setStatusMessage({ type: 'info', text: 'Todos los registros locales han sido eliminados.' });
    await loadData();
    onDataChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-white">Base de Datos Local (IndexedDB)</h2>
              <p className="text-xs text-slate-400">Almacenamiento persistente, offline y seguro en tu dispositivo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message Notification */}
        {statusMessage && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                : statusMessage.type === 'error'
                ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                : 'bg-sky-950/80 text-sky-300 border-sky-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs md:text-sm">
          {/* Storage & Profile Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Registros</span>
              <span className="text-lg md:text-xl font-black text-amber-400">{records.length}</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Queso Total</span>
              <span className="text-lg md:text-xl font-black text-yellow-400">🧀 {profile?.totalCheeses || 0}</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Saltos Hechos</span>
              <span className="text-lg md:text-xl font-black text-sky-400">⚡ {profile?.totalJumps || 0}</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Motor DB</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
                <CheckCircle className="w-3.5 h-3.5" /> IndexedDB v1
              </span>
            </div>
          </div>

          {/* Backup / Export / Import Action Panel */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              Respaldo y Transferencia de Datos
            </h3>
            <p className="text-slate-400 text-xs mb-3">
              Exporta tus récords para conservarlos al cambiar de dispositivo Android o restaura un respaldo previo.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs transition shadow-sm active:scale-95"
              >
                <Download className="w-4 h-4" />
                Exportar Respaldo (.JSON)
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold px-3.5 py-2 rounded-xl text-xs transition active:scale-95"
              >
                <Upload className="w-4 h-4 text-sky-400" />
                Importar Respaldo (.JSON)
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />

              <button
                onClick={loadData}
                title="Recargar datos"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 ml-auto"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <FileJson className="w-3 h-3" /> Estado: {storageInfo}
            </div>
          </div>

          {/* Records Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Historial de Partidas Guardadas ({records.length})
              </h3>
              {records.length > 0 && !isConfirmingClear && (
                <button
                  onClick={() => setIsConfirmingClear(true)}
                  className="text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Vaciar DB
                </button>
              )}
            </div>

            {isConfirmingClear && (
              <div className="mb-3 p-3 bg-rose-950/60 border border-rose-800 rounded-xl flex items-center justify-between gap-2">
                <span className="text-xs text-rose-200 font-medium">
                  ¿Seguro que deseas eliminar todos los récords locales?
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearAll}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-black px-3 py-1 rounded-lg text-xs"
                  >
                    Sí, borrar
                  </button>
                  <button
                    onClick={() => setIsConfirmingClear(false)}
                    className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              {records.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No hay partidas guardadas aún en la base de datos local.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Jugador</th>
                      <th className="py-2 px-2 text-right">Puntos</th>
                      <th className="py-2 px-2 text-right hidden sm:table-cell">Queso</th>
                      <th className="py-2 px-2 text-right hidden sm:table-cell">Evasión</th>
                      <th className="py-2 px-3 text-right">Fecha</th>
                      <th className="py-2 px-2 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-bold text-slate-200">{rec.playerName}</td>
                        <td className="py-2 px-2 text-right font-black text-amber-400">{rec.score}</td>
                        <td className="py-2 px-2 text-right text-slate-400 hidden sm:table-cell">
                          {rec.cheeses}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-400 hidden sm:table-cell">
                          {rec.obstaclesJumped}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-400 text-[11px]">
                          {rec.createdAt}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => handleDeleteRecord(rec.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Eliminar este récord"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-5 rounded-xl text-xs transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
