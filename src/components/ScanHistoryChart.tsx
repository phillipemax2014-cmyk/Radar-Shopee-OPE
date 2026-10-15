import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { BarChart3, TrendingUp, Calendar, Sparkles, Flame, CheckCircle2 } from 'lucide-react';
import { ScanHistoryItem } from '../types';

interface ScanHistoryChartProps {
  scanHistory: ScanHistoryItem[];
  onSelectScan?: (item: ScanHistoryItem) => void;
}

export const ScanHistoryChart: React.FC<ScanHistoryChartProps> = ({
  scanHistory = [],
  onSelectScan,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // 1. Filtrar varreduras da última semana (últimos 7 dias)
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const lastWeekScans = scanHistory.filter((item) => {
    if (!item.timestamp) return true;
    const t = new Date(item.timestamp).getTime();
    return !isNaN(t) && t >= sevenDaysAgo;
  });

  // Fallback: se não houver varreduras nos últimos 7 dias, utiliza as 7 varreduras mais recentes
  const sourceScans = lastWeekScans.length > 0 ? lastWeekScans : scanHistory.slice(0, 7);

  if (sourceScans.length === 0) {
    return null;
  }

  // Ordena cronologicamente (da mais antiga para a mais recente: esquerda -> direita)
  const chronologicalScans = [...sourceScans].sort((a, b) => {
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return timeA - timeB;
  });

  // 2. Mapeamento dos dados para o Recharts
  const chartData = chronologicalScans.map((item, index) => {
    const dateObj = new Date(item.timestamp || Date.now());
    const validDate = !isNaN(dateObj.getTime());

    // Abreviação do dia da semana (ex: SEG, TER, QUA)
    const weekdayRaw = validDate
      ? dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
      : `V${index + 1}`;
    const weekday = weekdayRaw.slice(0, 3).toUpperCase();

    // Dia/Mês (ex: 03/10)
    const dayMonth = validDate
      ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      : '';

    const shortLabel = validDate ? `${weekday} ${dayMonth}` : `Varr ${index + 1}`;
    const opportunities = Number(item.opportunitiesFound || item.totalScanned || 0);

    return {
      id: item.id,
      index,
      shortLabel,
      formattedDate: item.formattedDate || `${dayMonth}`,
      category: item.category || 'Geral',
      keyword: item.keyword || '',
      oportunidades: opportunities,
      goldMine: Number(item.goldMineCount || 0),
      zeroVideos: Number(item.zeroVideosCount || 0),
      totalScanned: Number(item.totalScanned || opportunities),
      rawItem: item,
    };
  });

  // 3. Cálculos das Métricas de Resumo da Semana
  const totalOpportunities = chartData.reduce((acc, curr) => acc + curr.oportunidades, 0);
  const avgOpportunities = Math.round(totalOpportunities / chartData.length);
  const maxOpportunities = Math.max(...chartData.map((d) => d.oportunidades));

  // Custom Tooltip estilizado para o tema Dark / Neon Orange
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[210px] pointer-events-none">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-orange-400" />
            <span>{data.formattedDate}</span>
          </span>
          <span className="text-[10px] text-orange-300 bg-orange-950/60 border border-orange-800/60 px-1.5 py-0.5 rounded font-semibold truncate max-w-[90px]">
            {data.category}
          </span>
        </div>

        {data.keyword && (
          <div className="text-[11px] text-slate-300">
            <span className="text-slate-500">Termo: </span>
            <span className="font-medium text-white">"{data.keyword}"</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-slate-400 font-medium">Oportunidades:</span>
          <span className="text-base font-extrabold text-orange-400 font-mono flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {data.oportunidades}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-800/80 text-[10px]">
          <div className="bg-slate-900/90 border border-slate-800 px-2 py-1 rounded text-amber-300 font-mono text-center">
            Mina Ouro: <span className="font-bold">{data.goldMine}</span>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 px-2 py-1 rounded text-emerald-300 font-mono text-center">
            0 Vídeos: <span className="font-bold">{data.zeroVideos}</span>
          </div>
        </div>

        {onSelectScan && (
          <p className="text-[9px] text-center text-slate-500 pt-0.5 italic">
            Toque para reabrir no Radar
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 space-y-3.5 shadow-xl">
      {/* Header do Gráfico */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-orange-500" />
            <h3 className="text-xs font-bold text-white tracking-wide uppercase font-display">
              Oportunidades por Varredura
            </h3>
          </div>
          <p className="text-[11px] text-slate-400">
            Desempenho das pesquisas realizadas na última semana
          </p>
        </div>

        <span className="text-[10px] font-bold bg-orange-950/70 border border-orange-500/30 text-orange-300 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-orange-400" />
          7 DIAS
        </span>
      </div>

      {/* Cards de Resumo Rápido da Semana */}
      <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/60 text-center">
        <div>
          <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">
            TOTAL NA SEMANA
          </span>
          <span className="text-sm font-extrabold text-orange-400 font-mono tabular-nums">
            {totalOpportunities}
          </span>
        </div>

        <div>
          <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">
            MÉDIA / VARREDURA
          </span>
          <span className="text-sm font-extrabold text-amber-400 font-mono tabular-nums">
            {avgOpportunities}
          </span>
        </div>

        <div>
          <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">
            MAIOR PICO
          </span>
          <span className="text-sm font-extrabold text-emerald-400 font-mono tabular-nums flex items-center justify-center gap-0.5">
            <Flame className="w-3 h-3 text-emerald-400" />
            {maxOpportunities}
          </span>
        </div>
      </div>

      {/* Gráfico de Barras com Recharts */}
      <div className="w-full h-48 -ml-2 select-none">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 10, left: -22, bottom: 0 }}
            onMouseMove={(state: any) => {
              if (state && state.activeTooltipIndex !== undefined) {
                setActiveIndex(state.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient id="barGradientPrimary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                <stop offset="100%" stopColor="#ea580c" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="barGradientActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.9} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="shortLabel"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />

            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              allowDecimals={false}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(255, 255, 255, 0.04)', radius: 6 }}
            />

            <Bar
              dataKey="oportunidades"
              radius={[6, 6, 0, 0]}
              maxBarSize={36}
              onClick={(entry: any) => {
                const item = entry?.rawItem || entry?.payload?.rawItem;
                if (onSelectScan && item) {
                  onSelectScan(item);
                }
              }}
              className="cursor-pointer transition-all duration-200"
            >
              {chartData.map((entry, index) => {
                const isSelected = activeIndex === index;
                return (
                  <Cell
                    key={`cell-${entry.id || index}`}
                    fill={isSelected ? 'url(#barGradientActive)' : 'url(#barGradientPrimary)'}
                    stroke={isSelected ? '#fef08a' : '#fb923c'}
                    strokeWidth={isSelected ? 1.5 : 0.5}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 px-1 border-t border-slate-800/60">
        <span>* Baseado nas varreduras salvas</span>
        <span className="flex items-center gap-1 text-slate-400">
          <span className="w-2 h-2 rounded-sm bg-orange-500 inline-block" />
          Oportunidades encontradas
        </span>
      </div>
    </div>
  );
};
