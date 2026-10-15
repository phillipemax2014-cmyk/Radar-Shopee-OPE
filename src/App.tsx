import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Flame,
  AlertCircle,
  AlertTriangle,
  VideoOff,
  Search,
} from 'lucide-react';
import {
  ShopeeProduct,
  ScanFilters,
  ApiConfig,
  OpportunityWeights,
  DashboardStats as StatsType,
  ScanHistoryItem,
} from './types';
import {
  getApiConfig,
  saveApiConfig,
  checkApiHealth,
  testShopeeConnection,
  getWeights,
  saveWeights,
  resetWeights,
  getFavorites,
  toggleFavorite,
  getScanHistory,
  saveScanHistoryItem,
  clearHistory,
  executeScan,
  getVideosGravados,
  salvarVideoGravado,
  removerVideoGravado,
} from './services/apiClient';
import { calcularResumoDashboard } from './services/opportunityEngine';
import { Header } from './components/Header';
import { DashboardStats } from './components/DashboardStats';
import { FilterBar } from './components/FilterBar';
import { QuickVideoFilter } from './components/QuickVideoFilter';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { ProductCard, calcularScore } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { HistoryTab } from './components/HistoryTab';
import { ProducaoScreen } from './components/ProducaoScreen';
import { FavoritesTab } from './components/FavoritesTab';
import { SettingsTab } from './components/SettingsTab';
import { BottomNav, NavTab } from './components/BottomNav';
import { ZeroVideosAlertBanner } from './components/ZeroVideosAlertBanner';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import {
  processZeroVideosNotification,
  getStoredAlerts,
  getPushPermissionStatus,
  requestPushPermission,
  getNotificationPreferences,
  saveNotificationPreferences,
} from './services/notificationService';
import { Bell } from 'lucide-react';

export default function App() {
  // App navigation state
  const [activeTab, setActiveTab] = useState<NavTab>('radar');

  // Config & weights state
  const [apiConfig, setApiConfig] = useState<ApiConfig>(getApiConfig());
  const [weights, setWeights] = useState<OpportunityWeights>(getWeights());

  // Products & Scan State
  // 1. Separação de Estados (Original vs Filtrado):
  // produtosOriginais: Recebe os dados puros diretamente do Fetch da API. (NUNCA é alterado pelos filtros).
  // produtosExibicao: A lista que será efetivamente renderizada no HTML/JSX.
  const [produtosOriginais, setProdutosOriginais] = useState<ShopeeProduct[]>([]);
  const [produtosExibicao, setProdutosExibicao] = useState<ShopeeProduct[]>([]);

  // Nicho atualmente selecionado pelo usuário
  const [selectedNicho, setSelectedNicho] = useState<string>('Todos os nichos');
  const [stats, setStats] = useState<StatsType>({
    totalFound: 0,
    goldMineCount: 0,
    zeroVideosCount: 0,
    highSalesCount: 0,
    avgCommission: null,
    totalStockAvailable: null,
  });
  const [scanSummary, setScanSummary] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<ShopeeProduct | null>(null);

  // Favorites & History state
  const [favorites, setFavorites] = useState<ShopeeProduct[]>(getFavorites());
  const [history, setHistory] = useState<ScanHistoryItem[]>(getScanHistory());
  // 1. Armazenamento Local Persistente (Storage videosGravados)
  const [videosGravados, setVideosGravados] = useState<ShopeeProduct[]>(getVideosGravados());

  // Filters state
  const [filters, setFilters] = useState<ScanFilters>({
    keyword: '',
    category: 'Todos os nichos',
    minSales: 0,
    minPrice: null,
    maxPrice: null,
    minStock: null,
    maxVideos: null,
    minCommission: null,
    maxAffiliates: null,
    onlyAffiliateEligible: true,
    limit: 20,
  });

  // Zero Videos Alert & Notification System State
  const [activeZeroVideosAlert, setActiveZeroVideosAlert] = useState<{
    products: ShopeeProduct[];
    count: number;
  } | null>(null);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(() => {
    return getStoredAlerts().filter((a) => !a.read).length;
  });
  const [pushStatus, setPushStatus] = useState(getPushPermissionStatus());
  const [showPushPrompt, setShowPushPrompt] = useState(() => {
    const prefs = getNotificationPreferences();
    return getPushPermissionStatus() === 'default' && !prefs.bannerDismissedPrompt;
  });

  // Execute Scan - Preenche os produtosOriginais com dados puros da API
  const handleRunScan = useCallback(
    async (customFilters?: ScanFilters) => {
      setIsScanning(true);
      const activeFilters = customFilters || filters;

      try {
        const result = await executeScan(activeFilters, weights);
        const rawProducts = Array.isArray(result?.products) ? result.products : [];

        // 1. produtosOriginais recebe os dados puros diretamente do Fetch da API (NUNCA sobrescrito por filtros)
        setProdutosOriginais(rawProducts);
        setScanSummary(result?.scanSummary || '');

        // Detecta produtos com ZERO VÍDEOS e aciona o sistema de notificações (Push + Alerta Visual + Som)
        const recordedIdSet = new Set(
          videosGravados.map((p) => String(p.item_id || p.itemId || p.id || '').trim())
        );

        const zeroVideoProducts = rawProducts.filter((p: any) => {
          const vCount = Number(p.videoCount ?? p.videos_count ?? 0);
          const pid = String(p.item_id || p.itemId || p.id || '').trim();
          return vCount === 0 && !recordedIdSet.has(pid);
        });

        if (zeroVideoProducts.length > 0) {
          // Processa notificação (Push no navegador se permitido, som via Web Audio API e histórico)
          processZeroVideosNotification(zeroVideoProducts, activeFilters.category, () => {
            setFilters((prev) => ({ ...prev, maxVideos: 0 }));
            setActiveTab('radar');
            setActiveZeroVideosAlert(null);
          });

          // Dispara alerta visual em banner destacado
          setActiveZeroVideosAlert({
            products: zeroVideoProducts,
            count: zeroVideoProducts.length,
          });

          // Atualiza contador do sino no Header
          setUnreadAlertsCount(getStoredAlerts().filter((a) => !a.read).length);
        }

        // Update apiConfig in case connection status was updated
        setApiConfig(getApiConfig());
      } catch (err) {
        console.error('Scan error:', err);
      } finally {
        setIsScanning(false);
      }
    },
    [filters, weights, videosGravados]
  );

  // 2. Efeito de Filtragem (Derived State):
  // "Escuta" as mudanças nos filtros e em produtosOriginais.
  // Sempre que um filtro mudar, pega nos produtosOriginais, aplica o .filter() e injeta o resultado em produtosExibicao.
  useEffect(() => {
    if (!Array.isArray(produtosOriginais) || produtosOriginais.length === 0) {
      setProdutosExibicao([]);
      setStats(calcularResumoDashboard([]));
      return;
    }

    const recordedIdSet = new Set(
      videosGravados.map((p) => String(p.item_id || p.itemId || p.id || '').trim())
    );

    const filtroVendas = filters.minSales;
    const limite = Number(String(filtroVendas).replace(/\D/g, '')) || 0;

    const filtrados = produtosOriginais.filter((produto: any) => {
      // 2. Normalização do Campo de Vendas no Mapeamento:
      produto.vendasTotais = Number(
        produto.vendasTotais ??
        produto.sales ??
        produto.historical_sold ??
        produto.sold_count ??
        0
      );

      // 3. Filtro Seguro: Se limite > 0, filtre: produto.vendasTotais >= limite
      if (limite > 0 && !(produto.vendasTotais >= limite)) {
        return false;
      }

      // Ocultar produtos que já tiveram vídeo gravado
      const pid = String(produto.item_id || produto.itemId || produto.id || '').trim();
      if (recordedIdSet.has(pid)) {
        return false;
      }

      // Filtro de nicho / categoria
      if (filters.category && filters.category !== 'Todos os nichos') {
        if (produto.category?.toLowerCase() !== filters.category.toLowerCase()) {
          return false;
        }
      }

      // Filtro de palavra-chave / link / ID
      if (filters.keyword && filters.keyword.trim() !== '') {
        const kw = filters.keyword.toLowerCase().trim();
        const matchTitle = (produto.title || '').toLowerCase().includes(kw);
        const matchCat = (produto.category || '').toLowerCase().includes(kw);
        const matchId = (produto.itemId || '').includes(kw) || (produto.shopId || '').includes(kw);
        if (!matchTitle && !matchCat && !matchId) {
          return false;
        }
      }

      // Filtro de Máximo de Vídeos
      if (filters.maxVideos !== null && filters.maxVideos !== undefined && String(filters.maxVideos) !== 'todos') {
        const vCount = Number(produto.videoCount ?? produto.videos_count ?? 0);
        if (vCount > Number(filters.maxVideos)) {
          return false;
        }
      }

      // Filtro de Faixa de Preço (Mínimo e Máximo Dinâmicos)
      const preco = Number(produto.price ?? produto.price_min ?? 0);
      if (filters.minPrice !== null && filters.minPrice !== undefined && String(filters.minPrice) !== 'sem_limite') {
        const minP = Number(filters.minPrice);
        if (!isNaN(minP) && minP > 0 && preco < minP) {
          return false;
        }
      }
      if (filters.maxPrice !== null && filters.maxPrice !== undefined && String(filters.maxPrice) !== 'sem_limite') {
        const maxP = Number(filters.maxPrice);
        if (!isNaN(maxP) && preco > maxP) {
          return false;
        }
      }

      // Filtro de Estoque Mínimo
      if (filters.minStock !== null && filters.minStock !== undefined && String(filters.minStock) !== 'sem_limite') {
        const estoque = Number(produto.stock ?? produto.normalStock ?? 0);
        if (estoque < Number(filters.minStock)) {
          return false;
        }
      }

      // Filtro de Comissão Mínima
      if (filters.minCommission !== null && filters.minCommission !== undefined && String(filters.minCommission) !== 'sem_limite') {
        let comissao = Number(produto.commissionRate ?? produto.commission_rate ?? 0);
        if (comissao > 0 && comissao <= 1) comissao *= 100;
        if (comissao < Number(filters.minCommission)) {
          return false;
        }
      }

      return true;
    });

    // Reordenação dinâmica com Opportunity Score
    const ordenados = [...filtrados].sort((a, b) => {
      const scoreB = calcularScore(b, weights);
      const scoreA = calcularScore(a, weights);
      return scoreB - scoreA;
    });

    const safeStats: StatsType = calcularResumoDashboard(ordenados);
    setProdutosExibicao(ordenados);
    setStats(safeStats);
  }, [produtosOriginais, filters, weights, videosGravados]);

  // Initial scan on mount (busca inicial de produtos)
  useEffect(() => {
    handleRunScan();
  }, [handleRunScan]);

  // Monitor Automático de Conexão com Trava de Inicialização (Handshake)
  const appId = apiConfig?.appId?.trim();
  const appSecret = ((apiConfig as any)?.appSecret || apiConfig?.secretMasked || '').trim();

  const handleAutoConnect = useCallback(async () => {
    // Guard clause rigorosa: se com máscara parcial '••••', não dispara o ping
    if (!appId || !appSecret || appSecret.includes('••••')) {
      return;
    }

    // Se estiver em modo mock ou não configurado, não dispara ping na API real
    if (apiConfig.apiMode !== 'real' || !apiConfig.isConfigured) {
      return;
    }

    const pingGql = { query: 'query { productOfferV2(page: 1, limit: 1) { nodes { itemId } } }' };
    const pingPayload = JSON.stringify(pingGql);

    try {
      await checkApiHealth(appId, appSecret, pingPayload);
      setApiConfig(getApiConfig());
    } catch (err) {
      console.warn('[Monitor Automático] Ping cancelado ou pendente:', err);
    }
  }, [appId, appSecret, apiConfig.apiMode, apiConfig.isConfigured]);

  useEffect(() => {
    // Só executa o handshake se ambas as credenciais já existirem no estado
    if (appId && appSecret) {
      handleAutoConnect();
    }
  }, [appId, appSecret, handleAutoConnect]);

  // Handle Favorites
  const handleToggleFavorite = (prod: ShopeeProduct) => {
    toggleFavorite(prod);
    setFavorites(getFavorites());
  };

  // Toggle Quick 0 Videos Filter
  const isZeroVideosOnly = filters.maxVideos === 0;
  const handleToggleZeroVideos = () => {
    const updated: ScanFilters = {
      ...filters,
      maxVideos: isZeroVideosOnly ? null : 0,
    };
    setFilters(updated);
    handleRunScan(updated);
  };

  // Quick category / nicho select
  const handleSelectCategory = (cat: string) => {
    setSelectedNicho(cat);
    const updated: ScanFilters = {
      ...filters,
      category: cat,
    };
    setFilters(updated);
    handleRunScan(updated);
  };

  // Restore history scan
  const handleRestoreScan = (item: ScanHistoryItem) => {
    const updated: ScanFilters = {
      ...filters,
      category: item.category,
      keyword: item.keyword,
    };
    setFilters(updated);
    setActiveTab('radar');
    handleRunScan(updated);
  };

  // Clear history
  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  // Save Config
  const handleSaveConfig = (newConfig: ApiConfig) => {
    saveApiConfig(newConfig);
    setApiConfig(newConfig);
  };

  // Save Weights
  const handleSaveWeights = (newWeights: OpportunityWeights) => {
    saveWeights(newWeights);
    setWeights(newWeights);
  };

  const handleResetWeights = () => {
    const defaultW = resetWeights();
    setWeights(defaultW);
  };

  // 2. Botão de Ação: Marcar como Gravado (Salva no storage videosGravados e remove imediatamente da tela sem refresh)
  const handleMarkAsRecorded = (prod: ShopeeProduct) => {
    salvarVideoGravado(prod);
    const updatedRecorded = getVideosGravados();
    setVideosGravados(updatedRecorded);
  };

  // 4. Desmarcar/Remover do Histórico (Permite que o item retorne ao Radar)
  const handleUnmarkRecorded = (productIdOrItemId: string) => {
    removerVideoGravado(productIdOrItemId);
    const updatedRecorded = getVideosGravados();
    setVideosGravados(updatedRecorded);
  };

  // 5. Visualizar Oportunidades com 0 Vídeos a partir do Alerta Visual/Push
  const handleViewZeroVideos = () => {
    const updated: ScanFilters = {
      ...filters,
      maxVideos: 0,
    };
    setFilters(updated);
    setActiveTab('radar');
    setActiveZeroVideosAlert(null);
  };

  const isMock = apiConfig.apiMode === 'mock' || !apiConfig.isConfigured;

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col font-sans antialiased selection:bg-orange-500/30 selection:text-white">
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col relative pb-16 border-x border-slate-900/60 shadow-2xl">
        {/* Sticky Mobile Header */}
        <Header
          apiConfig={apiConfig}
          onOpenSettings={() => setActiveTab('settings')}
          onOpenNotifications={() => setIsNotificationCenterOpen(true)}
          unreadAlertsCount={unreadAlertsCount}
          isScanning={isScanning}
        />

        {/* Expired Connection Banner if applicable */}
        {apiConfig.isExpired && (
          <div className="bg-rose-950/90 border-b border-rose-600/50 px-4 py-2.5 flex items-center justify-between text-xs text-rose-200 animate-pulse">
            <span className="font-semibold">
              Conexão com a Shopee expirada. Atualize suas credenciais para continuar.
            </span>
            <button
              onClick={() => setActiveTab('settings')}
              className="underline font-bold text-white shrink-0 ml-2"
            >
              Renovar
            </button>
          </div>
        )}

        {/* Content based on Active Tab */}
        <main className="flex-1 px-3.5 pt-2">
          {activeTab === 'radar' && (
            <div className="space-y-3">
              {/* Alerta Visual Flutuante de Produtos com ZERO VÍDEOS */}
              {activeZeroVideosAlert && (
                <ZeroVideosAlertBanner
                  products={activeZeroVideosAlert.products}
                  count={activeZeroVideosAlert.count}
                  onViewZeroVideos={handleViewZeroVideos}
                  onDismiss={() => setActiveZeroVideosAlert(null)}
                />
              )}

              {/* Push Permission Prompt Banner */}
              {showPushPrompt && !activeZeroVideosAlert && (
                <div className="bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-slate-950 border border-amber-600/40 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs animate-in fade-in">
                  <div className="flex items-center gap-2 text-slate-200 min-w-0">
                    <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate">
                      Deseja alertas push ao encontrar <strong>0 vídeos</strong>?
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <button
                      onClick={async () => {
                        const res = await requestPushPermission();
                        setPushStatus(res);
                        setShowPushPrompt(false);
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] rounded-lg transition-colors shadow-sm"
                    >
                      Ativar
                    </button>
                    <button
                      onClick={() => {
                        saveNotificationPreferences({ bannerDismissedPrompt: true });
                        setShowPushPrompt(false);
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      Depois
                    </button>
                  </div>
                </div>
              )}

              {/* Concept Hero / Subtitle */}
              <div className="py-1">
                <h2 className="text-base font-extrabold text-white tracking-tight font-display">
                  Radar de Produtos Virais
                </h2>
                <p className="text-xs text-slate-400 leading-snug mt-0.5">
                  Encontre produtos com muitas vendas e poucos (ou nenhum) vídeos na Shopee — o sótão perfeito para o seu próximo vídeo viralizar.
                </p>
              </div>

              {/* Filter and Scan Bar */}
              <FilterBar
                filters={filters}
                onChangeFilters={(newFilters) => {
                  setFilters(newFilters);
                  if (newFilters.category !== selectedNicho) {
                    setSelectedNicho(newFilters.category);
                  }
                }}
                onSelectCategory={handleSelectCategory}
                onScan={(currentFilters) => handleRunScan(currentFilters)}
                isScanning={isScanning}
                totalFound={produtosExibicao.length}
              />

              {/* Dynamic Dashboard Metrics */}
              <DashboardStats
                stats={stats}
                products={produtosExibicao}
                onFilterZeroVideos={handleToggleZeroVideos}
                onFilterGoldMine={() => {
                  setFilters({ ...filters, minSales: 5000, maxVideos: 0 });
                  handleRunScan({ ...filters, minSales: 5000, maxVideos: 0 });
                }}
              />

              {/* Quick 0 Videos Shortcut Filter */}
              <QuickVideoFilter
                isZeroVideosOnly={isZeroVideosOnly}
                onToggle={handleToggleZeroVideos}
                zeroCount={stats.zeroVideosCount}
              />

              {/* Category Breakdown (when 'Todos os nichos') */}
              {filters.category === 'Todos os nichos' && (
                <CategoryBreakdown
                  products={produtosExibicao}
                  selectedCategory={filters.category}
                  onSelectCategory={handleSelectCategory}
                />
              )}

              {/* Dynamic Summary Banner */}
              {scanSummary && (
                <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-medium">{scanSummary}</span>
                  </div>
                  <button
                    onClick={() => handleRunScan()}
                    title="Atualizar resultados agora"
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}

              {/* Automatic API Problem Indicator Banner */}
              {!isMock && (apiConfig.connectionStatus === 'error' || apiConfig.lastErrorMessage) && (
                <div className="bg-rose-950/70 border border-rose-500/60 rounded-xl p-3 text-xs text-rose-200 flex items-start gap-2.5 shadow-lg shadow-rose-950/30 animate-in fade-in duration-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <strong className="font-bold text-rose-100 flex items-center gap-1.5">
                        Problema na Conexão da API Shopee
                        <span className="text-[10px] bg-rose-900 border border-rose-700 px-1.5 py-0.5 rounded font-mono">
                          {apiConfig.lastErrorMessage?.includes('502') ? 'STATUS 502' : 'ERRO DETECTADO'}
                        </span>
                      </strong>
                    </div>
                    <p className="text-[11px] text-rose-300 mt-1 leading-relaxed">
                      {apiConfig.lastErrorMessage || 'Falha na comunicação com os servidores da Shopee.'}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setActiveTab('settings')}
                        className="bg-rose-900/80 hover:bg-rose-800 border border-rose-500/50 text-white font-semibold text-[11px] px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Abrir Ajustes da API
                      </button>
                      {apiConfig.environment === 'GLOBAL' && (
                        <button
                          onClick={async () => {
                            const newConfig = { ...apiConfig, environment: 'BR' as const };
                            handleSaveConfig(newConfig);
                            await testShopeeConnection(newConfig.appId, '', 'real', 'BR');
                            setApiConfig(getApiConfig());
                          }}
                          className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Alternar para Shopee Brasil (.com.br)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Mock Warning Banner (Rule 8) */}
              {isMock && (
                <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-2.5 text-[11px] text-amber-300 flex items-center justify-between">
                  <span>DEMONSTRAÇÃO — DADOS SIMULADOS</span>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="underline font-bold text-amber-200"
                  >
                    Configurar API Real
                  </button>
                </div>
              )}

              {/* Products List Section (Scroll List com Reordenação Instantânea) */}
              <div className="space-y-3 pt-1 pb-16">
                {Array.isArray(produtosExibicao) && produtosExibicao.length > 0 ? (
                  produtosExibicao.map((product, index) => (
                    <ProductCard
                      key={product.id || product.itemId || (product as any).item_id || `prod-${index}`}
                      product={product}
                      index={index + 1}
                      weights={weights}
                      onMarkAsRecorded={handleMarkAsRecorded}
                      isFavorite={favorites.some((f) => f.id === product.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onOpenDetails={(p) => setSelectedProduct(p)}
                    />
                  ))
                ) : !isScanning ? (
                  (() => {
                    const limiteVendasAtual = Number(String(filters.minSales).replace(/\D/g, '')) || 0;
                    return (
                      <div className="py-12 text-center space-y-3 bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6">
                        <AlertCircle className={`w-10 h-10 mx-auto ${limiteVendasAtual > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
                        <h3 className="text-sm font-bold text-white">
                          {limiteVendasAtual > 0
                            ? `Nenhum produto com ≥ ${limiteVendasAtual.toLocaleString('pt-BR')} vendas`
                            : 'Nenhuma oportunidade encontrada com estes filtros'}
                        </h3>
                        <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                          {limiteVendasAtual > 0
                            ? `Nenhum produto com ≥ ${limiteVendasAtual.toLocaleString('pt-BR')} vendas encontrado neste nicho. Reduza o filtro de vendas ou clique em Varrer Novamente.`
                            : 'Tente relaxar os filtros de vendas mínimas, estoque ou vídeos para expandir a varredura na Shopee.'}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                          {limiteVendasAtual > 0 && (
                            <button
                              onClick={() => {
                                const resetSales = { ...filters, minSales: 0 };
                                setFilters(resetSales);
                              }}
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-600/20"
                            >
                              <span>Reduzir filtro de vendas</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleRunScan()}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Varrer Novamente</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : null}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <HistoryTab
              scanHistory={history}
              onRestoreScan={handleRestoreScan}
              onClearScanHistory={handleClearHistory}
            />
          )}

          {activeTab === 'producao' && (
            <ProducaoScreen
              recordedProducts={videosGravados}
              onUnmarkRecorded={handleUnmarkRecorded}
              onOpenDetails={(p) => setSelectedProduct(p)}
              onNavigateToRadar={() => setActiveTab('radar')}
            />
          )}

          {activeTab === 'favorites' && (
            <FavoritesTab
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onOpenDetails={(p) => setSelectedProduct(p)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              apiConfig={apiConfig}
              onSaveConfig={handleSaveConfig}
              weights={weights}
              onSaveWeights={handleSaveWeights}
              onResetWeights={handleResetWeights}
            />
          )}
        </main>

        {/* Product Details Bottom Sheet / Modal */}
        <ProductDetailModal
          product={selectedProduct}
          weights={weights}
          onClose={() => setSelectedProduct(null)}
          isFavorite={
            selectedProduct ? favorites.some((f) => f.id === selectedProduct.id) : false
          }
          onToggleFavorite={handleToggleFavorite}
          onMarkAsRecorded={handleMarkAsRecorded}
        />

        {/* Central de Alertas e Notificações (Modal) */}
        <NotificationCenterModal
          isOpen={isNotificationCenterOpen}
          onClose={() => {
            setIsNotificationCenterOpen(false);
            setUnreadAlertsCount(0);
          }}
          onFilterZeroVideos={handleViewZeroVideos}
          onTestAlert={() => {
            const zeroProds = produtosOriginais.filter((p: any) => Number(p.videoCount ?? p.videos_count ?? 0) === 0);
            const prods = zeroProds.length > 0 ? zeroProds : produtosOriginais.slice(0, 3);
            setActiveZeroVideosAlert({
              products: prods,
              count: Math.max(1, prods.length),
            });
          }}
        />

        {/* Fixed Ergonomic Bottom Navigation */}
        <BottomNav
          currentTab={activeTab}
          onChangeTab={(tab) => setActiveTab(tab)}
          favoritesCount={favorites.length}
          recordedCount={videosGravados.length}
        />
      </div>
    </div>
  );
}
