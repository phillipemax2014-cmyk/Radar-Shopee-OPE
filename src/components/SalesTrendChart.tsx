import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { SalesHistoryPoint } from '../types';
import { formatNumberBR } from '../services/opportunityEngine';

interface SalesTrendChartProps {
  data?: SalesHistoryPoint[] | null;
  totalSalesDisplay: string;
}

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({
  data,
  totalSalesDisplay,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-300 uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
            <span>Histórico Recente de Vendas</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
            NÃO DISPONÍVEL NA API
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          A API da Shopee para este item não disponibilizou dados temporais de vendas diárias. O volume acumulado é de {totalSalesDisplay} vendas.
        </p>
      </div>
    );
  }

  // Calculate percentage growth between first and last data points
  const firstVal = data[0].sales;
  const lastVal = data[data.length - 1].sales;
  const diffPercent = firstVal > 0 ? Math.round(((lastVal - firstVal) / firstVal) * 100) : 0;
  const isUp = diffPercent >= 0;

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2">
      {/* Chart Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className={`w-3.5 h-3.5 ${isUp ? 'text-emerald-400' : 'text-orange-400'}`} />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Histórico Recente de Vendas
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isUp
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                : 'bg-orange-950/70 border-orange-500/40 text-orange-300'
            }`}
          >
            {isUp ? `+${diffPercent}% últimos 7 dias` : `${diffPercent}%`}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-slate-400">
        Estimativa diária fornecida pela API de Afiliados (últimos 7 dias)
      </p>

      {/* Mini Line / Area Chart */}
      <div className="h-28 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 8, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 9 }}
              tickFormatter={(v: number) => formatNumberBR(v)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as SalesHistoryPoint;
                  return (
                    <div className="bg-slate-900 border border-slate-700/80 rounded-lg p-2 shadow-xl text-xs">
                      <div className="text-slate-400 text-[10px]">{pt.label}</div>
                      <div className="font-extrabold text-orange-400 tabular-nums">
                        {formatNumberBR(pt.sales)} vendas
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="#f97316"
              strokeWidth={2.2}
              fillOpacity={1}
              fill="url(#salesGrad)"
              dot={{ r: 2.5, fill: '#ea580c', strokeWidth: 0 }}
              activeDot={{ r: 4.5, fill: '#ffedd5', stroke: '#f97316', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
