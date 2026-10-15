import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  X,
  ExternalLink,
  Copy,
  Share2,
  Heart,
  Check,
  Star,
  Package,
  VideoOff,
  Flame,
  Percent,
  Users,
  ShieldCheck,
  Clock,
  Sparkles,
  TrendingUp,
  Info,
  AlertCircle,
  Video,
  Clapperboard,
} from 'lucide-react';
import { ShopeeProduct, SalesHistoryPoint, OpportunityWeights } from '../types';
import { formatCurrencyBR, formatNumberBR } from '../services/opportunityEngine';
import { getValidProductUrl } from '../services/apiClient';
import { calcularScore } from './ProductCard';

interface ProductDetailModalProps {
  product: ShopeeProduct | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (product: ShopeeProduct) => void;
  weights?: OpportunityWeights;
  onMarkAsRecorded?: (product: ShopeeProduct) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  isFavorite,
  onToggleFavorite,
  weights,
  onMarkAsRecorded,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [linkError, setLinkError] = useState(false);

  if (!product) return null;

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

  const handleCopyTitle = () => {
    copyTitleToClipboard();
  };

  const handleCopyLink = () => {
    const link = targetUrl;
    if (!link) {
      setLinkError(true);
      setTimeout(() => setLinkError(false), 3000);
      return;
    }
    try {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setLinkError(true);
      setTimeout(() => setLinkError(false), 3000);
    }
  };

  const handleShare = async () => {
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
        // Handled
      }
    } else {
      handleCopyLink();
    }
  };

  const handleOpenShopee = (e?: React.MouseEvent) => {
    copyTitleToClipboard();

    if (!targetUrl) {
      if (e) e.preventDefault();
      setLinkError(true);
      setTimeout(() => setLinkError(false), 3000);
    }
  };

  const isZeroVideos = product.videoCount === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-50 duration-200">
      {/* Modal Surface */}
      <div
        className="w-full sm:max-w-lg max-h-[90vh] bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab bar affordance for mobile */}
        <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto my-2.5 sm:hidden" />

        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {product.category}
            </span>
            {product.isGoldMine && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded-full">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                MINA DE OURO
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggleFavorite(product)}
              className={`p-2 rounded-xl transition-colors ${
                isFavorite
                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
              aria-label={isFavorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Top Info: Image + Title + Score */}
          <div className="flex gap-4 items-start">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700/70 shrink-0 relative">
              {!imgError ? (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-orange-400 font-bold text-sm">
                  Shopee
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-white leading-snug">
                {product.title}
              </h2>
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  onClick={handleCopyTitle}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700 transition-colors"
                  title="Copiar nome do produto"
                >
                  {copiedTitle ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Nome Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Copiar Nome Exato</span>
                    </>
                  )}
                </button>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                {(() => {
                  const displayPrice = Number(
                    (product as any).price_min ??
                    (product as any).priceMin ??
                    (product as any).discount_price ??
                    (product as any).min_spend ??
                    product.price ??
                    0
                  );
                  const origPrice = product.originalPrice && product.originalPrice > displayPrice ? product.originalPrice : undefined;

                  return (
                    <>
                      <span className="text-xl font-extrabold text-orange-400 tabular-nums">
                        {formatCurrencyBR(displayPrice)}
                      </span>
                      {origPrice && (
                        <span className="text-xs text-slate-500 line-through tabular-nums">
                          {formatCurrencyBR(origPrice)}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
              {product.commissionValue && (
                <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                  Ganho estimado: ~{formatCurrencyBR(product.commissionValue)} / venda
                </p>
              )}
            </div>
          </div>

          {/* Opportunity Score Spotlight Banner */}
          {(() => {
            const dynamicScore = calcularScore(product, weights);
            return (
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Índice de Oportunidade
                  </span>
                  <div className="text-2xl font-extrabold text-white font-display flex items-baseline gap-2">
                    <span>{dynamicScore}</span>
                    <span className="text-xs font-normal text-slate-400">/ 99 pts</span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">
                    {dynamicScore >= 80
                      ? 'Altíssimo potencial de retorno para criação de Shopee Vídeo'
                      : dynamicScore >= 60
                      ? 'Boa oportunidade de inserção com público comprador ativo'
                      : 'Oportunidade moderada'}
                  </p>
                </div>

                {/* Score Ring */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600/20 to-emerald-600/20 border border-emerald-500/30 flex flex-col items-center justify-center shrink-0">
                  <span className="text-lg font-extrabold text-emerald-400 tabular-nums font-display leading-none">
                    {dynamicScore}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-300 uppercase mt-0.5">
                    SCORE
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Key Metrics Grid */}
          {(() => {
            // 1. Mapeamento de Vendas: prioriza vendas históricas totais (historical_sold)
            const rawSales = (product as any).historical_sold ?? (product as any).historicalSold ?? product.salesCount ?? (product as any).sales ?? (product as any).sold_count;
            const displaySales = rawSales !== undefined && rawSales !== null && !isNaN(Number(rawSales))
              ? (Number(rawSales) >= 1000 ? `${(Number(rawSales) / 1000).toFixed(1)} mil` : String(rawSales))
              : (product.salesDisplay || 'N/D');

            const rawVideos = (product as any).videoCount ?? product.videoCount;
            const displayVideos = rawVideos !== undefined && rawVideos !== null && !isNaN(Number(rawVideos))
              ? String(rawVideos)
              : 'N/D';

            const rawStock = (product as any).stock ?? (product as any).normalStock ?? product.stock;
            const displayStock = rawStock !== undefined && rawStock !== null && !isNaN(Number(rawStock))
              ? formatNumberBR(Number(rawStock))
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
              ? String(rawAffiliates)
              : 'N/D';

            const rawRating = (product as any).item_rating ?? (product as any).ratingStar ?? product.rating;
            const displayRating = rawRating !== undefined && rawRating !== null && !isNaN(Number(rawRating))
              ? `${Number(rawRating).toFixed(1)} ★`
              : 'N/D';

            return (
              <div className="grid grid-cols-3 gap-2 text-center">
                {/* Vendas */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] font-bold uppercase">VENDAS</span>
                  </div>
                  <span className="text-sm font-extrabold text-white tabular-nums">
                    {displaySales}
                  </span>
                </div>

                {/* Vídeos */}
                <div
                  className={`border rounded-xl p-2.5 ${
                    isZeroVideos
                      ? 'bg-emerald-950/40 border-emerald-500/40'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <VideoOff className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase">VÍDEOS</span>
                  </div>
                  <span
                    className={`text-sm font-extrabold tabular-nums ${
                      isZeroVideos ? 'text-emerald-400 font-black' : 'text-white'
                    }`}
                  >
                    {displayVideos}
                  </span>
                </div>

                {/* Estoque */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <Package className="w-3 h-3 text-teal-400" />
                    <span className="text-[10px] font-bold uppercase">ESTOQUE</span>
                  </div>
                  <span className="text-sm font-extrabold text-white tabular-nums">
                    {displayStock}
                  </span>
                </div>

                {/* Comissão */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <Percent className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] font-bold uppercase">COMISSÃO</span>
                  </div>
                  <span className="text-sm font-extrabold text-indigo-300 tabular-nums">
                    {displayCommission}
                  </span>
                </div>

                {/* Afiliados Concorrentes */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-bold uppercase">AFILIADOS</span>
                  </div>
                  <span className="text-sm font-extrabold text-white tabular-nums">
                    {displayAffiliates}
                  </span>
                </div>

                {/* Avaliação */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-[10px] font-bold uppercase">NOTA</span>
                  </div>
                  <span className="text-sm font-extrabold text-amber-400 tabular-nums">
                    {displayRating}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Vendas x Estoque: Análise Específica deste Produto */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Auditoria de Vendas x Estoque
                </span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-950/70 border border-teal-500/40 text-teal-300">
                {product.stockStatus === 'alta_disponibilidade'
                  ? 'Alta Disponibilidade'
                  : product.stockStatus === 'alerta_baixo'
                  ? 'Alerta: Estoque Baixo'
                  : 'Estoque Saudável'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Vendas no Último Mês (30d)
                </span>
                <span className="text-sm font-bold text-white tabular-nums mt-0.5 block">
                  {product.monthlySales ? `~${formatNumberBR(product.monthlySales)} pedidos` : product.salesDisplay}
                </span>
                <span className="text-[10px] text-slate-500">
                  Total acumulado: {product.salesDisplay}
                </span>
              </div>

              <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Cobertura de Estoque
                </span>
                <span className="text-sm font-bold text-teal-300 tabular-nums mt-0.5 block">
                  {product.stockTurnoverDays ? `~${product.stockTurnoverDays} dias de giro` : 'Pronta-entrega'}
                </span>
                <span className="text-[10px] text-slate-500">
                  Estoque: {product.stock !== null ? `${formatNumberBR(product.stock)} un.` : 'N/D'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80">
              <strong className="text-white">Diagnóstico do Produto: </strong>
              Com uma média de{' '}
              <span className="text-orange-400 font-semibold">
                {product.monthlySales ? Math.round(product.monthlySales / 30) : 10} vendas/dia
              </span>{' '}
              e estoque de{' '}
              <span className="text-teal-400 font-semibold">
                {product.stock !== null ? formatNumberBR(product.stock) : 'disponível'} unidades
              </span>
              , este fornecedor tem sustentação logística para aguentar campanhas virais de criadores sem risco imediato de pausar o anúncio por falta de estoque.
            </p>
          </div>

          {/* Esclarecimento Específico de Vídeos (Shopee Vídeo vs Vídeo de Galeria) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isZeroVideos ? (
                  <VideoOff className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Video className="w-4 h-4 text-orange-400" />
                )}
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Auditoria de Vídeos e Divulgação
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isZeroVideos
                    ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                {product.videoCount === 0
                  ? '0 Vídeos no Shopee Vídeo'
                  : `${product.videoCount} Vídeo(s) no Feed`}
              </span>
            </div>

            {product.videoNotes ? (
              <div className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                <div className="flex items-start gap-1.5 text-amber-400 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Por que o anúncio pode ter vídeo e aqui marca {product.videoCount}?</span>
                </div>
                <p className="text-slate-300 pl-5">
                  {product.videoNotes}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Este indicador audita exclusivamente criadores de conteúdo e afiliados no feed vertical{' '}
                <strong className="text-white">Shopee Vídeo</strong>. Vídeos cadastrados pelo próprio vendedor como fotos do anúncio não contam como concorrência de afiliados.
              </p>
            )}
          </div>

          {/* Recent Sales Trend Line Chart (Direct Recharts Integration) */}
          {product.salesHistory && product.salesHistory.length > 0 ? (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Histórico Recente de Vendas
                  </span>
                </div>
                {(() => {
                  const pts = product.salesHistory;
                  const first = pts[0]?.sales ?? 0;
                  const last = pts[pts.length - 1]?.sales ?? 0;
                  const diff = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
                  const isUp = diff >= 0;
                  return (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isUp
                          ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                          : 'bg-orange-950/70 border-orange-500/40 text-orange-300'
                      }`}
                    >
                      {isUp ? `+${diff}% últimos 7 dias` : `${diff}%`}
                    </span>
                  );
                })()}
              </div>

              <p className="text-[11px] text-slate-400">
                Toque nos pontos para visualizar as vendas diárias estimadas:
              </p>

              <div className="h-32 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={product.salesHistory}
                    margin={{ top: 8, right: 10, left: -22, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="detailSalesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.45} />
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
                            <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-2.5 shadow-2xl text-xs backdrop-blur-md">
                              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                {pt.label}
                              </div>
                              <div className="font-extrabold text-orange-400 text-sm tabular-nums mt-0.5">
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
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#detailSalesGrad)"
                      dot={{ r: 3, fill: '#ea580c', strokeWidth: 0 }}
                      activeDot={{
                        r: 5,
                        fill: '#fff',
                        stroke: '#f97316',
                        strokeWidth: 2.5,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-1">
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
                A API da Shopee para este produto não disponibilizou histórico diário de vendas. Volume acumulado: {product.salesDisplay}.
              </p>
            </div>
          )}

          {/* Section: "Por que este produto apareceu?" (Section 14 & 31) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Por que este produto apareceu?</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Cálculo objetivo baseado estritamente nos dados retornados pela Shopee:
            </p>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {product.reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section: Identificadores e Destino do Link Único */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-orange-400" />
                <span>Identificadores e Link Único</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                LINK DIRETO VÁLIDO
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Item ID</span>
                <span className="font-mono font-semibold text-slate-200 selection:bg-orange-500/30">
                  {product.itemId || product.item_id || 'N/D'}
                </span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Shop ID</span>
                <span className="font-mono font-semibold text-slate-200 selection:bg-orange-500/30">
                  {product.shopId || product.shop_id || 'N/D'}
                </span>
              </div>
            </div>
            {targetUrl && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">URL de Destino Exclusiva:</span>
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs font-mono text-orange-400 hover:text-orange-300 underline break-all bg-slate-900/90 p-2.5 rounded-xl border border-slate-800"
                >
                  {targetUrl}
                </a>
              </div>
            )}
          </div>

          {/* Timestamp and Mock Notice */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{product.lastUpdated}</span>
            </div>
            {product.isMock && (
              <span className="text-amber-400 font-medium">
                DEMONSTRAÇÃO — DADOS SIMULADOS
              </span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 space-y-2">
          {linkError && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-500/50 rounded-xl flex items-center gap-2 text-xs text-rose-300 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Link específico do produto não disponível.</span>
            </div>
          )}

          {/* Main Direct Button to Shopee */}
          {targetUrl ? (
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenShopee}
              className="w-full min-h-[48px] bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-sm tracking-wide rounded-xl shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform uppercase no-underline cursor-pointer"
              title="Abrir página única do produto na Shopee"
            >
              <ExternalLink className="w-4 h-4" />
              <span>ACESSAR PRODUTO NA SHOPEE</span>
            </a>
          ) : (
            <button
              onClick={handleOpenShopee}
              className="w-full min-h-[48px] bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-sm tracking-wide rounded-xl shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform uppercase"
            >
              <ExternalLink className="w-4 h-4" />
              <span>ACESSAR PRODUTO NA SHOPEE</span>
            </button>
          )}

          {/* Secondary Buttons Row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyLink}
              className="min-h-[42px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Link Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPIAR LINK</span>
                </>
              )}
            </button>

            <button
              onClick={handleShare}
              className="min-h-[42px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>COMPARTILHAR</span>
            </button>
          </div>

          {/* Marcar como Gravado */}
          {onMarkAsRecorded && (
            <button
              type="button"
              onClick={() => {
                onMarkAsRecorded(product);
                onClose();
              }}
              className="w-full min-h-[40px] bg-slate-950/80 hover:bg-emerald-950/70 border border-slate-800 hover:border-emerald-500/60 text-slate-300 hover:text-emerald-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Clapperboard className="w-4 h-4 text-emerald-400" />
              <span>Marcar como Gravado (Mover para o Histórico)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
