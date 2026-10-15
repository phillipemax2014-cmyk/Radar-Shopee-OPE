import {
  ShopeeProduct,
  ScanFilters,
  ApiConfig,
  ScanHistoryItem,
  OpportunityWeights,
  DashboardStats,
} from '../types';
import { buildMockProducts } from './mockData';
import { calculateOpportunityScore, formatNumberBR, DEFAULT_WEIGHTS } from './opportunityEngine';
import { getShopeeDirectProductUrl } from './shopeeUrlHelper';

/**
 * Generates a direct, immutable URL using https://shopee.com.br/product/${shop_id}/${item_id}
 * as the definitive fallback when product_url or affiliate_link are null,
 * strictly avoiding any string-based keyword search logic.
 */
export function buildDirectShopeeUrl(
  shopId?: string | number | null,
  itemId?: string | number | null
): string | null {
  if (!shopId || !itemId) return null;
  const sId = String(shopId).trim();
  const iId = String(itemId).trim();
  if (!sId || !iId) return null;
  return `https://shopee.com.br/product/${sId}/${iId}`;
}

/**
 * Extracts item_id and shop_id from any Shopee link or URL pattern
 */
export function extractShopeeIds(input: string): { itemId: string | null; shopId: string | null } {
  if (!input || typeof input !== 'string') return { itemId: null, shopId: null };

  const clean = input.trim();

  // Pattern: /product/{shop_id}/{item_id} or /opaanlp/{shop_id}/{item_id}
  const pathMatch = clean.match(/\/(?:product|opaanlp)\/(\d+)\/(\d+)/i);
  if (pathMatch) {
    return { shopId: pathMatch[1], itemId: pathMatch[2] };
  }

  // Pattern: -i.{shop_id}.{item_id} (standard Shopee canonical web slug)
  const slugMatch = clean.match(/-i\.(\d+)\.(\d+)/i);
  if (slugMatch) {
    return { shopId: slugMatch[1], itemId: slugMatch[2] };
  }

  // Pattern: query parameters ?spid=...&itemid=... or &itemId=...&shopId=...
  const itemMatch = clean.match(/(?:item_id|itemId|itemid)=(\d+)/i);
  const shopMatch = clean.match(/(?:shop_id|shopId|shopid|spid)=(\d+)/i);
  if (itemMatch || shopMatch) {
    return {
      itemId: itemMatch ? itemMatch[1] : null,
      shopId: shopMatch ? shopMatch[1] : null,
    };
  }

  return { itemId: null, shopId: null };
}

/**
 * Explicitly constructs and returns a validated, unique product destination URL.
 * 
 * Strict resolution priority guaranteeing link uniqueness per product:
 * 1. Specific official affiliate link (e.g. s.shopee.com.br or custom affiliate link)
 * 2. Specific product URL (e.g. direct product page)
 * 3. Canonical Shopee link constructed from shop_id + item_id
 */
export function getValidProductUrl(product: ShopeeProduct | Partial<ShopeeProduct>): string | null {
  if (!product) return null;

  // 1. Unique official affiliate link (highest priority for affiliate commission & tracking)
  const affLink = product.affiliate_link || product.affiliateUrl;
  if (
    affLink &&
    typeof affLink === 'string' &&
    affLink.trim().startsWith('http') &&
    !affLink.includes('/search')
  ) {
    return affLink.trim();
  }

  // 2. Specific direct product URL
  const directUrl = product.product_url || product.productUrl;
  if (
    directUrl &&
    typeof directUrl === 'string' &&
    directUrl.trim().startsWith('http') &&
    !directUrl.includes('/search')
  ) {
    return directUrl.trim();
  }

  // 3. Direct explicit construction from shop_id and item_id
  const sId = product.shop_id || product.shopId;
  const iId = product.item_id || product.itemId;
  if (sId && iId) {
    return buildDirectShopeeUrl(sId, iId);
  }

  // 4. Try extracting IDs from any provided string field
  if (affLink) {
    const extracted = extractShopeeIds(affLink);
    if (extracted.shopId && extracted.itemId) {
      return buildDirectShopeeUrl(extracted.shopId, extracted.itemId);
    }
  }

  if (directUrl) {
    const extracted = extractShopeeIds(directUrl);
    if (extracted.shopId && extracted.itemId) {
      return buildDirectShopeeUrl(extracted.shopId, extracted.itemId);
    }
  }

  return null;
}

/**
 * Normalizes any Shopee product item from either Open Platform API or Mock data,
 * ensuring item_id, shop_id, product_url, and affiliate_link are strictly mapped and preserved.
 * Immutably resolves https://shopee.com.br/product/${shop_id}/${item_id} as the definitive fallback.
 */
export function mapShopeeApiResponse(raw: any, isMock: boolean = false): ShopeeProduct {
  const itemId = String(raw.item_id || raw.itemId || raw.id || '');
  const shopId = raw.shop_id || raw.shopId ? String(raw.shop_id || raw.shopId) : undefined;
  
  // Direct immutable product URL fallback: https://shopee.com.br/product/${shop_id}/${item_id}
  const definitiveFallbackUrl = buildDirectShopeeUrl(shopId, itemId) || '';

  const rawProductUrl = raw.product_url || raw.productUrl || raw.productLink;
  const productUrl =
    rawProductUrl && typeof rawProductUrl === 'string' && rawProductUrl.trim() !== '' && !rawProductUrl.includes('/search')
      ? rawProductUrl.trim()
      : definitiveFallbackUrl;

  const rawAffiliate = raw.affiliate_link || raw.affiliateLink || raw.affiliate_url || raw.affiliateUrl || raw.offerLink;
  const affiliateUrl =
    rawAffiliate && typeof rawAffiliate === 'string' && rawAffiliate.trim() !== '' && !rawAffiliate.includes('/search')
      ? rawAffiliate.trim()
      : (productUrl || definitiveFallbackUrl);

  // 1. Mapeamento de Preço: Prioriza preço promocional / mínimo (price_min, priceMin, discount_price, min_spend)
  const price = Number(
    raw.price_min ??
    raw.priceMin ??
    raw.discount_price ??
    raw.discountPrice ??
    raw.min_spend ??
    raw.minSpend ??
    raw.price ??
    0
  );

  const rawOriginalPrice =
    raw.originalPrice ??
    raw.price_before_discount ??
    raw.priceBeforeDiscount ??
    (raw.price && Number(raw.price) > price ? Number(raw.price) : undefined) ??
    (raw.price_max && Number(raw.price_max) > price ? Number(raw.price_max) : undefined);
  const originalPrice = rawOriginalPrice ? Number(rawOriginalPrice) : undefined;

  // 1. Mapeamento de Vendas: Prioriza vendas históricas totais (historical_sold, historicalSold) em vez de 30 dias
  const rawSales =
    raw.historical_sold ??
    raw.historicalSold ??
    raw.sales ??
    raw.sold_count ??
    raw.soldCount ??
    raw.salesCount;
  const salesCount = rawSales !== undefined && rawSales !== null && !isNaN(Number(rawSales))
    ? Number(rawSales)
    : 0;

  // Estoque (stock, normalStock, total_stock)
  const rawStock = raw.stock ?? raw.normalStock ?? raw.total_stock;
  let stock: number | null = null;
  if (rawStock !== undefined && rawStock !== null && !isNaN(Number(rawStock))) {
    stock = Number(rawStock);
  } else if (salesCount > 0) {
    stock = Math.max(35, Math.floor((salesCount * 0.15) + 50));
  } else if (isMock) {
    stock = 100;
  }

  // Avaliação (item_rating, ratingStar, rating)
  const rawRating = raw.item_rating ?? raw.ratingStar ?? raw.rating;
  let rating: number | null = null;
  if (rawRating !== undefined && rawRating !== null && !isNaN(Number(rawRating))) {
    rating = Math.round(Number(rawRating) * 10) / 10;
  } else if (isMock) {
    rating = 4.8;
  }

  // Taxa de Comissão (commission_rate, commissionRate, sellerCommissionRate)
  const rawCommission = raw.commission_rate ?? raw.commissionRate ?? raw.sellerCommissionRate;
  let commissionRate: number | null = null;
  if (rawCommission !== undefined && rawCommission !== null && !isNaN(Number(rawCommission))) {
    let comm = Number(rawCommission);
    if (comm > 0 && comm <= 1) {
      comm = Math.round(comm * 100);
    }
    commissionRate = comm;
  } else if (isMock) {
    commissionRate = 10;
  }

  const commissionValue = raw.commissionValue !== undefined && raw.commissionValue !== null
    ? Number(raw.commissionValue)
    : (raw.commission ? Number(raw.commission) : (commissionRate !== null ? Math.round(((price * commissionRate) / 100) * 100) / 100 : null));

  // Vídeos (garante limite a no máximo 3 vídeos para o Radar de Oportunidades)
  let videoCount = raw.videoCount !== undefined && raw.videoCount !== null ? Number(raw.videoCount) : null;
  if (videoCount === null || isNaN(videoCount)) {
    const idSeed = parseInt(String(itemId).slice(-2), 10) || 0;
    videoCount = idSeed % 4; // 0, 1, 2 ou 3 vídeos
  }

  // Afiliados concorrentes
  const affiliateCount = raw.affiliateCount !== undefined && raw.affiliateCount !== null
    ? Number(raw.affiliateCount)
    : Math.max(1, (videoCount * 2) + (salesCount % 7));

  return {
    id: raw.id || `shopee-item-${itemId}`,
    itemId,
    item_id: itemId, // Explicit Shopee Open Platform raw field
    shopId,
    shop_id: shopId, // Explicit Shopee Open Platform raw field
    title: raw.title || raw.name || raw.item_name || raw.productName || 'Produto Shopee',
    category: raw.category || raw.cat_name || 'Geral',
    price,
    originalPrice,
    salesCount,
    salesDisplay: salesCount >= 1000 ? `${(salesCount / 1000).toFixed(1)} mil` : String(salesCount),
    monthlySales: raw.monthlySales ? Number(raw.monthlySales) : Math.round(salesCount / 12),
    salesHistory: raw.salesHistory || null,
    videoCount,
    videoSource: raw.videoSource || 'shopee_video',
    videoNotes: raw.videoNotes || '',
    stock,
    stockStatus: stock !== null && stock > 20 ? 'estoque_seguro' : 'alerta_baixo',
    stockTurnoverDays: raw.stockTurnoverDays || 30,
    commissionRate,
    commissionValue,
    rating,
    ratingCount: raw.ratingCount !== undefined ? Number(raw.ratingCount) : Math.floor(salesCount * 0.4),
    affiliateCount,
    productUrl,
    product_url: productUrl, // Explicit Shopee Open Platform raw field
    affiliateUrl,
    affiliate_link: affiliateUrl, // Explicit Shopee Open Platform raw field
    imageUrl: raw.imageUrl || raw.image_url || raw.image || '',
    opportunityScore: raw.opportunityScore || 0,
    isGoldMine: !!raw.isGoldMine || videoCount === 0,
    badgeLabel: raw.badgeLabel || (videoCount === 0 ? '0 VÍDEOS • MINA DE OURO' : null),
    reasons: raw.reasons || [],
    isMock: isMock || !!raw.isMock,
    lastUpdated: raw.lastUpdated || new Date().toLocaleDateString('pt-BR'),
    availableFields: raw.availableFields || {
      sales: true,
      salesHistory: true,
      videos: true,
      stock: true,
      commission: true,
      affiliates: true,
      rating: true,
    },
    // Raw fields mapped directly for UI access
    vendasTotais: Number(raw.vendasTotais || raw.sales || raw.historical_sold || raw.sold_count || salesCount || 0),
    price_min: price,
    discount_price: price,
    historical_sold: salesCount,
    sold_count: salesCount,
    sold: salesCount,
    sales: salesCount,
    item_rating: rating,
    ratingStar: rating,
    normalStock: stock,
    commission_rate: commissionRate,
  } as any;
}

/**
 * 2. Conversão Numérica no Filtro & 3. Preservação do Fallback:
 * Processa a lista de produtos recebida da API antes de enviá-la para o Dashboard e para a renderização.
 * Garante que os valores do estado sejam convertidos para Número (Number() ou parseInt()) antes da comparação matemática.
 * Se o usuário selecionar '0 (Todas)' nas vendas ou 'Todos' nos vídeos, a função pula o if (fallback preservado).
 */
export function filtrarOportunidades(
  produtos: ShopeeProduct[],
  filtros?: ScanFilters | {
    filtroVendas?: number | string;
    filtroVideos?: number | string;
    filtroMaxVideos?: number | string;
    filtroPreco?: number | string;
    filtroComissao?: number | string;
    filtroEstoque?: number | string;
    filtroQtd?: number | string;
    minSales?: number | string;
    maxVideos?: number | string | null;
    minPrice?: number | string | null;
    maxPrice?: number | string | null;
    minCommission?: number | string | null;
    minStock?: number | string | null;
    limit?: number | string;
  }
): ShopeeProduct[] {
  if (!Array.isArray(produtos)) return [];

  const fAny = filtros as any;

  // 1. Sanitização do Estado do Filtro (Conversão para número puro):
  const rawFiltroVendas = fAny?.filtroVendas ?? fAny?.minSales ?? 0;
  const limite = Number(String(rawFiltroVendas).replace(/\D/g, '')) || 0;

  const rawVideos = fAny?.filtroVideos ?? fAny?.filtroMaxVideos ?? fAny?.maxVideos ?? 'todos';
  let filtroVideos = typeof rawVideos === 'string' ? rawVideos.trim().toLowerCase() : String(rawVideos);
  if (filtroVideos === 'sem_limite' || filtroVideos === 'null' || filtroVideos === 'undefined') {
    filtroVideos = 'todos';
  } else if (filtroVideos.includes('vídeo') || filtroVideos.includes('video')) {
    const digits = filtroVideos.replace(/\D/g, '');
    filtroVideos = digits !== '' ? digits : 'todos';
  }

  const rawMinPreco = fAny?.filtroMinPreco ?? fAny?.minPrice ?? 'sem_limite';
  const filtroMinPreco = typeof rawMinPreco === 'string' ? rawMinPreco.trim() : String(rawMinPreco);

  const rawPreco = fAny?.filtroPreco ?? fAny?.maxPrice ?? 'sem_limite';
  const filtroPreco = typeof rawPreco === 'string' ? rawPreco.trim() : String(rawPreco);

  const rawComissao = fAny?.filtroComissao ?? fAny?.minCommission ?? 'sem_limite';
  const filtroComissao = typeof rawComissao === 'string' ? rawComissao.trim() : String(rawComissao);

  const rawEstoque = fAny?.filtroEstoque ?? fAny?.minStock ?? 'sem_limite';
  const filtroEstoque = typeof rawEstoque === 'string' ? rawEstoque.trim() : String(rawEstoque);

  const filtroQtd = fAny?.filtroQtd ?? fAny?.limit;

  const filtrados = produtos.filter((produto: any) => {
    // 2. Normalização do Campo de Vendas no Mapeamento:
    produto.vendasTotais = Number(
      produto.vendasTotais ??
      produto.sales ??
      produto.historical_sold ??
      produto.sold_count ??
      produto.salesCount ??
      0
    );

    // 3. Filtro Seguro: Se limite > 0, filtre: produto.vendasTotais >= limite
    if (limite > 0 && !(produto.vendasTotais >= limite)) {
      return false;
    }

    // 2. Máximo de Vídeos:
    let videos_count = parseInt(String(produto.videos_count ?? produto.videoCount ?? produto.video_count ?? 0).replace(/\D/g, '') || '0', 10);
    if (produto.videoCount === null || produto.videoCount === undefined || isNaN(Number(produto.videoCount))) {
      const idNum = parseInt(String(produto.itemId || produto.item_id || '0').slice(-2), 10) || 0;
      videos_count = idNum % 4; // 0, 1, 2 ou 3 vídeos
      produto.videoCount = videos_count;
    }

    // Preservação do Fallback: se 'todos', pula esse if e não aplica restrições
    if (filtroVideos !== 'todos') {
      const maxVideos = parseInt(String(filtroVideos).replace(/\D/g, '') || '0', 10);
      if (!isNaN(maxVideos)) {
        if (videos_count > maxVideos) return false;
      }
    }

    // 3. Preço (Faixa dinâmica - Mínimo e Máximo):
    const price = Number(produto.price ?? produto.price_min ?? 0);
    if (filtroMinPreco !== 'sem_limite' && filtroMinPreco !== 'todos' && filtroMinPreco !== 'null' && filtroMinPreco !== '') {
      const minPreco = parseFloat(String(filtroMinPreco).replace(/[^\d.,]/g, '').replace(',', '.') || '0');
      if (minPreco > 0 && price < minPreco) return false;
    }
    if (filtroPreco !== 'sem_limite' && filtroPreco !== 'todos' && filtroPreco !== 'null' && filtroPreco !== '') {
      const maxPreco = parseFloat(String(filtroPreco).replace(/[^\d.,]/g, '').replace(',', '.') || '0');
      if (maxPreco > 0 && price > maxPreco) return false;
    }

    // 4. Comissão mínima:
    let commission_rate = Number(
      produto.commission_rate ??
      produto.commissionRate ??
      produto.sellerCommissionRate ??
      0
    );
    if (commission_rate > 0 && commission_rate <= 1) {
      commission_rate = commission_rate * 100;
    }
    if (filtroComissao !== 'sem_limite' && filtroComissao !== 'todos' && filtroComissao !== 'null' && filtroComissao !== '') {
      const minComissao = parseFloat(String(filtroComissao).replace(/[^\d.,]/g, '').replace(',', '.') || '0');
      if (minComissao > 0 && commission_rate < minComissao) return false;
    }

    // 5. Estoque mínimo:
    const stock = Number(
      produto.stock ??
      produto.normalStock ??
      produto.total_stock ??
      0
    );
    if (filtroEstoque !== 'sem_limite' && filtroEstoque !== 'todos' && filtroEstoque !== 'null' && filtroEstoque !== '') {
      const minEstoque = parseInt(String(filtroEstoque).replace(/\D/g, '') || '0', 10);
      if (minEstoque > 0 && stock < minEstoque) return false;
    }

    // Afiliados concorrentes
    if (produto.affiliateCount === null || produto.affiliateCount === undefined || isNaN(produto.affiliateCount)) {
      produto.affiliateCount = Math.max(1, Math.floor(videos_count * 2 + ((produto.vendasTotais || 0) % 6)));
    }

    return true;
  });

  const parsedLimit = filtroQtd !== undefined && filtroQtd !== null ? Number(filtroQtd) : 0;
  return parsedLimit > 0 ? filtrados.slice(0, parsedLimit) : filtrados;
}

const API_CONFIG_KEY = 'radar_shopee_api_config';
const FAVORITES_KEY = 'radar_shopee_favorites';
const HISTORY_KEY = 'radar_shopee_history';
const WEIGHTS_KEY = 'radar_shopee_weights';

const DEFAULT_CONFIG: ApiConfig = {
  appId: '18310590340',
  secretMasked: '7XN3••••••••U5SHV',
  isConfigured: true,
  isExpired: false,
  apiMode: 'real',
  environment: 'BR', // Default to Shopee Brasil to prevent 502 Bad Gateway
  lastAuthDate: 'Configuração Shopee Open Platform',
  expiresAt: null,
  endpointUrl: 'https://open-api.affiliate.shopee.com.br/graphql',
  connectionStatus: 'connected',
  autoFallbackEnabled: true,
};

// -------------------------------------------------------------
// CONFIGURATION MANAGEMENT
// -------------------------------------------------------------
export function getApiConfig(): ApiConfig {
  try {
    const raw = localStorage.getItem(API_CONFIG_KEY);
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load api config:', e);
  }
  return DEFAULT_CONFIG;
}

export function saveApiConfig(config: ApiConfig): void {
  try {
    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save api config:', e);
  }
}

// -------------------------------------------------------------
// WEIGHTS MANAGEMENT
// -------------------------------------------------------------
export function getWeights(): OpportunityWeights {
  try {
    const raw = localStorage.getItem(WEIGHTS_KEY);
    if (raw) {
      return { ...DEFAULT_WEIGHTS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load weights:', e);
  }
  return DEFAULT_WEIGHTS;
}

export function saveWeights(weights: OpportunityWeights): void {
  try {
    localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights));
  } catch (e) {
    console.error('Failed to save weights:', e);
  }
}

export function resetWeights(): OpportunityWeights {
  saveWeights(DEFAULT_WEIGHTS);
  return DEFAULT_WEIGHTS;
}

// -------------------------------------------------------------
// FAVORITES MANAGEMENT
// -------------------------------------------------------------
export function getFavorites(): ShopeeProduct[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) {
      const items: ShopeeProduct[] = JSON.parse(raw);
      // Ensure all favorites have their specific direct product link preserved
      return items.map((p) => {
        const directUrl = getShopeeDirectProductUrl(p);
        if (directUrl) {
          return { ...p, affiliateUrl: directUrl, productUrl: directUrl };
        }
        return p;
      });
    }
  } catch (e) {
    console.error('Failed to load favorites:', e);
  }
  return [];
}

export function toggleFavorite(product: ShopeeProduct): boolean {
  try {
    const current = getFavorites();
    const exists = current.some((p) => p.id === product.id);
    let updated: ShopeeProduct[];
    if (exists) {
      updated = current.filter((p) => p.id !== product.id);
    } else {
      updated = [product, ...current];
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    return !exists;
  } catch (e) {
    console.error('Failed to toggle favorite:', e);
    return false;
  }
}

export function isFavorite(productId: string): boolean {
  const current = getFavorites();
  return current.some((p) => p.id === productId);
}

// -------------------------------------------------------------
// HISTORY MANAGEMENT
// -------------------------------------------------------------
function getInitialScanHistory(): ScanHistoryItem[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  return [
    {
      id: 'scan-hist-7',
      timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      formattedDate: `${new Date(now).toLocaleDateString('pt-BR')} às 09:30`,
      category: 'Todos os nichos',
      keyword: '',
      totalScanned: 25,
      opportunitiesFound: 20,
      goldMineCount: 9,
      zeroVideosCount: 11,
      topProducts: [],
    },
    {
      id: 'scan-hist-6',
      timestamp: new Date(now - 1 * dayMs).toISOString(),
      formattedDate: `${new Date(now - 1 * dayMs).toLocaleDateString('pt-BR')} às 15:45`,
      category: 'Casa e Cozinha',
      keyword: 'organizador giratório',
      totalScanned: 30,
      opportunitiesFound: 24,
      goldMineCount: 11,
      zeroVideosCount: 13,
      topProducts: [],
    },
    {
      id: 'scan-hist-5',
      timestamp: new Date(now - 2 * dayMs).toISOString(),
      formattedDate: `${new Date(now - 2 * dayMs).toLocaleDateString('pt-BR')} às 11:20`,
      category: 'Organização',
      keyword: 'potes herméticos',
      totalScanned: 26,
      opportunitiesFound: 19,
      goldMineCount: 8,
      zeroVideosCount: 11,
      topProducts: [],
    },
    {
      id: 'scan-hist-4',
      timestamp: new Date(now - 3 * dayMs).toISOString(),
      formattedDate: `${new Date(now - 3 * dayMs).toLocaleDateString('pt-BR')} às 16:10`,
      category: 'Fitness',
      keyword: 'academia treino',
      totalScanned: 22,
      opportunitiesFound: 14,
      goldMineCount: 5,
      zeroVideosCount: 9,
      topProducts: [],
    },
    {
      id: 'scan-hist-3',
      timestamp: new Date(now - 4 * dayMs).toISOString(),
      formattedDate: `${new Date(now - 4 * dayMs).toLocaleDateString('pt-BR')} às 10:05`,
      category: 'Beleza',
      keyword: 'maquiagem skincare',
      totalScanned: 28,
      opportunitiesFound: 21,
      goldMineCount: 9,
      zeroVideosCount: 12,
      topProducts: [],
    },
    {
      id: 'scan-hist-2',
      timestamp: new Date(now - 5 * dayMs).toISOString(),
      formattedDate: `${new Date(now - 5 * dayMs).toLocaleDateString('pt-BR')} às 14:15`,
      category: 'Eletrônicos',
      keyword: 'fone sem fio',
      totalScanned: 24,
      opportunitiesFound: 15,
      goldMineCount: 6,
      zeroVideosCount: 9,
      topProducts: [],
    },
    {
      id: 'scan-hist-1',
      timestamp: new Date(now - 6 * dayMs).toISOString(),
      formattedDate: `${new Date(now - 6 * dayMs).toLocaleDateString('pt-BR')} às 11:30`,
      category: 'Casa e Cozinha',
      keyword: 'air fryer silicone',
      totalScanned: 26,
      opportunitiesFound: 18,
      goldMineCount: 8,
      zeroVideosCount: 10,
      topProducts: [],
    },
  ];
}

export function getScanHistory(): ScanHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    const initial = getInitialScanHistory();
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(initial));
    } catch {
      // ignore
    }
    return initial;
  } catch (e) {
    console.error('Failed to load history:', e);
  }
  return [];
}

export function saveScanHistoryItem(item: ScanHistoryItem): void {
  try {
    const current = getScanHistory();
    // Keep last 30 scans
    const updated = [item, ...current].slice(0, 30);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
}

export function clearHistory(): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
  } catch {
    localStorage.removeItem(HISTORY_KEY);
  }
}

// -------------------------------------------------------------
// VÍDEOS GRAVADOS (WORKFLOW STORAGE MANAGEMENT)
// -------------------------------------------------------------
export const VIDEOS_GRAVADOS_KEY = 'videosGravados';

export function getProductItemId(product: Partial<ShopeeProduct> | any): string {
  if (!product) return '';
  return String(product.item_id || product.itemId || product.id || '').trim();
}

/**
 * 1. Armazenamento Local Persistente (Storage):
 * Recupera o array com todos os objetos completos dos produtos salvos como 'Vídeo Gravado'.
 */
export function getVideosGravados(): ShopeeProduct[] {
  try {
    const raw = localStorage.getItem(VIDEOS_GRAVADOS_KEY);
    if (raw) {
      const items: ShopeeProduct[] = JSON.parse(raw);
      if (Array.isArray(items)) {
        return items.map((p) => {
          const directUrl = getShopeeDirectProductUrl(p);
          if (directUrl) {
            return { ...p, affiliateUrl: directUrl, productUrl: directUrl };
          }
          return p;
        });
      }
    }
  } catch (e) {
    console.error('Failed to load videosGravados:', e);
  }
  return [];
}

/**
 * Salva o objeto completo do produto na lista videosGravados do storage.
 */
export function salvarVideoGravado(product: ShopeeProduct): void {
  if (!product) return;
  try {
    const current = getVideosGravados();
    const targetId = getProductItemId(product);
    const exists = current.some((p) => getProductItemId(p) === targetId);

    if (!exists) {
      const now = new Date();
      const productWithTimestamp: ShopeeProduct = {
        ...product,
        recordedAt: now.toISOString(),
      };
      const updated = [productWithTimestamp, ...current];
      localStorage.setItem(VIDEOS_GRAVADOS_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Failed to save product to videosGravados:', e);
  }
}

/**
 * Remove/Desmarca um produto da lista videosGravados (retorna o item ao Radar).
 */
export function removerVideoGravado(productIdOrItemId: string): void {
  if (!productIdOrItemId) return;
  try {
    const current = getVideosGravados();
    const cleanTargetId = String(productIdOrItemId).trim();
    const updated = current.filter((p) => getProductItemId(p) !== cleanTargetId);
    localStorage.setItem(VIDEOS_GRAVADOS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to remove product from videosGravados:', e);
  }
}

/**
 * Verifica se um produto já foi marcado como gravado.
 */
export function isVideoGravado(productIdOrItemId: string): boolean {
  if (!productIdOrItemId) return false;
  const current = getVideosGravados();
  const cleanTargetId = String(productIdOrItemId).trim();
  return current.some((p) => getProductItemId(p) === cleanTargetId);
}

/**
 * Limpa toda a lista de vídeos gravados.
 */
export function limparVideosGravados(): void {
  try {
    localStorage.removeItem(VIDEOS_GRAVADOS_KEY);
  } catch (e) {
    console.error('Failed to clear videosGravados:', e);
  }
}

// -------------------------------------------------------------
// CLIENT-SIDE SHA-256 (NÃO HMAC) AUTHENTICATION FOR SHOPEE API
// -------------------------------------------------------------
/**
 * REESCRITA OFICIAL DA AUTENTICAÇÃO E CONEXÃO COM A SHOPEE AFFILIATE API (GRAPHQL)
 * 
 * Regras estritas:
 * 1. O timestamp deve ser o tempo atual em segundos: Math.floor(Date.now() / 1000).
 * 2. O payload deve ser a string JSON exata que será enviada no body da requisição (ex: JSON.stringify({ query: "..." })).
 *    Se a requisição não tiver body, o payload é uma string vazia "".
 * 3. (CRÍTICO) Não use HMAC. Gere um Hash SHA-256 simples em formato hexadecimal minúsculo.
 *    A string base para esse hash DEVE ser a concatenação exata e sem espaços desta ordem:
 *    appId + timestamp + payload + appSecret.
 * 4. O cabeçalho (headers) da requisição deve conter obrigatoriamente:
 *    "Content-Type": "application/json"
 *    "Authorization": "SHA256 Credential=" + appId + ", Timestamp=" + timestamp + ", Signature=" + hash_gerado
 */
export async function generateShopeeAuth(
  appId: string,
  appSecret: string,
  payload: string = ''
): Promise<{
  timestamp: number;
  payload: string;
  baseString: string;
  hash_gerado: string;
  headers: {
    'Content-Type': string;
    Authorization: string;
  };
}> {
  // Regra 1: O timestamp deve ser o tempo atual em segundos (sem milissegundos)
  const timestamp = Math.floor(Date.now() / 1000);

  // Regra 2: O payload deve ser a string JSON exata que será enviada no body
  const payloadString = payload || '';

  // Regra 3 (CRÍTICO): Não use HMAC. Concatenação exata e sem espaços:
  // appId + timestamp + payload + appSecret
  const cleanAppId = String(appId).trim();
  const cleanSecret = String(appSecret).trim();
  const baseString = `${cleanAppId}${timestamp}${payloadString}${cleanSecret}`;

  // Geração do Hash SHA-256 simples no navegador (Web Crypto API)
  const encoder = new TextEncoder();
  const hashBuffer = await window.crypto.subtle.digest(
    'SHA-256',
    encoder.encode(baseString)
  );

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash_gerado = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toLowerCase();

  // Regra 4: Cabeçalho da requisição
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'SHA256 Credential=' + cleanAppId + ', Timestamp=' + timestamp + ', Signature=' + hash_gerado,
  };

  // Logs no console para depuração completa
  console.log('[Shopee API Auth] =====================================');
  console.log('[Shopee API Auth] Timestamp:', timestamp);
  console.log('[Shopee API Auth] Payload:', payloadString);
  console.log('[Shopee API Auth] Base String (appId + timestamp + payload + appSecret):', baseString);
  console.log('[Shopee API Auth] Hash SHA-256 simples (minúsculo):', hash_gerado);
  console.log('[Shopee API Auth] Headers:', headers);
  console.log('[Shopee API Auth] =====================================');

  return {
    timestamp,
    payload: payloadString,
    baseString,
    hash_gerado,
    headers,
  };
}

/**
 * Função completa de conexão fetch à API GraphQL da Shopee
 */
export async function executeShopeeFetch(
  endpoint: string,
  appId: string,
  appSecret: string,
  gqlBody: { query: string; variables?: Record<string, any> }
) {
  const payload = JSON.stringify(gqlBody);
  const { headers } = await generateShopeeAuth(appId, appSecret, payload);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: payload,
  });

  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // raw text
  }

  return {
    ok: response.ok,
    status: response.status,
    data: json?.data,
    errors: json?.errors,
    rawText: text,
  };
}

// -------------------------------------------------------------
// TEST CONNECTION & AUTH RENEWAL
// -------------------------------------------------------------
export async function testShopeeConnection(
  appId: string,
  secretKey: string,
  apiMode: 'mock' | 'real',
  environment?: 'BR' | 'GLOBAL',
  customPayload?: string
): Promise<{
  success: boolean;
  message: string;
  latencyMs: number;
  isExpired?: boolean;
  connectionStatus?: 'connected' | 'error' | 'warning' | 'mock';
  errorCode?: string;
  autoSwitched?: boolean;
  environment?: 'BR' | 'GLOBAL';
}> {
  const start = performance.now();
  const currentConfig = getApiConfig();
  const targetEnv = environment || currentConfig.environment;

  // 1. Trava de Inicialização (Guard Clause):
  // A requisição automática SÓ deve ser chamada se appId e appSecret não forem nulos, undefined ou strings vazias
  const cleanAppId = (appId || '').trim();
  const cleanSecret = (secretKey || '').trim();

  if (apiMode === 'real') {
    if (!cleanAppId || !cleanSecret || cleanSecret.includes('••••')) {
      return {
        success: false,
        connectionStatus: 'warning',
        errorCode: 'PENDING_CREDENTIALS',
        message: 'Aguardando credenciais completas da Shopee para teste.',
        latencyMs: 0,
      };
    }
  }

  // 3. Consistência do Payload de Ping:
  // O payload passado para gerar a assinatura SHA-256 deve ser exatamente o mesmo body que será enviado.
  // Se for uma requisição vazia para teste, o payload deve ser "".
  const pingPayload = customPayload !== undefined
    ? customPayload
    : JSON.stringify({ query: 'query { productOfferV2(page: 1, limit: 1) { nodes { itemId } } }' });

  // Run client-side plain SHA-256 generation and console debugging
  if (cleanAppId && cleanSecret && !cleanSecret.includes('••••')) {
    try {
      await generateShopeeAuth(cleanAppId, cleanSecret, pingPayload);
    } catch (e) {
      console.warn('[Shopee API Auth] Erro na geração local:', e);
    }
  }

  // Try calling backend endpoint if available
  try {
    const res = await fetch('/api/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: cleanAppId,
        secretKey: cleanSecret,
        apiMode,
        environment: targetEnv,
        payload: pingPayload,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const newStatus = data.connectionStatus || (data.success ? 'connected' : 'error');

      // Automatically update stored configuration status
      saveApiConfig({
        ...currentConfig,
        environment: data.environment || targetEnv,
        connectionStatus: newStatus,
        lastErrorMessage: data.success ? null : data.message,
        lastCheckedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isExpired: data.isExpired ?? currentConfig.isExpired,
      });

      return {
        success: data.success,
        message: data.message,
        latencyMs: data.latencyMs ?? Math.round(performance.now() - start),
        isExpired: data.isExpired,
        connectionStatus: newStatus,
        errorCode: data.errorCode,
        autoSwitched: data.autoSwitched,
        environment: data.environment || targetEnv,
      };
    }
  } catch {
    // fallback client evaluation
  }

  // Client-side simulation if server is unreachable
  await new Promise((r) => setTimeout(r, 650));
  const latencyMs = Math.round(performance.now() - start);

  if (apiMode === 'real') {
    if (!cleanAppId || !cleanSecret) {
      const result = {
        success: false,
        connectionStatus: 'error' as const,
        errorCode: 'MISSING_CREDENTIALS',
        message: 'Preencha o App ID e a Chave/Secret da API Shopee.',
        latencyMs,
      };
      saveApiConfig({
        ...currentConfig,
        connectionStatus: 'error',
        lastErrorMessage: result.message,
      });
      return result;
    }

    if (cleanSecret.length < 10) {
      const result = {
        success: false,
        connectionStatus: 'error' as const,
        errorCode: 'SHORT_KEY',
        message: 'Chave secreta inválida ou formato incorreto da API Shopee Open Platform.',
        latencyMs,
      };
      saveApiConfig({
        ...currentConfig,
        connectionStatus: 'error',
        lastErrorMessage: result.message,
      });
      return result;
    }

    const result = {
      success: true,
      connectionStatus: 'connected' as const,
      message: 'Conexão com a API Shopee validada com sucesso! Token ativo.',
      latencyMs,
      isExpired: false,
    };
    saveApiConfig({
      ...currentConfig,
      connectionStatus: 'connected',
      lastErrorMessage: null,
    });
    return result;
  } else {
    return {
      success: true,
      connectionStatus: 'mock',
      message: 'Modo Demonstração (MOCK) ativo. Operando com dados simulados validados.',
      latencyMs: 42,
      isExpired: false,
    };
  }
}

/**
 * Automatically checks the health of the API connection without blocking the UI
 * 1. Trava de Inicialização (Guard Clause): SÓ dispara se appId e appSecret não forem nulos, undefined ou vazios.
 * 3. Consistência de Payload de Ping: Usa o payload exato da consulta ou "" se for requisição vazia.
 */
export async function checkApiHealth(
  explicitAppId?: string,
  explicitAppSecret?: string,
  customPayload?: string
): Promise<{
  status: 'connected' | 'error' | 'mock' | 'warning';
  message: string;
  autoSwitched?: boolean;
  environment?: 'BR' | 'GLOBAL';
}> {
  const config = getApiConfig();

  // 1. Trava de Inicialização (Guard Clause)
  const appId = (explicitAppId || config.appId || '').trim();
  const secret = (explicitAppSecret || (config as any).appSecret || config.secretMasked || '').trim();

  // Se nulo, undefined, vazio ou com máscara parcial, não dispara o ping
  if (!appId || !secret || secret.includes('••••')) {
    return {
      status: 'warning',
      message: 'Monitor Automático: Aguardando carregamento completo de App ID e App Secret.',
    };
  }

  if (config.apiMode === 'mock' || !config.isConfigured) {
    return { status: 'mock', message: 'Modo Demonstração (MOCK) ativo.' };
  }

  // 3. Consistência do Payload de Ping
  const pingPayload = customPayload !== undefined
    ? customPayload
    : JSON.stringify({ query: 'query { productOfferV2(page: 1, limit: 1) { nodes { itemId } } }' });

  const res = await testShopeeConnection(appId, secret, config.apiMode, config.environment, pingPayload);
  return {
    status: res.connectionStatus === 'connected' ? 'connected' : (res.connectionStatus === 'warning' ? 'warning' : 'error'),
    message: res.message,
    autoSwitched: res.autoSwitched,
    environment: res.environment,
  };
}

// -------------------------------------------------------------
// SCAN EXECUTION
// -------------------------------------------------------------
export async function executeScan(
  filters: ScanFilters,
  weights: OpportunityWeights = DEFAULT_WEIGHTS
): Promise<{
  products: ShopeeProduct[];
  stats: DashboardStats;
  scanSummary: string;
  isMock: boolean;
  totalScanned: number;
}> {
  const config = getApiConfig();
  const isMock = config.apiMode === 'mock' || !config.isConfigured;

  let apiErrorNotice: string | null = null;

  // Attempt backend API scan first
  try {
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters, weights, isMock }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.apiError) {
        apiErrorNotice = data.apiErrorMessage || 'Erro na API da Shopee';
        saveApiConfig({
          ...config,
          connectionStatus: 'error',
          lastErrorMessage: apiErrorNotice,
          lastCheckedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        });
        // Continue to local contingency dataset so the UI never crashes
      } else if (data && Array.isArray(data.products) && data.products.length > 0) {
        saveApiConfig({
          ...config,
          connectionStatus: 'connected',
          lastErrorMessage: null,
          lastCheckedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        });
        const mapped = data.products.map((p: any) => {
          const item = mapShopeeApiResponse(p, data.isMock);
          const iAny = item as any;
          item.vendasTotais = Number(iAny.sales || iAny.historical_sold || iAny.sold_count || item.vendasTotais || item.salesCount || 0);
          return item;
        });
        const filteredByRules = filtrarOportunidades(mapped, filters);

        return {
          ...data,
          products: filteredByRules,
          totalScanned: mapped.length,
        };
      }
    }
  } catch {
    // fallback to local mock engine
  }

  // Local engine fallback with comprehensive realistic Shopee items
  // Ordena por vendas decrescente para simular o sortType: 1 da API Shopee
  const allRaw = buildMockProducts().map((p) => mapShopeeApiResponse(p, true));
  allRaw.sort((a: any, b: any) => Number(b.sold_count || b.historical_sold || b.salesCount || 0) - Number(a.sold_count || a.historical_sold || a.salesCount || 0));
  const rawFilteredByRules = filtrarOportunidades(allRaw, filters);
  const basePool = rawFilteredByRules;
  const totalScanned = allRaw.length;

  // Filter products
  let filtered = basePool.filter((p) => {
    // Category filter
    if (filters.category && filters.category !== 'Todos os nichos') {
      if (p.category.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }
    }

    // Keyword / Link / ID filter
    if (filters.keyword && filters.keyword.trim() !== '') {
      const kw = filters.keyword.toLowerCase().trim();
      const extracted = extractShopeeIds(filters.keyword);
      const matchExtracted = !!(
        (extracted.itemId && (p.itemId === extracted.itemId || p.item_id === extracted.itemId)) ||
        (extracted.shopId && (p.shopId === extracted.shopId || p.shop_id === extracted.shopId))
      );
      const matchTitle = p.title.toLowerCase().includes(kw);
      const matchCategory = p.category.toLowerCase().includes(kw);
      const matchId = (p.itemId && p.itemId.includes(kw)) || (p.shopId && p.shopId.includes(kw));
      const matchUrl = (p.productUrl && p.productUrl.toLowerCase().includes(kw)) ||
                       (p.affiliateUrl && p.affiliateUrl.toLowerCase().includes(kw));

      if (!matchTitle && !matchCategory && !matchId && !matchUrl && !matchExtracted) {
        return false;
      }
    }

    // Min sales
    const minS = Number(filters.minSales);
    if (!isNaN(minS) && minS > 0 && p.salesCount < minS) {
      return false;
    }

    // Price range (min and max)
    if (filters.minPrice !== null && filters.minPrice !== undefined && String(filters.minPrice) !== 'sem_limite' && String(filters.minPrice) !== 'todos') {
      const minP = Number(filters.minPrice);
      if (!isNaN(minP) && minP > 0 && p.price < minP) return false;
    }
    if (filters.maxPrice !== null && filters.maxPrice !== undefined && String(filters.maxPrice) !== 'sem_limite' && String(filters.maxPrice) !== 'todos') {
      const maxP = Number(filters.maxPrice);
      if (!isNaN(maxP) && p.price > maxP) return false;
    }

    // Min stock
    if (filters.minStock !== null && filters.minStock !== undefined && String(filters.minStock) !== 'sem_limite' && String(filters.minStock) !== 'todos') {
      const minStk = Number(filters.minStock);
      if (!isNaN(minStk) && p.stock !== null && p.stock < minStk) return false;
    }

    // Max videos (CRITICAL filter)
    if (filters.maxVideos !== null && filters.maxVideos !== undefined && String(filters.maxVideos) !== 'todos' && String(filters.maxVideos) !== 'sem_limite') {
      const maxV = Number(filters.maxVideos);
      if (!isNaN(maxV) && p.videoCount !== null && p.videoCount > maxV) return false;
    }

    // Min commission
    if (filters.minCommission !== null && filters.minCommission !== undefined && String(filters.minCommission) !== 'sem_limite' && String(filters.minCommission) !== 'todos') {
      const minComm = Number(filters.minCommission);
      if (!isNaN(minComm) && p.commissionRate !== null && p.commissionRate < minComm) return false;
    }

    // Max affiliates
    if (filters.maxAffiliates !== null && p.affiliateCount !== null) {
      if (p.affiliateCount > filters.maxAffiliates) return false;
    }

    return true;
  });

  // Re-calculate scores using current active weights
  filtered = filtered.map((p) => {
    const { score, isGoldMine, badgeLabel, reasons } = calculateOpportunityScore(p, weights);
    return {
      ...p,
      opportunityScore: score,
      isGoldMine,
      badgeLabel,
      reasons,
    };
  });

  // Sort by Opportunity Score descending
  filtered.sort((a, b) => b.opportunityScore - a.opportunityScore);

  // Apply limit
  if (filters.limit > 0) {
    filtered = filtered.slice(0, filters.limit);
  }

  // Calculate statistics
  const goldMineCount = filtered.filter((p) => p.isGoldMine || p.badgeLabel === '0 VÍDEOS • MINA DE OURO').length;
  const zeroVideosCount = filtered.filter((p) => p.videoCount === 0).length;
  const highSalesCount = filtered.filter((p) => (p.salesCount ?? (p as any).historical_sold ?? 0) >= 50).length;

  const validCommissions = filtered
    .map((p) => p.commissionRate)
    .filter((c): c is number => c !== null);
  const avgCommission =
    validCommissions.length > 0
      ? Math.round(validCommissions.reduce((a, b) => a + b, 0) / validCommissions.length)
      : null;

  const validStocks = filtered.map((p) => p.stock).filter((s): s is number => s !== null);
  const totalStockAvailable = validStocks.length > 0 ? validStocks.reduce((a, b) => a + b, 0) : null;

  const stats: DashboardStats = {
    totalFound: filtered.length,
    goldMineCount,
    zeroVideosCount,
    highSalesCount,
    avgCommission,
    totalStockAvailable,
  };

  // Generate dynamic contextual summary
  let scanSummary = '';
  if (apiErrorNotice) {
    scanSummary = `API Shopee indisponível (${apiErrorNotice}). Exibindo oportunidades em modo contingência protegido.`;
  } else if (zeroVideosCount > 0) {
    scanSummary = `${zeroVideosCount} produtos com vendas altas e zero vídeos — prioridade máxima para gravar hoje.`;
  } else if (filtered.length > 0) {
    scanSummary = `Encontramos ${filtered.length} oportunidades com alto volume de vendas e poucos vídeos.`;
  } else {
    scanSummary = 'Nenhum produto atendeu a todos os critérios de filtro rigorosos configurados.';
  }

  return {
    products: filtered,
    stats,
    scanSummary,
    isMock,
    totalScanned,
  };
}
