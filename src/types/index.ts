export interface SalesHistoryPoint {
  label: string; // e.g. "Dia 1", "7d", "14d", etc.
  sales: number;
}

export interface ShopeeProduct {
  id: string;
  itemId?: string;
  item_id?: string; // Shopee Open Platform raw field
  shopId?: string;
  shop_id?: string; // Shopee Open Platform raw field
  title: string;
  category: string;
  price: number;
  originalPrice?: number;
  salesCount: number;
  vendasTotais?: number; // Propriedade normalizada oficial de vendas da Shopee
  salesDisplay: string;
  monthlySales?: number; // Vendas estimadas nos últimos 30 dias
  salesHistory?: SalesHistoryPoint[] | null; // recent sales trend data if provided by API
  videoCount: number | null; // null if API doesn't provide
  videoSource?: 'shopee_video' | 'product_gallery' | 'tiktok_repost' | 'all';
  videoNotes?: string; // Observação explicativa sobre vídeos (ex: se são da galeria do vendedor ou Shopee Vídeo)
  stock: number | null; // null if API doesn't provide
  stockStatus?: 'alta_disponibilidade' | 'estoque_seguro' | 'repondo' | 'alerta_baixo';
  stockTurnoverDays?: number; // Dias estimados de cobertura de estoque
  commissionRate: number | null; // e.g. 12 = 12%
  commissionValue: number | null; // calculated estimate in R$
  rating: number | null;
  ratingCount: number | null;
  affiliateCount: number | null; // null if API doesn't provide
  productUrl: string;
  product_url?: string; // Shopee Open Platform raw field
  affiliateUrl: string;
  affiliate_link?: string; // Shopee Open Platform raw field
  imageUrl: string;
  opportunityScore: number;
  isGoldMine: boolean;
  badgeLabel: '0 VÍDEOS • MINA DE OURO' | 'POUCOS VÍDEOS • OPORTUNIDADE' | 'ALTA DEMANDA' | null;
  reasons: string[];
  isMock: boolean;
  lastUpdated: string;
  recordedAt?: string; // Timestamp de quando o produto foi marcado como Vídeo Gravado
  availableFields: {
    sales: boolean;
    salesHistory: boolean;
    videos: boolean;
    stock: boolean;
    commission: boolean;
    affiliates: boolean;
    rating: boolean;
  };
}

export interface ScanFilters {
  keyword: string;
  category: string;
  minSales: number;
  minPrice?: number | null; // null = sem limite mínimo
  maxPrice: number | null; // null = sem limite máximo
  minStock: number | null;
  maxVideos: number | null; // null = all, 0 = 0 videos, 1, 3, etc.
  minCommission: number | null;
  maxAffiliates: number | null;
  onlyAffiliateEligible: boolean;
  limit: number;
}

export interface OpportunityWeights {
  salesWeight: number; // default: 35
  stockWeight: number; // default: 15
  videoWeight: number; // default: 30
  affiliateWeight: number; // default: 10
  commissionWeight: number; // default: 7
  priceWeight: number; // default: 3
}

export interface ApiConfig {
  appId: string;
  secretMasked: string;
  isConfigured: boolean;
  isExpired: boolean;
  apiMode: 'mock' | 'real';
  environment: 'BR' | 'GLOBAL';
  lastAuthDate: string | null;
  expiresAt: string | null;
  endpointUrl: string;
  connectionStatus?: 'connected' | 'error' | 'testing' | 'offline' | 'mock';
  lastErrorMessage?: string | null;
  lastCheckedAt?: string | null;
  autoFallbackEnabled?: boolean;
}

export interface ScanHistoryItem {
  id: string;
  timestamp: string;
  formattedDate: string;
  category: string;
  keyword: string;
  totalScanned: number;
  opportunitiesFound: number;
  goldMineCount: number;
  zeroVideosCount: number;
  topProducts: ShopeeProduct[];
}

export interface DashboardStats {
  totalFound: number;
  goldMineCount: number;
  zeroVideosCount: number;
  highSalesCount: number;
  avgCommission: number | null;
  totalStockAvailable: number | null;
  avgCommissionFormatted?: string;
  totalStockFormatted?: string;
}
