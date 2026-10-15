import React from 'react';
import {
  Calendar,
  History,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { ScanHistoryItem } from '../types';
import { ScanHistoryChart } from './ScanHistoryChart';

interface HistoryTabProps {
  scanHistory?: ScanHistoryItem[];
  onRestoreScan?: (item: ScanHistoryItem) => void;
  onClearScanHistory?: () => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  scanHistory = [],
  onRestoreScan,
  onClearScanHistory,
}) => {
  return (
    <div className="space-y-4 pb-24 text-slate-200">
      {/* Header do Histórico de Varreduras */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
            <History className="w-5 h-5 text-orange-500" />
            <span>Histórico de Varreduras</span>
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhe e reabra pesquisas de mercado anteriores
          </p>
        </div>
        {scanHistory.length > 0 && onClearScanHistory && (
          <button
            onClick={onClearScanHistory}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition-colors p-1"
            title="Limpar histórico de varreduras"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        )}
      </div>

      {/* Gráfico de Barras Recharts: Oportunidades por Varredura na Última Semana */}
      {scanHistory.length > 0 && (
        <ScanHistoryChart
          scanHistory={scanHistory}
          onSelectScan={onRestoreScan}
        />
      )}

      {/* Lista de Varreduras Anteriores */}
      {scanHistory.length === 0 ? (
        <div className="py-14 text-center space-y-3 px-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">
            Nenhuma varredura anterior registrada
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Execute varreduras no Radar para registrar suas pesquisas e histórico de mercado aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="px-1 text-xs text-slate-400">
            <span>
              {scanHistory.length} {scanHistory.length === 1 ? 'análise registrada' : 'análises registradas'}
            </span>
          </div>

          {scanHistory.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition-all space-y-3 shadow-md"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{item.formattedDate}</span>
                </div>
                <span className="font-semibold text-orange-400 bg-orange-950/40 border border-orange-800/40 px-2 py-0.5 rounded-md text-[11px]">
                  {item.category}
                </span>
              </div>

              {item.keyword && (
                <div className="text-xs text-slate-300">
                  <span className="text-slate-500 text-[11px]">Busca: </span>
                  <span className="font-medium text-white">"{item.keyword}"</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 p-2 bg-slate-950/60 rounded-xl text-center text-xs border border-slate-800/50">
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                    ANALISADOS
                  </span>
                  <span className="font-extrabold text-white tabular-nums">
                    {item.totalScanned}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-amber-500 font-bold">
                    MINA OURO
                  </span>
                  <span className="font-extrabold text-amber-400 tabular-nums">
                    {item.goldMineCount}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase tracking-wider text-emerald-500 font-bold">
                    0 VÍDEOS
                  </span>
                  <span className="font-extrabold text-emerald-400 tabular-nums">
                    {item.zeroVideosCount}
                  </span>
                </div>
              </div>

              {onRestoreScan && (
                <button
                  onClick={() => onRestoreScan(item)}
                  className="w-full min-h-[38px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-[0.99]"
                >
                  <span>Reabrir esta varredura no Radar</span>
                  <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
