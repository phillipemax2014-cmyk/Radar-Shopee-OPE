import React from 'react';
import { Sparkles, VideoOff, Flame, Percent, Package, Layers } from 'lucide-react';
import { DashboardStats as StatsType, ShopeeProduct } from '../types';
import { formatNumberBR, calcularResumoDashboard } from '../services/opportunityEngine';

interface DashboardStatsProps {
  stats: StatsType;
  products?: ShopeeProduct[];
  onFilterZeroVideos?: () => void;
  onFilterGoldMine?: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  stats,
  products,
  onFilterZeroVideos,
  onFilterGoldMine,
}) => {
  // Processamento dinâmico imediato baseado no array de produtos recebidos da API
  const dados = React.useMemo(() => {
    if (products && Array.isArray(products) && products.length > 0) {
      return calcularResumoDashboard(products);
    }

    const avgComm = stats?.avgCommission !== null && stats?.avgCommission !== undefined
      ? `${stats.avgCommission.toFixed(1)}%`
      : '0%';
    const totalStk = stats?.totalStockAvailable !== null && stats?.totalStockAvailable !== undefined
      ? formatNumberBR(stats.totalStockAvailable)
      : '0';

    return {
      totalFound: stats?.totalFound ?? 0,
      goldMineCount: stats?.goldMineCount ?? 0,
      zeroVideosCount: stats?.zeroVideosCount ?? 0,
      highSalesCount: stats?.highSalesCount ?? 0,
      avgCommissionFormatted: stats?.avgCommissionFormatted || avgComm,
      totalStockFormatted: stats?.totalStockFormatted || totalStk,
    };
  }, [products, stats]);

  return (
    <div className="grid grid-cols-3 gap-2 my-3">
      {/* 1. Total Encontrados */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[10px] font-semibold uppercase tracking-wider">TOTAL</span>
          <Layers className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="mt-1">
          <span className="text-xl font-extrabold text-white tabular-nums tracking-tight font-display">
            {dados.totalFound}
          </span>
          <p className="text-[9px] text-slate-400 leading-tight mt-0.5">produtos</p>
        </div>
      </div>

      {/* 2. Oportunidades Ouro */}
      <button
        onClick={onFilterGoldMine}
        className="text-left bg-gradient-to-b from-amber-950/40 to-slate-900/90 border border-amber-600/40 rounded-xl p-2.5 flex flex-col justify-between hover:border-amber-500/70 transition-colors active:scale-[0.98]"
      >
        <div className="flex items-center justify-between text-amber-400">
          <span className="text-[10px] font-semibold uppercase tracking-wider">MINA OURO</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="mt-1">
          <span className="text-xl font-extrabold text-amber-400 tabular-nums tracking-tight font-display">
            {dados.goldMineCount}
          </span>
          <p className="text-[9px] text-amber-300/80 leading-tight mt-0.5">máximo potencial</p>
        </div>
      </button>

      {/* 3. Produtos Sem Vídeos */}
      <button
        onClick={onFilterZeroVideos}
        className="text-left bg-gradient-to-b from-emerald-950/40 to-slate-900/90 border border-emerald-600/40 rounded-xl p-2.5 flex flex-col justify-between hover:border-emerald-500/70 transition-colors active:scale-[0.98]"
      >
        <div className="flex items-center justify-between text-emerald-400">
          <span className="text-[10px] font-semibold uppercase tracking-wider">0 VÍDEOS</span>
          <VideoOff className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="mt-1">
          <span className="text-xl font-extrabold text-emerald-400 tabular-nums tracking-tight font-display">
            {dados.zeroVideosCount}
          </span>
          <p className="text-[9px] text-emerald-300/80 leading-tight mt-0.5">sem concorrência</p>
        </div>
      </button>

      {/* 4. Alto Volume de Vendas (Cálculo dinâmico) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-orange-400">
          <span className="text-[10px] font-semibold uppercase tracking-wider">ALTA VENDA</span>
          <Flame className="w-3.5 h-3.5 text-orange-400" />
        </div>
        <div className="mt-1">
          <span className="text-xl font-extrabold text-orange-400 tabular-nums tracking-tight font-display">
            {dados.highSalesCount}
          </span>
          <p className="text-[9px] text-slate-400 leading-tight mt-0.5">&ge; 50 vendas</p>
        </div>
      </div>

      {/* 5. Comissão Média (Cálculo dinâmico com .reduce) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-indigo-400">
          <span className="text-[10px] font-semibold uppercase tracking-wider">COMISSÃO</span>
          <Percent className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div className="mt-1">
          <span className="text-xl font-extrabold text-indigo-300 tabular-nums tracking-tight font-display">
            {dados.avgCommissionFormatted}
          </span>
          <p className="text-[9px] text-slate-400 leading-tight mt-0.5">média estimada</p>
        </div>
      </div>

      {/* 6. Estoque Disponível (Soma total com .reduce) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-teal-400">
          <span className="text-[10px] font-semibold uppercase tracking-wider">ESTOQUE</span>
          <Package className="w-3.5 h-3.5 text-teal-400" />
        </div>
        <div className="mt-1">
          <span className="text-xl font-extrabold text-teal-300 tabular-nums tracking-tight font-display">
            {dados.totalStockFormatted}
          </span>
          <p className="text-[9px] text-slate-400 leading-tight mt-0.5">unidades prontas</p>
        </div>
      </div>
    </div>
  );
};
