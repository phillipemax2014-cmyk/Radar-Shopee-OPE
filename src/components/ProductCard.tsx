import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Share2,
  Heart,
  Check,
  Package,
  Sparkles,
  Star,
  Users,
  Percent,
  AlertCircle,
  Clapperboard,
} from 'lucide-react';
import { ShopeeProduct, OpportunityWeights } from '../types';
import { formatCurrencyBR, formatNumberBR } from '../services/opportunityEngine';
import { getValidProductUrl } from '../services/apiClient';

interface ProductCardProps {
  product: ShopeeProduct;
  isFavorite: boolean;
  onToggleFavorite: (product: ShopeeProduct) => void;
  onOpenDetails: (product: ShopeeProduct) => void;
  index?: number;
  weights?: OpportunityWeights;
  onMarkAsRecorded?: (product: ShopeeProduct) => void;
}

/**
 * 2. Refatoração da função calcularScore(produto, pesos):
 * Reescreve o algoritmo de pontuação para que a nota máxima de cada critério seja ditada pelo slider correspondente.
 * Critérios:
 * 1. Vendas: Proporcionalmente até o limite do peso definido no slider: (produto.vendas / 500) * pesos.vendas (limitado ao valor máximo de pesos.vendas)
 * 2. Vídeos: Se vídeos == 0, ganha 100% de pesos.videos. Se == 1, ganha 60%. Se == 2, ganha 20%. Se > 2, ganha 0.
 * 3. Estoque: Proporcionalmente até o teto de pesos.estoque (referência: 100 unidades).
 * 4. Concorrência: Baixa concorrência de afiliados até o teto de pesos.concorrencia (<=3: 100%, <=10: 60%, <=30: 30%, >30: 0).
 * 5. Comissão: Proporcionalmente até o teto de pesos.comissao (referência: 15% de comissão).
 * 6. Preço: Faixa ideal comercial para impulso de vídeo (R$ 20 a R$ 130 = 100% de pesos.preco; < 20 = 75%; <= 250 = 50%; > 250 = 25%).
 * A soma total deve ser o Índice do produto (limitado a 99).
 */
export function calcularScore(produto: any, pesos?: OpportunityWeights | any): number {
  if (!produto) return 0;

  // Resolução dinâmica dos pesos configurados nos sliders (suporta formato OpportunityWeights e aliases)
  const pesoVendas = pesos?.salesWeight ?? pesos?.vendas ?? 35;
  const pesoVideos = pesos?.videoWeight ?? pesos?.videos ?? 30;
  const pesoEstoque = pesos?.stockWeight ?? pesos?.estoque ?? 15;
  const pesoConcorrencia = pesos?.affiliateWeight ?? pesos?.concorrencia ?? pesos?.affiliates ?? 10;
  const pesoComissao = pesos?.commissionWeight ?? pesos?.comissao ?? pesos?.commission ?? 7;
  const pesoPreco = pesos?.priceWeight ?? pesos?.preco ?? pesos?.price ?? 3;

  // 1. Vendas: Proporcional até o limite de pesoVendas: (vendas / 500) * pesoVendas
  const rawVendas = Number(
    (produto as any).historical_sold ??
    (produto as any).sold_count ??
    produto.salesCount ??
    (produto as any).sales ??
    0
  );
  const vendas = !isNaN(rawVendas) ? Math.max(0, rawVendas) : 0;
  const scoreVendas = Math.min((vendas / 500) * pesoVendas, pesoVendas);

  // 2. Vídeos: 0 vídeos = 100%; 1 vídeo = 60%; 2 vídeos = 20%; > 2 vídeos = 0
  const rawVideos = produto.videoCount !== undefined && produto.videoCount !== null
    ? Number(produto.videoCount)
    : Number((produto as any).videos ?? 0);
  const videos = !isNaN(rawVideos) ? Math.max(0, rawVideos) : 0;
  let scoreVideos = 0;
  if (videos === 0) {
    scoreVideos = pesoVideos * 1.0;
  } else if (videos === 1) {
    scoreVideos = pesoVideos * 0.6;
  } else if (videos === 2) {
    scoreVideos = pesoVideos * 0.2;
  } else {
    scoreVideos = 0;
  }

  // 3. Estoque: Proporcional até o teto de pesoEstoque (100 unidades de referência)
  const rawEstoque = Number(
    produto.stock ??
    (produto as any).normalStock ??
    (produto as any).stock ??
    0
  );
  const estoque = !isNaN(rawEstoque) ? Math.max(0, rawEstoque) : 0;
  const scoreEstoque = Math.min((estoque / 100) * pesoEstoque, pesoEstoque);

  // 4. Concorrência: Baixa concorrência de afiliados até o teto de pesoConcorrencia
  const rawAfiliados = produto.affiliateCount !== undefined && produto.affiliateCount !== null
    ? Number(produto.affiliateCount)
    : Number((produto as any).affiliates ?? (produto as any).affiliate_count ?? 1);
  const afiliados = !isNaN(rawAfiliados) ? Math.max(0, rawAfiliados) : 1;
  let scoreConcorrencia = 0;
  if (afiliados <= 3) {
    scoreConcorrencia = pesoConcorrencia * 1.0;
  } else if (afiliados <= 10) {
    scoreConcorrencia = pesoConcorrencia * 0.6;
  } else if (afiliados <= 30) {
    scoreConcorrencia = pesoConcorrencia * 0.3;
  } else {
    scoreConcorrencia = 0;
  }

  // 5. Comissão: Proporcional até o teto de pesoComissao (15% de referência)
  const rawComm = produto.commissionRate ?? (produto as any).commission_rate ?? (produto as any).sellerCommissionRate ?? 0;
  let taxaComissao = Number(rawComm);
  if (!isNaN(taxaComissao)) {
    if (taxaComissao > 0 && taxaComissao <= 1) {
      taxaComissao = taxaComissao * 100;
    }
  } else {
    taxaComissao = 0;
  }
  const scoreComissao = Math.min((Math.max(0, taxaComissao) / 15) * pesoComissao, pesoComissao);

  // 6. Preço Comercial: Faixa ideal para conversão por impulso em vídeo (R$ 20 a R$ 130)
  const rawPreco = Number(
    (produto as any).price_min ??
    (produto as any).priceMin ??
    produto.price ??
    (produto as any).discount_price ??
    0
  );
  const preco = !isNaN(rawPreco) ? Math.max(0, rawPreco) : 0;
  let scorePreco = 0;
  if (preco >= 20 && preco <= 130) {
    scorePreco = pesoPreco * 1.0;
  } else if (preco < 20 && preco > 0) {
    scorePreco = pesoPreco * 0.75;
  } else if (preco <= 250) {
    scorePreco = pesoPreco * 0.5;
  } else {
    scorePreco = pesoPreco * 0.25;
  }

  // Soma total de todos os 6 critérios limitada a 99
  const somaTotal = scoreVendas + scoreVideos + scoreEstoque + scoreConcorrencia + scoreComissao + scorePreco;
  return Math.min(Math.round(somaTotal), 99);
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFavorite,
  onToggleFavorite,
  onOpenDetails,
  index,
  weights,
  onMarkAsRecorded,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [linkError, setLinkError] = useState(false);

  const targetUrl = getValidProductUrl(product);

  const copyTitleToClipboard = () => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(product.title);
        setCopiedTitle(true);
        setTimeout(() => setCopiedTitle(false), 2000);
      }
    } catch {
      // non-blocking
    }
  };

  const handleCopyTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyTitleToClipboard();
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = targetUrl;
    if (!link) {
      setLinkError(true);
      setTimeout(() => setLinkError(false), 3000);
      return;
    }
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      setLinkError(true);
      setTimeout(() => setLinkError(false), 3000);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = targetUrl;
    if (!link) {
      setLinkError(true);
      setTimeout(() => setLinkError(false), 3000);
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Oportunidade Shopee Vídeo: ${product.title} (${product.salesDisplay} vendas, ${product.videoCount ?? 0} vídeos)`,
          url: link,
        });
      } catch {
        // User cancelled or unsupported
      }
    } else {
      handleCopyLink(e);
    }
  };

  const handleOpenShopee = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyTitleToClipboard();

    if (!targetUrl) {
      e.preventDefault();
      setLinkError(true);
      setTimeout(() => setLinkError(false), 3000);
      return;
    }
  };

  // 1. Algoritmo de Assertividade Dinâmico com Pesos (Score de Vídeo 0 a 99)
  const score = calcularScore(product, weights);
  let ringColor = '#10b981';
  if (score >= 85) {
    ringColor = '#f59e0b'; // Dourado / Âmbar para altíssimo potencial
  } else if (score >= 70) {
    ringColor = '#10b981'; // Esmeralda para alto potencial
  } else if (score >= 50) {
    ringColor = '#06b6d4'; // Ciano para potencial moderado
  } else {
    ringColor = '#64748b'; // Slate
  }

  // Progresso do círculo (proporcional ao score de 0 a 99)
  const gaugePercent = Math.min(100, Math.max(10, score));

  const isZeroVideos = product.videoCount === 0;

  return (
    <article
      onClick={() => onOpenDetails(product)}
      className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-orange-950/10 space-y-3 relative overflow-hidden active:scale-[0.99]"
    >
      {/* Top Header: Score Circular Indicator + Category + Favorite */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Circular Score Gauge */}
          <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="transparent"
                stroke="#1e293b"
                strokeWidth="3.5"
              />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="transparent"
                stroke={ringColor}
                strokeWidth="3.5"
                strokeDasharray="113.1"
                strokeDashoffset={113.1 - (113.1 * gaugePercent) / 100}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-extrabold text-white leading-none font-display tabular-nums">
                {calcularScore(product, weights)}
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                SCORE
              </span>
            </div>
          </div>

          {/* Category & Badge */}
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {product.category}
            </div>

            {/* Opportunity Tag */}
            {product.badgeLabel && (
              <div
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  product.isGoldMine
                    ? 'bg-gradient-to-r from-amber-500/20 to-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : isZeroVideos
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                    : 'bg-orange-950/60 text-orange-300 border border-orange-500/30'
                }`}
              >
                {product.isGoldMine && <Sparkles className="w-3 h-3 text-amber-400" />}
                <span>{product.badgeLabel}</span>
              </div>
            )}
          </div>
        </div>

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product);
          }}
          className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-colors active:scale-90 ${
            isFavorite
              ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
              : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
          }`}
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
        </button>
      </div>

      {/* Product Image & Title Row */}
      <div className="flex gap-3">
        {/* Thumbnail with Fallback */}
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/60 shrink-0 relative">
          {!imgError ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-orange-400 font-display font-bold text-xs p-1 text-center">
              Shopee
            </div>
          )}
        </div>

        {/* Product Title */}
        <div className="flex-1 min-w-0">
          {targetUrl ? (
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                copyTitleToClipboard();
              }}
              className="text-sm font-semibold text-white leading-snug line-clamp-2 hover:text-orange-400 transition-colors block cursor-pointer"
              title="Abrir página única do produto na Shopee"
            >
              {product.title}
            </a>
          ) : (
            <h2 className="text-sm font-semibold text-white leading-snug line-clamp-2 hover:text-orange-400 transition-colors">
              {product.title}
            </h2>
          )}
          <div className="mt-1 flex items-center justify-between gap-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-extrabold text-orange-400 tabular-nums">
                {formatCurrencyBR(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-[11px] text-slate-500 line-through tabular-nums">
                  {formatCurrencyBR(product.originalPrice)}
                </span>
              )}
            </div>
            <button
              onClick={handleCopyTitle}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 transition-colors border border-slate-700/60"
              title="Copiar nome do produto"
            >
              {copiedTitle ? (
                <>
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-2.5 h-2.5 text-slate-400" />
                  <span>Nome</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 4 Main Metrics Grid (Vendas, Vídeos, Preço, Nota) */}
      {(() => {
        // Direct property binding with fallback to 'N/D' if undefined or null
        // 1. Mapeamento de Vendas: prioriza vendas históricas totais (historical_sold) em vez de sold_count
        const rawSales = (product as any).historical_sold ?? (product as any).historicalSold ?? product.salesCount ?? (product as any).sales ?? (product as any).sold_count;
        const displaySales = rawSales !== undefined && rawSales !== null && !isNaN(Number(rawSales))
          ? (Number(rawSales) >= 1000 ? `${(Number(rawSales) / 1000).toFixed(1)} mil` : String(rawSales))
          : (product.salesDisplay || 'N/D');

        // 1. Mapeamento de Preço: prioriza preço promocional / mínimo (price_min, priceMin, discount_price)
        const displayPrice = Number(
          (product as any).price_min ??
          (product as any).priceMin ??
          (product as any).discount_price ??
          (product as any).discountPrice ??
          (product as any).min_spend ??
          product.price ??
          0
        );

        const rawVideos = (product as any).videoCount ?? product.videoCount;
        const displayVideos = rawVideos !== undefined && rawVideos !== null && !isNaN(Number(rawVideos))
          ? (rawVideos === 0 ? '0 feed' : `${rawVideos} feed`)
          : 'N/D';

        const rawRating = (product as any).item_rating ?? (product as any).ratingStar ?? product.rating;
        const displayRating = rawRating !== undefined && rawRating !== null && !isNaN(Number(rawRating))
          ? Number(rawRating).toFixed(1)
          : 'N/D';

        const rawStock = (product as any).stock ?? (product as any).normalStock ?? product.stock;
        const displayStock = rawStock !== undefined && rawStock !== null && !isNaN(Number(rawStock))
          ? `${formatNumberBR(Number(rawStock))} un.`
          : 'N/D';

        const rawComm = (product as any).commission_rate ?? product.commissionRate ?? (product as any).sellerCommissionRate;
        let normalizedComm: number | null = null;
        if (rawComm !== undefined && rawComm !== null && !isNaN(Number(rawComm))) {
          let c = Number(rawComm);
          if (c > 0 && c <= 1) {
            c = Math.round(c * 100);
          }
          normalizedComm = c;
        }
        const displayCommission = normalizedComm !== null
          ? `${normalizedComm}%`
          : 'N/D';

        const rawAffiliates = (product as any).affiliateCount ?? product.affiliateCount;
        const displayAffiliates = rawAffiliates !== undefined && rawAffiliates !== null && !isNaN(Number(rawAffiliates))
          ? `${rawAffiliates} afil.`
          : 'N/D';

        return (
          <>
            <div className="grid grid-cols-4 gap-1.5 p-2 bg-slate-950/80 border border-slate-800/90 rounded-xl text-center">
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                  VENDAS
                </span>
                <span className="text-xs font-extrabold text-white tabular-nums">
                  {displaySales}
                </span>
              </div>

              <div className={isZeroVideos ? 'bg-emerald-950/40 rounded-lg p-0.5 border border-emerald-500/30' : ''} title="Vídeos de afiliados no Shopee Vídeo (exclui vídeo de galeria do vendedor)">
                <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                  VÍDEOS
                </span>
                <span
                  className={`text-xs font-extrabold tabular-nums ${
                    isZeroVideos ? 'text-emerald-400' : 'text-slate-200'
                  }`}
                >
                  {displayVideos}
                </span>
              </div>

              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                  PREÇO
                </span>
                <span className="text-xs font-bold text-slate-200 tabular-nums">
                  {formatCurrencyBR(displayPrice || product.price)}
                </span>
              </div>

              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                  NOTA
                </span>
                <span className="text-xs font-bold text-amber-400 flex items-center justify-center gap-0.5 tabular-nums">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 inline" />
                  {displayRating}
                </span>
              </div>
            </div>

            {/* Optional Indicators (Estoque, Comissão, Afiliados) */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5">
              <div className="flex items-center gap-1" title="Estoque atual e cobertura de giro">
                <Package className="w-3 h-3 text-teal-500" />
                <span className="text-teal-300">
                  {displayStock !== 'N/D'
                    ? `${displayStock}${product.stockTurnoverDays ? ` (~${product.stockTurnoverDays}d)` : ''}`
                    : 'N/D'}
                </span>
              </div>

              <div className="flex items-center gap-1" title="Comissão de Afiliado">
                <Percent className="w-3 h-3 text-indigo-400" />
                <span className="text-indigo-300 font-medium">
                  {displayCommission !== 'N/D'
                    ? `${displayCommission} ${product.commissionValue ? `(${formatCurrencyBR(product.commissionValue)})` : ''}`
                    : 'N/D'}
                </span>
              </div>

              <div className="flex items-center gap-1" title="Afiliados concorrentes divulgando">
                <Users className="w-3 h-3 text-slate-500" />
                <span>
                  {displayAffiliates}
                </span>
              </div>
            </div>
          </>
        );
      })()}

      {/* Action Buttons Row */}
      <div className="pt-2 flex flex-col gap-2 border-t border-slate-800/80">
        {linkError && (
          <div className="p-2 bg-rose-950/80 border border-rose-500/50 rounded-lg flex items-center gap-1.5 text-[11px] text-rose-300 animate-in fade-in duration-150">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            <span>Link específico do produto não disponível.</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {/* Main CTA: Ver Produto na Shopee */}
          {targetUrl ? (
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenShopee}
              className="flex-1 min-h-[42px] bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/20 active:scale-[0.98] transition-transform no-underline cursor-pointer"
              title="Abrir link único do produto na Shopee"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>VER PRODUTO</span>
            </a>
          ) : (
            <button
              onClick={handleOpenShopee}
              className="flex-1 min-h-[42px] bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/20 active:scale-[0.98] transition-transform"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>VER PRODUTO</span>
            </button>
          )}

          {/* Copiar Link */}
          <button
            onClick={handleCopyLink}
            className="min-h-[42px] px-3.5 bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors active:scale-95"
            title="Copiar link"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-[11px]">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copiar</span>
              </>
            )}
          </button>

          {/* Compartilhar */}
          <button
            onClick={handleShare}
            className="min-h-[42px] px-3 bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center transition-colors active:scale-95"
            aria-label="Compartilhar produto"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2. Botão de Ação: Marcar como Gravado (salva no storage videosGravados e remove do Radar) */}
        {onMarkAsRecorded && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRecorded(product);
            }}
            className="w-full min-h-[38px] bg-slate-950/80 hover:bg-emerald-950/70 border border-slate-800 hover:border-emerald-500/60 text-slate-300 hover:text-emerald-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] group"
            title="Marcar produto como Vídeo Gravado e mover para a aba Histórico"
          >
            <Clapperboard className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Marcar como Gravado</span>
          </button>
        )}
      </div>
    </article>
  );
};
