import React from 'react';
import { Radar, Settings, Sparkles, AlertTriangle, ShieldCheck, Bell } from 'lucide-react';
import { ApiConfig } from '../types';

interface HeaderProps {
  apiConfig: ApiConfig;
  onOpenSettings: () => void;
  onOpenNotifications?: () => void;
  unreadAlertsCount?: number;
  isScanning: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  apiConfig,
  onOpenSettings,
  onOpenNotifications,
  unreadAlertsCount = 0,
  isScanning,
}) => {
  const isMock = apiConfig.apiMode === 'mock' || !apiConfig.isConfigured;
  const isConnectionError =
    !isMock &&
    (apiConfig.connectionStatus === 'error' ||
      !!apiConfig.lastErrorMessage ||
      apiConfig.isExpired);
  const isTesting = !isMock && apiConfig.connectionStatus === 'testing';

  return (
    <header className="sticky top-0 z-30 bg-[#080c14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand Lockup */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ea580c] to-[#ff5722] flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Radar className={`w-5 h-5 text-white ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning && (
              <span className="absolute -inset-1 rounded-xl bg-orange-500/30 animate-ping -z-10" />
            )}
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 font-display">
              Radar Shopee
              <span className="text-[10px] font-semibold tracking-wider text-orange-400 uppercase bg-orange-950/70 border border-orange-800/60 px-1.5 py-0.5 rounded">
                VÍDEO
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 leading-none">
              Oportunidades de Conteúdo
            </p>
          </div>
        </div>

        {/* Right Actions: Mode Badge, Notifications Bell & Settings */}
        <div className="flex items-center gap-2">
          {isMock ? (
            <button
              onClick={onOpenSettings}
              title="Operando com dados simulados de teste. Toque para configurar API real."
              className="flex items-center gap-1.5 text-[11px] font-medium bg-amber-950/60 border border-amber-600/40 text-amber-300 px-2.5 py-1 rounded-full active:scale-95 transition-transform"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>DADOS SIMULADOS</span>
            </button>
          ) : isConnectionError ? (
            <button
              onClick={onOpenSettings}
              title={`Problema na API Shopee detectado: ${apiConfig.lastErrorMessage || 'Erro de conexão'}. Toque para resolver.`}
              className="flex items-center gap-1.5 text-[11px] font-bold bg-rose-950/90 border border-rose-500 text-rose-300 px-2.5 py-1 rounded-full active:scale-95 transition-transform animate-pulse shadow-md shadow-rose-950/50"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>FALHA NA API</span>
            </button>
          ) : isTesting ? (
            <div className="flex items-center gap-1.5 text-[11px] font-medium bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>VERIFICANDO...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-medium bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>API REAL</span>
            </div>
          )}

          {/* Notification Bell Button */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              title="Central de Alertas - Oportunidades Zero Vídeos"
              className="relative w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Alertas e Notificações"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-amber-500 to-orange-600 border border-[#080c14] rounded-full text-[10px] font-black text-white flex items-center justify-center shadow-lg shadow-orange-500/40 animate-pulse">
                  {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Configurações da API"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
