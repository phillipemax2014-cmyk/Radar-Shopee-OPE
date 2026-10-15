import { ShopeeProduct, OpportunityWeights } from '../types';

export const DEFAULT_WEIGHTS: OpportunityWeights = {
  salesWeight: 35,
  stockWeight: 15,
  videoWeight: 30,
  affiliateWeight: 10,
  commissionWeight: 7,
  priceWeight: 3,
};

/**
 * Calculates Opportunity Score (0 to 100) based strictly on available data.
 * Adheres to the specified priority hierarchy:
 * 1. Sales Volume
 * 2. Available Stock
 * 3. Video Count (Critical factor: 0 videos = max boost)
 * 4. Affiliate Competition
 * 5. Commission Rate
 * 6. Commercial Price
 */
export function calculateOpportunityScore(
  product: Partial<ShopeeProduct>,
  weights: OpportunityWeights = DEFAULT_WEIGHTS
): {
  score: number;
  isGoldMine: boolean;
  badgeLabel: '0 VÍDEOS • MINA DE OURO' | 'POUCOS VÍDEOS • OPORTUNIDADE' | 'ALTA DEMANDA' | null;
  reasons: string[];
} {
  const reasons: string[] = [];
  let totalScore = 0;
  let activeWeightTotal = 0;

  // 1. VOLUME DE VENDAS (Weight: ~35)
  if (product.salesCount !== undefined && product.salesCount !== null) {
    activeWeightTotal += weights.salesWeight;
    const sales = product.salesCount;
    let salesScoreRatio = 0;

    if (sales >= 30000) {
      salesScoreRatio = 1.0;
      reasons.push(`${formatNumberBR(sales)} vendas — volume de alta demanda nacional`);
    } else if (sales >= 10000) {
      salesScoreRatio = 0.9;
      reasons.push(`${formatNumberBR(sales)} vendas — alta tração de compra`);
    } else if (sales >= 5000) {
      salesScoreRatio = 0.8;
      reasons.push(`${formatNumberBR(sales)} vendas confirmadas`);
    } else if (sales >= 1500) {
      salesScoreRatio = 0.65;
      reasons.push(`${formatNumberBR(sales)} vendas comprovadas`);
    } else if (sales >= 500) {
      salesScoreRatio = 0.45;
      reasons.push(`${formatNumberBR(sales)} vendas iniciais`);
    } else if (sales > 0) {
      salesScoreRatio = 0.25;
      reasons.push(`${formatNumberBR(sales)} vendas`);
    } else {
      salesScoreRatio = 0.05;
      reasons.push('Vendas ainda baixas no marketplace');
    }

    totalScore += salesScoreRatio * weights.salesWeight;
  }

  // 2. ESTOQUE DISPONÍVEL (Weight: ~15)
  if (product.stock !== undefined && product.stock !== null) {
    activeWeightTotal += weights.stockWeight;
    const stock = product.stock;
    let stockScoreRatio = 0;

    if (stock >= 1000) {
      stockScoreRatio = 1.0;
      reasons.push(`Estoque robusto (${formatNumberBR(stock)} un.) pronto para atender pedidos`);
    } else if (stock >= 300) {
      stockScoreRatio = 0.85;
      reasons.push(`Estoque saudável (${formatNumberBR(stock)} un.)`);
    } else if (stock >= 100) {
      stockScoreRatio = 0.6;
      reasons.push(`Estoque regular (${formatNumberBR(stock)} un.)`);
    } else if (stock >= 20) {
      stockScoreRatio = 0.3;
      reasons.push(`Atenção: estoque moderado (${stock} un.)`);
    } else {
      stockScoreRatio = 0.05;
      reasons.push(`Alerta: estoque baixo (${stock} un.), risco de esgotar`);
    }

    totalScore += stockScoreRatio * weights.stockWeight;
  }

  // 3. QUANTIDADE DE VÍDEOS (Fator Crítico - Weight: ~30)
  if (product.videoCount !== undefined && product.videoCount !== null) {
    activeWeightTotal += weights.videoWeight;
    const videos = product.videoCount;
    let videoScoreRatio = 0;

    if (videos === 0) {
      videoScoreRatio = 1.0;
      reasons.push('0 vídeos na Shopee — oportunidade máxima de pioneirismo');
    } else if (videos <= 2) {
      videoScoreRatio = 0.75;
      reasons.push(`Apenas ${videos} ${videos === 1 ? 'vídeo' : 'vídeos'} existente(s) — concorrência de vídeo muito baixa`);
    } else if (videos <= 5) {
      videoScoreRatio = 0.45;
      reasons.push(`${videos} vídeos existentes — concorrência de conteúdo média`);
    } else if (videos <= 15) {
      videoScoreRatio = 0.2;
      reasons.push(`${videos} vídeos já criados — espaço reduzido`);
    } else {
      videoScoreRatio = 0.05;
      reasons.push(`${videos} vídeos — nicho com alta saturação de criadores`);
    }

    totalScore += videoScoreRatio * weights.videoWeight;
  }

  // 4. CONCORRÊNCIA DE AFILIADOS (Weight: ~10)
  if (product.affiliateCount !== undefined && product.affiliateCount !== null) {
    activeWeightTotal += weights.affiliateWeight;
    const affs = product.affiliateCount;
    let affScoreRatio = 0;

    if (affs <= 3) {
      affScoreRatio = 1.0;
      reasons.push(`Baixíssima concorrência: apenas ${affs} afiliados divulgando`);
    } else if (affs <= 10) {
      affScoreRatio = 0.75;
      reasons.push(`Concorrência moderada (${affs} afiliados)`);
    } else if (affs <= 30) {
      affScoreRatio = 0.4;
      reasons.push(`${affs} afiliados já divulgando`);
    } else {
      affScoreRatio = 0.15;
      reasons.push(`Mercado concorrido (${affs} afiliados)`);
    }

    totalScore += affScoreRatio * weights.affiliateWeight;
  }

  // 5. COMISSÃO DE AFILIADO (Weight: ~7)
  if (product.commissionRate !== undefined && product.commissionRate !== null) {
    activeWeightTotal += weights.commissionWeight;
    const comm = product.commissionRate;
    let commScoreRatio = 0;

    if (comm >= 15) {
      commScoreRatio = 1.0;
      reasons.push(`Comissão excelente de ${comm}% por venda`);
    } else if (comm >= 10) {
      commScoreRatio = 0.8;
      reasons.push(`Comissão atrativa de ${comm}%`);
    } else if (comm >= 6) {
      commScoreRatio = 0.55;
      reasons.push(`Comissão de ${comm}%`);
    } else {
      commScoreRatio = 0.25;
      reasons.push(`Comissão padrão de ${comm}%`);
    }

    totalScore += commScoreRatio * weights.commissionWeight;
  }

  // 6. PREÇO COMERCIAL EQUILIBRADO (Weight: ~3)
  if (product.price !== undefined && product.price !== null) {
    activeWeightTotal += weights.priceWeight;
    const price = product.price;
    let priceScoreRatio = 0;

    // Ideal range for impulsive video buy: R$ 25 to R$ 130
    if (price >= 25 && price <= 130) {
      priceScoreRatio = 1.0;
      reasons.push(`Faixa de preço ideal (R$ ${price.toFixed(2)}) para conversão rápida em vídeo`);
    } else if (price < 25) {
      priceScoreRatio = 0.7; // Very accessible, but smaller commission in R$
      reasons.push(`Preço baixo e acessível (R$ ${price.toFixed(2)})`);
    } else if (price <= 250) {
      priceScoreRatio = 0.65; // Good ticket, but needs stronger pitch
      reasons.push(`Ticket intermediário (R$ ${price.toFixed(2)}) com comissão nominal maior`);
    } else {
      priceScoreRatio = 0.4; // High ticket
      reasons.push(`Ticket alto (R$ ${price.toFixed(2)})`);
    }

    totalScore += priceScoreRatio * weights.priceWeight;
  }

  // Normalize final score to 0 - 100 based on available active weights
  let finalScore = 50;
  if (activeWeightTotal > 0) {
    const rawNormalized = (totalScore / activeWeightTotal) * 100;
    finalScore = Math.min(100, Math.max(0, Math.round(rawNormalized)));
  }

  // Evaluate "MINA DE OURO" and Badges
  const sales = product.salesCount ?? 0;
  const videos = product.videoCount ?? 99;
  const stock = product.stock ?? 0;
  const commission = product.commissionRate ?? 0;

  let isGoldMine = false;
  let badgeLabel: '0 VÍDEOS • MINA DE OURO' | 'POUCOS VÍDEOS • OPORTUNIDADE' | 'ALTA DEMANDA' | null = null;

  if (sales >= 2000 && videos === 0 && stock >= 100 && finalScore >= 80) {
    isGoldMine = true;
    badgeLabel = '0 VÍDEOS • MINA DE OURO';
  } else if (videos === 0 && sales >= 500) {
    isGoldMine = sales >= 5000;
    badgeLabel = isGoldMine ? '0 VÍDEOS • MINA DE OURO' : '0 VÍDEOS • MINA DE OURO';
  } else if (videos > 0 && videos <= 2 && sales >= 1000) {
    badgeLabel = 'POUCOS VÍDEOS • OPORTUNIDADE';
  } else if (sales >= 8000) {
    badgeLabel = 'ALTA DEMANDA';
  }

  return {
    score: finalScore,
    isGoldMine,
    badgeLabel,
    reasons,
  };
}

export function formatNumberBR(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi';
  }
  if (num >= 1000) {
    return (num / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
  }
  return num.toLocaleString('pt-BR');
}

export function formatCurrencyBR(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Lógica matemática de processamento dinâmico dos dados para os cards de resumo do Dashboard:
 * 1. Alta Venda: quantidade de produtos com historical_sold >= 50
 * 2. Média de Comissão: .reduce() da taxa de comissão / length formatado com 1 casa decimal e % (ou '0%')
 * 3. Estoque Total: .reduce() do estoque de todos os produtos com fallback 0
 */
export function calcularResumoDashboard(produtos: ShopeeProduct[]) {
  if (!Array.isArray(produtos) || produtos.length === 0) {
    return {
      totalFound: 0,
      goldMineCount: 0,
      zeroVideosCount: 0,
      highSalesCount: 0,
      avgCommission: 0,
      avgCommissionFormatted: '0%',
      totalStockAvailable: 0,
      totalStockFormatted: '0',
    };
  }

  // 1. Cálculo de Alta Venda (Usa exclusivamente produto.vendasTotais)
  const highSalesCount = produtos.filter((produto) => {
    const vendas = Number(produto.vendasTotais ?? produto.salesCount ?? (produto as any).sales ?? 0);
    return vendas >= 50;
  }).length;

  // 2. Cálculo de Média de Comissão (.reduce() / length)
  const somaComissoes = produtos.reduce((acumulado, produto) => {
    const rawComm = produto.commissionRate ?? (produto as any).commission_rate ?? (produto as any).sellerCommissionRate;
    let taxa = 0;
    if (rawComm !== undefined && rawComm !== null && !isNaN(Number(rawComm))) {
      taxa = Number(rawComm);
      if (taxa > 0 && taxa <= 1) {
        taxa = taxa * 100;
      }
    }
    return acumulado + taxa;
  }, 0);
  const avgCommission = somaComissoes / produtos.length;
  const avgCommissionFormatted = `${avgCommission.toFixed(1)}%`;

  // 3. Cálculo de Estoque (Soma total com .reduce() e fallback 0)
  const totalStockAvailable = produtos.reduce((acumulado, produto) => {
    const rawStock = produto.stock ?? (produto as any).normalStock ?? (produto as any).stock ?? 0;
    const qtd = !isNaN(Number(rawStock)) ? Number(rawStock) : 0;
    return acumulado + qtd;
  }, 0);
  const totalStockFormatted = formatNumberBR(totalStockAvailable);

  const zeroVideosCount = produtos.filter((p) => p.videoCount === 0).length;
  const goldMineCount = produtos.filter((p) => p.isGoldMine || p.videoCount === 0).length;

  return {
    totalFound: produtos.length,
    goldMineCount,
    zeroVideosCount,
    highSalesCount,
    avgCommission,
    avgCommissionFormatted,
    totalStockAvailable,
    totalStockFormatted,
  };
}

export { calcularScore } from '../components/ProductCard';
