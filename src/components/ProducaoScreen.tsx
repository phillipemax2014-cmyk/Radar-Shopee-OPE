import React from 'react';
import {
  Clapperboard,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  Package,
  Percent,
  Star,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { ShopeeProduct } from '../types';
import { formatCurrencyBR, formatNumberBR } from '../services/opportunityEngine';
import { getValidProductUrl, getVideosGravados } from '../services/apiClient';

interface ProducaoScreenProps {
  recordedProducts?: ShopeeProduct[];
  onUnmarkRecorded: (productIdOrItemId: string) => void;
  onOpenDetails: (product: ShopeeProduct) => void;
  onNavigateToRadar?: () => void;
}

export const ProducaoScreen: React.FC<ProducaoScreenProps> = ({
  recordedProducts,
  onUnmarkRecorded,
  onOpenDetails,
  onNavigateToRadar,
}) => {
  // Lê do prop ou diretamente do storage como garantia de persistência reativa
  const productsList = recordedProducts ?? getVideosGravados();

  return (
    <div className="space-y-4 pb-24 text-slate-200">
      {/* Header Exclusivo da Aba de Produção */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
            <Clapperboard className="w-5 h-5 text-emerald-400" />
            <span>Vídeos Gravados (Produção)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Produtos já produzidos e ocultados da tela do Radar
          </p>
        </div>
        {productsList.length > 0 && (
          <span className="text-xs font-bold bg-emerald-950 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-full font-mono">
            {productsList.length} {productsList.length === 1 ? 'vídeo' : 'vídeos'}
          </span>
        )}
      </div>

      {/* Lista de Produtos ou Empty State */}
      {productsList.length === 0 ? (
        <div className="py-14 text-center space-y-3 px-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <Clapperboard className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">
            Nenhum vídeo marcado como gravado
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            No Radar de Oportunidades, clique no botão <strong>"Marcar como Gravado"</strong> em qualquer produto para enviá-lo para esta lista de produção e ocultá-lo da busca principal.
          </p>
          {onNavigateToRadar && (
            <button
              onClick={onNavigateToRadar}
              className="mt-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-md shadow-orange-600/20 transition-transform active:scale-95"
            >
              <span>Ir para o Radar de Oportunidades</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 text-xs text-slate-400">
            <span>
              {productsList.length} {productsList.length === 1 ? 'produto gravado' : 'produtos gravados'}
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
            </span>
          </div>

          {productsList.map((product, index) => {
            const targetUrl = getValidProductUrl(product);
            const itemId = String(product.item_id || product.itemId || product.id || `prod-${index}`);
            const recordedDate = product.recordedAt
              ? new Date(product.recordedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null;

            const displayPrice = Number(
              (product as any).price_min ??
              (product as any).priceMin ??
              product.price ??
              (product as any).discount_price ??
              0
            );

            const rawSales = (product as any).historical_sold ?? (product as any).sold_count ?? product.salesCount;
            const displaySales = rawSales !== undefined && rawSales !== null ? formatNumberBR(Number(rawSales)) : 'N/D';

            const rawComm = product.commissionRate ?? (product as any).commission_rate ?? (product as any).sellerCommissionRate;
            const displayComm = rawComm !== undefined && rawComm !== null ? `${rawComm}%` : 'N/D';

            return (
              <article
                key={itemId}
                onClick={() => onOpenDetails(product)}
                className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-3.5 space-y-3 transition-all cursor-pointer shadow-lg hover:shadow-emerald-950/20"
              >
                {/* Top Row: Imagem + Detalhes */}
                <div className="flex gap-3">
                  {/* Thumbnail com badge gravado */}
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-700">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                    <div className="absolute top-1 left-1 bg-emerald-600 text-white p-0.5 rounded-full shadow">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                  </div>

                  {/* Informações Centrais */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] uppercase font-bold text-orange-400 bg-orange-950/40 border border-orange-800/40 px-1.5 py-0.5 rounded">
                        {product.category}
                      </span>
                      {recordedDate && (
                        <span className="text-[10px] text-slate-400">
                          Gravado em {recordedDate}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-semibold text-white line-clamp-2 leading-snug">
                      {product.title}
                    </h4>

                    {/* Preço e Vendas */}
                    <div className="flex items-center gap-3 pt-0.5">
                      <span className="text-sm font-bold text-white font-mono">
                        {formatCurrencyBR(displayPrice)}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <Flame className="w-3 h-3 text-orange-400" />
                        {displaySales} vendas
                      </span>
                    </div>
                  </div>
                </div>

                {/* Métricas Rápidas: Comissão, Vídeos, Nota */}
                <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-950/80 rounded-xl text-center text-[11px] border border-slate-800/60">
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                      COMISSÃO
                    </span>
                    <span className="font-extrabold text-emerald-400 tabular-nums flex items-center justify-center gap-0.5">
                      <Percent className="w-2.5 h-2.5" />
                      {displayComm}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                      VÍDEOS
                    </span>
                    <span className="font-extrabold text-white tabular-nums flex items-center justify-center gap-0.5">
                      <Clapperboard className="w-2.5 h-2.5 text-slate-400" />
                      {product.videoCount ?? 0}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                      AVALIAÇÃO
                    </span>
                    <span className="font-extrabold text-amber-400 tabular-nums flex items-center justify-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-400" />
                      {product.rating ? Number(product.rating).toFixed(1) : '4.8'}
                    </span>
                  </div>
                </div>

                {/* Ações: Desmarcar/Voltar ao Radar + Ver na Shopee */}
                <div className="pt-1 flex items-center gap-2 border-t border-slate-800/80">
                  {/* Desmarcar / Voltar ao Radar */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnmarkRecorded(itemId);
                    }}
                    className="flex-1 min-h-[38px] bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700/60 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98]"
                    title="Desmarcar vídeo gravado e retornar este produto para o Radar"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Voltar ao Radar</span>
                  </button>

                  {/* Abrir na Shopee */}
                  {targetUrl && (
                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 min-h-[38px] bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors active:scale-95 no-underline"
                      title="Abrir página oficial do produto na Shopee"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Shopee</span>
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
