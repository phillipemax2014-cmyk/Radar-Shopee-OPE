import React from 'react';
import { VideoOff, Sparkles } from 'lucide-react';

interface QuickVideoFilterProps {
  isZeroVideosOnly: boolean;
  onToggle: () => void;
  zeroCount: number;
}

export const QuickVideoFilter: React.FC<QuickVideoFilterProps> = ({
  isZeroVideosOnly,
  onToggle,
  zeroCount,
}) => {
  return (
    <div className="my-2.5">
      <button
        onClick={onToggle}
        className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all active:scale-[0.99] ${
          isZeroVideosOnly
            ? 'bg-gradient-to-r from-emerald-950/80 to-slate-900 border-emerald-500 shadow-md shadow-emerald-500/15'
            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-2.5 text-left">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isZeroVideosOnly
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-emerald-400'
            }`}
          >
            <VideoOff className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-tight">
                Top Oportunidades no Shopee Vídeo
              </span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </div>
            <p className="text-[11px] text-slate-400">
              Vendas altas e 0 vídeos de afiliados no feed Shopee Vídeo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isZeroVideosOnly
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {zeroCount} disp.
          </span>
          <div
            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
              isZeroVideosOnly
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-slate-600 bg-transparent'
            }`}
          >
            {isZeroVideosOnly && (
              <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
            )}
          </div>
        </div>
      </button>
    </div>
  );
};
