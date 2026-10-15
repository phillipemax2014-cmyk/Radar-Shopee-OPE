import React, { useState, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
  RotateCcw,
  Tag,
  DollarSign,
  ArrowRight,
  Check,
} from 'lucide-react';
import { ScanFilters } from '../types';
import { CATEGORIES } from '../services/mockData';

interface FilterBarProps {
  filters: ScanFilters;
  onChangeFilters: (newFilters: ScanFilters) => void;
  onScan: (currentFilters?: ScanFilters) => void;
  onSelectCategory?: (cat: string) => void;
  isScanning: boolean;
  totalFound?: number;
}

const PRESET_PRICE_RANGES = [
  { id: 'all', label: 'Todos', sub: 'Sem limite', min: null, max: null },
  { id: 'under35', label: 'Até R$ 35', sub: 'Impulso', min: null, max: 35 },
  { id: '35to80', label: 'R$ 35 – R$ 80', sub: 'Mais Vendidos', min: 35, max: 80 },
  { id: '80to150', label: 'R$ 80 – R$ 150', sub: 'Ticket Médio', min: 80, max: 150 },
  { id: '150to300', label: 'R$ 150 – R$ 300', sub: 'Alta Comissão', min: 150, max: 300 },
  { id: 'over300', label: '> R$ 300', sub: 'Premium', min: 300, max: null },
] as const;

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChangeFilters,
  onScan,
  onSelectCategory,
  isScanning,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 1. Ligação do Estado (State Binding dos Filtros Avançados)
  const [filtroVendas, setFiltroVendas] = useState<string>(String(filters.minSales ?? '0'));
  const [filtroMinPreco, setFiltroMinPreco] = useState<number | null>(
    filters.minPrice ?? null
  );
  const [filtroMaxPreco, setFiltroMaxPreco] = useState<number | 'sem_limite'>(
    filters.maxPrice === null ? 'sem_limite' : filters.maxPrice
  );
  const [filtroEstoque, setFiltroEstoque] = useState<number | 'sem_limite'>(
    filters.minStock === null ? 'sem_limite' : filters.minStock
  );
  const [filtroComissao, setFiltroComissao] = useState<number | 'sem_limite'>(
    filters.minCommission === null ? 'sem_limite' : filters.minCommission
  );
  const [filtroMaxVideos, setFiltroMaxVideos] = useState<number | string>(
    filters.maxVideos === null ? 'todos' : filters.maxVideos
  );
  const [filtroQtd, setFiltroQtd] = useState<number>(filters.limit || 20);

  // Sincroniza os estados locais caso o filters seja resetado externamente
  useEffect(() => {
    setFiltroVendas(String(filters.minSales ?? '0'));
    setFiltroMinPreco(filters.minPrice ?? null);
    setFiltroMaxPreco(filters.maxPrice === null ? 'sem_limite' : filters.maxPrice);
    setFiltroEstoque(filters.minStock === null ? 'sem_limite' : filters.minStock);
    setFiltroComissao(filters.minCommission === null ? 'sem_limite' : filters.minCommission);
    setFiltroMaxVideos(filters.maxVideos === null ? 'todos' : filters.maxVideos);
    setFiltroQtd(filters.limit || 20);
  }, [filters]);

  const buildActiveFilters = (overrides?: Partial<ScanFilters>): ScanFilters => {
    const rawVid = String(filtroMaxVideos);
    const numVideos = (rawVid === 'todos' || rawVid === 'sem_limite') ? null : Number(rawVid.replace(/\D/g, '') || 0);

    const minP = overrides?.minPrice !== undefined ? overrides.minPrice : filtroMinPreco;
    const maxP = overrides?.maxPrice !== undefined ? overrides.maxPrice : (filtroMaxPreco === 'sem_limite' ? null : Number(filtroMaxPreco));

    return {
      ...filters,
      minSales: parseInt(String(filtroVendas), 10) || 0,
      minPrice: minP !== null && minP !== undefined && minP > 0 ? Number(minP) : null,
      maxPrice: maxP !== null && maxP !== undefined && maxP > 0 ? Number(maxP) : null,
      minStock: filtroEstoque === 'sem_limite' ? null : Number(filtroEstoque),
      minCommission: filtroComissao === 'sem_limite' ? null : Number(filtroComissao),
      maxVideos: numVideos,
      limit: filtroQtd,
      ...overrides,
    };
  };

  const handleCategorySelect = (cat: string) => {
    const updated = buildActiveFilters({ category: cat });
    onChangeFilters(updated);
    if (onSelectCategory) {
      onSelectCategory(cat);
    }
  };

  const handleClearFilters = () => {
    const resetValues: ScanFilters = {
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
    };
    setFiltroVendas('0');
    setFiltroMinPreco(null);
    setFiltroMaxPreco('sem_limite');
    setFiltroEstoque('sem_limite');
    setFiltroComissao('sem_limite');
    setFiltroMaxVideos('sem_limite');
    setFiltroQtd(20);
    onChangeFilters(resetValues);
  };

  const handleTriggerScan = () => {
    const currentActive = buildActiveFilters();
    onChangeFilters(currentActive);
    onScan(currentActive);
  };

  // Helper para aplicar faixa de preço rápida
  const handleApplyPricePreset = (min: number | null, max: number | null) => {
    setFiltroMinPreco(min);
    setFiltroMaxPreco(max === null ? 'sem_limite' : max);
    const updated = buildActiveFilters({ minPrice: min, maxPrice: max });
    onChangeFilters(updated);
  };

  // Helper para alterar preço mínimo manual
  const handleMinPriceChange = (valueStr: string) => {
    const cleaned = valueStr.replace(/\D/g, '');
    const num = cleaned === '' ? null : Number(cleaned);
    setFiltroMinPreco(num);
    const currentMax = filtroMaxPreco === 'sem_limite' ? null : Number(filtroMaxPreco);
    const updated = buildActiveFilters({ minPrice: num, maxPrice: currentMax });
    onChangeFilters(updated);
  };

  // Helper para alterar preço máximo manual
  const handleMaxPriceChange = (valueStr: string) => {
    if (valueStr === 'sem_limite' || valueStr === '') {
      setFiltroMaxPreco('sem_limite');
      const updated = buildActiveFilters({ minPrice: filtroMinPreco, maxPrice: null });
      onChangeFilters(updated);
      return;
    }
    const cleaned = valueStr.replace(/\D/g, '');
    const num = cleaned === '' ? null : Number(cleaned);
    setFiltroMaxPreco(num === null ? 'sem_limite' : num);
    const updated = buildActiveFilters({ minPrice: filtroMinPreco, maxPrice: num });
    onChangeFilters(updated);
  };

  // Helper para resetar apenas a faixa de preço
  const handleResetPriceRange = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFiltroMinPreco(null);
    setFiltroMaxPreco('sem_limite');
    const updated = buildActiveFilters({ minPrice: null, maxPrice: null });
    onChangeFilters(updated);
  };

  // Verifica se o preset atual está ativo
  const isPresetActive = (min: number | null, max: number | null) => {
    const currentMin = filtroMinPreco ?? null;
    const currentMax = filtroMaxPreco === 'sem_limite' ? null : Number(filtroMaxPreco);
    return currentMin === min && currentMax === max;
  };

  // Descrição amigável do intervalo ativo
  const getActivePriceRangeLabel = () => {
    const min = filtroMinPreco;
    const max = filtroMaxPreco === 'sem_limite' ? null : Number(filtroMaxPreco);

    if (min !== null && min > 0 && max !== null && max > 0) {
      return `R$ ${min.toFixed(0)} até R$ ${max.toFixed(0)}`;
    }
    if (min !== null && min > 0) {
      return `A partir de R$ ${min.toFixed(0)}`;
    }
    if (max !== null && max > 0) {
      return `Até R$ ${max.toFixed(0)}`;
    }
    return 'Qualquer valor';
  };

  const isPriceFilterActive =
    (filtroMinPreco !== null && filtroMinPreco > 0) ||
    (filtroMaxPreco !== 'sem_limite' && filtroMaxPreco !== null);

  const hasActiveCustomFilters =
    filters.minSales > 0 ||
    isPriceFilterActive ||
    filters.minStock !== null ||
    filters.maxVideos !== null ||
    filters.minCommission !== null ||
    filters.maxAffiliates !== null ||
    filters.keyword.trim() !== '';

  // Slider values helper (0 até 500)
  const sliderMin = filtroMinPreco ?? 0;
  const sliderMax = filtroMaxPreco === 'sem_limite' ? 500 : Math.min(500, Number(filtroMaxPreco));

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-xl">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={filters.keyword}
          onChange={(e) => onChangeFilters({ ...filters, keyword: e.target.value })}
          placeholder="Ex.: fone bluetooth, organizador de cozinha"
          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleTriggerScan();
          }}
        />
        {filters.keyword && (
          <button
            onClick={() => onChangeFilters({ ...filters, keyword: '' })}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Categories Horizontal Scroll */}
      <div className="overflow-x-auto scrollbar-none -mx-1 px-1 flex items-center gap-1.5 py-0.5">
        {CATEGORIES.map((cat) => {
          const isSelected = filters.category === cat;
          return (
            <button
              key={cat}
              onClick={() => handleCategorySelect(cat)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 active:scale-95 ${
                isSelected
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md shadow-orange-500/20 font-semibold'
                  : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Main Scan Action Button (VARRER AGORA) */}
      <button
        onClick={handleTriggerScan}
        disabled={isScanning}
        className="w-full min-h-[50px] bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-sm tracking-wide rounded-xl shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-75 uppercase"
      >
        {isScanning ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Varendo oportunidades na Shopee...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-white" />
            <span>VARRER AGORA</span>
          </>
        )}
      </button>

      {/* Toggle Advanced Filters */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filtros Avançados</span>
          {hasActiveCustomFilters && (
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          )}
          {showAdvanced ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {hasActiveCustomFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpar filtros</span>
          </button>
        )}
      </div>

      {/* Advanced Filters Drawer */}
      {showAdvanced && (
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2.5 text-xs animate-in fade-in-50 duration-200">
          {/* 1. Vendas Mínimas (filtroVendas) */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1 font-medium">
              Vendas mínimas
            </label>
            <select
              value={filtroVendas}
              onChange={(e) => {
                setFiltroVendas(e.target.value);
                onChangeFilters(buildActiveFilters({ minSales: parseInt(e.target.value, 10) || 0 }));
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-orange-500"
            >
              <option value="0">0 (Todas)</option>
              <option value="50">≥ 50 vendas</option>
              <option value="500">≥ 500 vendas</option>
              <option value="1500">≥ 1.500 vendas</option>
              <option value="5000">≥ 5.000 vendas</option>
              <option value="10000">≥ 10.000 vendas</option>
              <option value="20000">≥ 20.000 vendas</option>
            </select>
          </div>

          {/* 2. Máximo de Vídeos (filtroMaxVideos) */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1 font-medium">
              Máximo de vídeos
            </label>
            <select
              value={String(filtroMaxVideos)}
              onChange={(e) => {
                const val = e.target.value;
                setFiltroMaxVideos(val);
                onChangeFilters(buildActiveFilters({ maxVideos: val === 'todos' || val === 'sem_limite' ? null : Number(val) }));
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-orange-500"
            >
              <option value="todos">Todos</option>
              <option value="0">0 vídeos (Apenas sem vídeos)</option>
              <option value="1">Máx. 1 vídeo</option>
              <option value="2">Máx. 2 vídeos</option>
              <option value="5">Máx. 5 vídeos</option>
            </select>
          </div>

          {/* ======================================================== */}
          {/* 3. SELETOR DE FAIXA DE PREÇO DINÂMICA (MÍNIMO E MÁXIMO) */}
          {/* ======================================================== */}
          <div className="col-span-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            {/* Header com badge de intervalo e botão limpar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Tag className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
                  Faixa de Preço (Intervalo de Custo)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isPriceFilterActive
                      ? 'bg-orange-950/70 text-orange-300 border-orange-600/50 shadow-sm shadow-orange-950/50'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {getActivePriceRangeLabel()}
                </span>
                {isPriceFilterActive && (
                  <button
                    type="button"
                    onClick={handleResetPriceRange}
                    title="Remover filtro de preço"
                    className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Atalhos Rápidos de Faixa (Preset Pills) */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 -mx-0.5 px-0.5">
              {PRESET_PRICE_RANGES.map((preset) => {
                const active = isPresetActive(preset.min, preset.max);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPricePreset(preset.min, preset.max)}
                    className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 active:scale-95 border ${
                      active
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white border-orange-500 shadow-md shadow-orange-600/20'
                        : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800/90'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Inputs Diretos de Preço Mínimo e Máximo (Side by Side) */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Preço Mínimo */}
              <div>
                <label className="block text-slate-400 text-[10px] mb-1 font-medium flex items-center justify-between">
                  <span>Preço Mínimo</span>
                  <span className="text-slate-500">R$</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500 text-xs font-semibold">
                    R$
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={filtroMinPreco ?? ''}
                    onChange={(e) => handleMinPriceChange(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Preço Máximo */}
              <div>
                <label className="block text-slate-400 text-[10px] mb-1 font-medium flex items-center justify-between">
                  <span>Preço Máximo</span>
                  <span className="text-slate-500">R$</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500 text-xs font-semibold">
                    R$
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={filtroMaxPreco === 'sem_limite' ? '' : (filtroMaxPreco ?? '')}
                    onChange={(e) => handleMaxPriceChange(e.target.value)}
                    placeholder="Sem limite"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Slider Visual Interativo Dinâmico de Faixa de Preço */}
            <div className="pt-2 space-y-1.5">
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>R$ 0</span>
                <span className="text-orange-400 font-bold">
                  {sliderMin > 0 ? `R$ ${sliderMin}` : 'R$ 0'} — {filtroMaxPreco === 'sem_limite' ? 'R$ 500+' : `R$ ${sliderMax}`}
                </span>
                <span>R$ 500+</span>
              </div>

              {/* Slider de Mínimo */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] text-slate-500">
                  <span>Ajustar Mínimo:</span>
                  <span className="font-mono text-slate-300">R$ {sliderMin}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="450"
                  step="5"
                  value={sliderMin}
                  onChange={(e) => {
                    const newMin = Number(e.target.value);
                    const currentMax = filtroMaxPreco === 'sem_limite' ? null : Number(filtroMaxPreco);
                    const safeMax = currentMax !== null && currentMax <= newMin ? newMin + 10 : currentMax;
                    setFiltroMinPreco(newMin === 0 ? null : newMin);
                    if (safeMax !== currentMax) {
                      setFiltroMaxPreco(safeMax === null ? 'sem_limite' : safeMax);
                    }
                    onChangeFilters(
                      buildActiveFilters({
                        minPrice: newMin === 0 ? null : newMin,
                        maxPrice: safeMax,
                      })
                    );
                  }}
                  className="w-full accent-orange-500 bg-slate-900 h-1 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Slider de Máximo */}
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between text-[9px] text-slate-500">
                  <span>Ajustar Máximo:</span>
                  <span className="font-mono text-slate-300">
                    {filtroMaxPreco === 'sem_limite' ? 'Sem limite' : `R$ ${sliderMax}`}
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="5"
                  value={sliderMax}
                  onChange={(e) => {
                    const newMax = Number(e.target.value);
                    if (newMax >= 500) {
                      setFiltroMaxPreco('sem_limite');
                      onChangeFilters(buildActiveFilters({ maxPrice: null }));
                    } else {
                      const safeMin = filtroMinPreco !== null && filtroMinPreco >= newMax ? Math.max(0, newMax - 10) : filtroMinPreco;
                      setFiltroMaxPreco(newMax);
                      if (safeMin !== filtroMinPreco) {
                        setFiltroMinPreco(safeMin === 0 ? null : safeMin);
                      }
                      onChangeFilters(
                        buildActiveFilters({
                          minPrice: safeMin === 0 ? null : safeMin,
                          maxPrice: newMax,
                        })
                      );
                    }
                  }}
                  className="w-full accent-amber-500 bg-slate-900 h-1 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 4. Estoque Mínimo (filtroEstoque) */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1 font-medium">
              Estoque mínimo
            </label>
            <select
              value={filtroEstoque}
              onChange={(e) => {
                const val = e.target.value === 'sem_limite' ? 'sem_limite' : Number(e.target.value);
                setFiltroEstoque(val);
                onChangeFilters(buildActiveFilters({ minStock: val === 'sem_limite' ? null : val }));
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-orange-500"
            >
              <option value="sem_limite">Sem limite</option>
              <option value="100">&ge; 100 unidades</option>
              <option value="300">&ge; 300 unidades</option>
              <option value="1000">&ge; 1.000 unidades</option>
              <option value="2000">&ge; 2.000 unidades</option>
            </select>
          </div>

          {/* 5. Comissão Mínima (filtroComissao) */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1 font-medium">
              Comissão mínima
            </label>
            <select
              value={filtroComissao}
              onChange={(e) => {
                const val = e.target.value === 'sem_limite' ? 'sem_limite' : Number(e.target.value);
                setFiltroComissao(val);
                onChangeFilters(buildActiveFilters({ minCommission: val === 'sem_limite' ? null : val }));
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-orange-500"
            >
              <option value="sem_limite">Sem limite</option>
              <option value="8">&ge; 8%</option>
              <option value="10">&ge; 10%</option>
              <option value="12">&ge; 12%</option>
              <option value="15">&ge; 15%</option>
            </select>
          </div>

          {/* 6. Limite / Qtd. de Produtos (filtroQtd) */}
          <div className="col-span-2">
            <label className="block text-slate-400 text-[11px] mb-1 font-medium">
              Qtd. de produtos na varredura
            </label>
            <select
              value={filtroQtd}
              onChange={(e) => {
                const val = Number(e.target.value);
                setFiltroQtd(val);
                onChangeFilters(buildActiveFilters({ limit: val }));
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-orange-500"
            >
              <option value="10">10 produtos</option>
              <option value="20">20 produtos</option>
              <option value="50">50 produtos</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
