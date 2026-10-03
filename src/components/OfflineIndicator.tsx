import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Database } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold">
      {!isOnline ? (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
          <WifiOff className="w-3 h-3 animate-pulse" />
          <span>Modo Sin Conexión</span>
        </span>
      ) : (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <Database className="w-3 h-3" />
          <span className="hidden sm:inline">DB Local Activa</span>
          <span className="sm:hidden">Offline Ready</span>
        </span>
      )}
    </div>
  );
};
