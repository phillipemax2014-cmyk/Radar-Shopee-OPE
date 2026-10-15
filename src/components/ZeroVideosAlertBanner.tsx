import React, { useState, useEffect } from 'react';
import {
  Flame,
  X,
  ArrowRight,
  Bell,
  Volume2,
  VolumeX,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { ShopeeProduct } from '../types';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  requestPushPermission,
  getPushPermissionStatus,
  playNotificationSound,
} from '../services/notificationService';

interface ZeroVideosAlertBannerProps {
  products: ShopeeProduct[];
  count: number;
  onViewZeroVideos: () => void;
  onDismiss: () => void;
}

export const ZeroVideosAlertBanner: React.FC<ZeroVideosAlertBannerProps> = ({
  products,
  count,
  onViewZeroVideos,
  onDismiss,
}) => {
  const [prefs, setPrefs] = useState(getNotificationPreferences());
  const [pushStatus, setPushStatus] = useState(getPushPermissionStatus());
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);

  // Top products to preview (maximum 3)
  const previewProducts = products.slice(0, 3);

  // Auto-dismiss countdown timer (12 seconds)
  const DURATION_MS = 12000;
  useEffect(() => {
    if (isPaused) return;

    const interval = 100;
    const step = (interval / DURATION_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPaused, onDismiss]);

  const handleToggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = saveNotificationPreferences({ soundEnabled: !prefs.soundEnabled });
    setPrefs(updated);
    if (updated.soundEnabled) {
      playNotificationSound();
    }
  };

  const handleRequestPush = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await requestPushPermission();
    setPushStatus(res);
    setPrefs(getNotificationPreferences());
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950/95 via-slate-900/95 to-[#0e1424]/95 border-2 border-amber-500/70 p-4 shadow-2xl shadow-amber-500/20 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300"
    >
      {/* Top Progress bar for auto-dismiss */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-amber-950">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header section with badges and controls */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/30">
            <Flame className="w-4 h-4 animate-bounce" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-950/80 border border-amber-600/50 px-2 py-0.5 rounded-full">
                Mina de Ouro Detectada
              </span>
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            </div>
            <h4 className="text-sm font-bold text-white tracking-tight mt-0.5">
              {count === 1
                ? '1 novo produto com ZERO VÍDEOS encontrado!'
                : `${count} produtos com ZERO VÍDEOS encontrados!`}
            </h4>
          </div>
        </div>

        {/* Action icons (Sound toggle & Dismiss) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleToggleSound}
            title={prefs.soundEnabled ? 'Silenciar alertas sonoros' : 'Ativar alertas sonoros'}
            className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 rounded-lg transition-colors"
          >
            {prefs.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-amber-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>
          <button
            onClick={onDismiss}
            title="Dispensar alerta"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtitle explanation */}
      <p className="text-[11px] text-amber-200/90 mt-1 leading-snug">
        Produtos de alta demanda com zero concorrência em vídeo na Shopee. Prioridade máxima para criar conteúdo e viralizar!
      </p>

      {/* Preview thumbnails of found products */}
      {previewProducts.length > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {previewProducts.map((p, idx) => {
            const vendas = Number(
              p.vendasTotais ??
              (p as any).sales ??
              (p as any).historical_sold ??
              (p as any).sold_count ??
              p.salesCount ??
              0
            );
            return (
              <div
                key={p.id || `preview-${idx}`}
                onClick={onViewZeroVideos}
                className="cursor-pointer group flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/80 border border-amber-500/30 hover:border-amber-400 transition-all hover:bg-slate-800/80"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0 relative">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 bg-red-600 text-[8px] font-bold text-white px-1 rounded-tl">
                    0V
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[11px] font-medium text-slate-200 truncate group-hover:text-amber-300">
                    {p.title}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                    <span className="text-amber-400 font-semibold">
                      {vendas.toLocaleString('pt-BR')} vendas
                    </span>
                    {p.commissionRate && (
                      <span className="text-emerald-400 font-medium">
                        {p.commissionRate}% com.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom CTA Row */}
      <div className="mt-3.5 pt-2.5 border-t border-amber-500/30 flex flex-wrap items-center justify-between gap-2">
        {/* Push Notification quick enable button if not granted yet */}
        {pushStatus === 'default' && (
          <button
            onClick={handleRequestPush}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline decoration-amber-500/60 transition-colors"
          >
            <Bell className="w-3 h-3 text-amber-400" />
            <span>Ativar notificações no navegador</span>
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Dispensar
          </button>
          <button
            onClick={onViewZeroVideos}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-lg shadow-orange-500/30 active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
            <span>Ver Produtos (0 Vídeos)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
