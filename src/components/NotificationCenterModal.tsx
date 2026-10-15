import React, { useState } from 'react';
import {
  X,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Sparkles,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ShoppingBag,
  ExternalLink,
  Shield,
  ArrowRight,
} from 'lucide-react';
import {
  ZeroVideoAlertItem,
  getStoredAlerts,
  clearStoredAlerts,
  markAllAlertsAsRead,
  getNotificationPreferences,
  saveNotificationPreferences,
  getPushPermissionStatus,
  requestPushPermission,
  playNotificationSound,
  sendPushNotification,
} from '../services/notificationService';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilterZeroVideos: () => void;
  onTestAlert: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onFilterZeroVideos,
  onTestAlert,
}) => {
  const [alerts, setAlerts] = useState<ZeroVideoAlertItem[]>(getStoredAlerts());
  const [prefs, setPrefs] = useState(getNotificationPreferences());
  const [pushStatus, setPushStatus] = useState(getPushPermissionStatus());
  const [testSent, setTestSent] = useState(false);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const updated = saveNotificationPreferences({ soundEnabled: !prefs.soundEnabled });
    setPrefs(updated);
    if (updated.soundEnabled) {
      playNotificationSound();
    }
  };

  const handleTogglePush = async () => {
    if (pushStatus === 'default') {
      const res = await requestPushPermission();
      setPushStatus(res);
      setPrefs(getNotificationPreferences());
    } else if (pushStatus === 'granted') {
      const updated = saveNotificationPreferences({ pushEnabled: !prefs.pushEnabled });
      setPrefs(updated);
    }
  };

  const handleTestNotification = () => {
    playNotificationSound();
    sendPushNotification('🎯 Radar Shopee: Mina de Ouro (Teste)', {
      body: 'Notificação de teste com sucesso! Você será avisado quando novos produtos com ZERO vídeos forem detectados.',
      tag: 'test-notification',
    });
    setTestSent(true);
    onTestAlert();
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleClearAlerts = () => {
    clearStoredAlerts();
    setAlerts([]);
  };

  const handleMarkRead = () => {
    markAllAlertsAsRead();
    setAlerts(getStoredAlerts());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0a0f1d] border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Central de Alertas
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-600/40 px-2 py-0.5 rounded-full uppercase">
                  ZERO VÍDEOS
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Avisos instantâneos de produtos virais sem concorrência
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Settings / Controls Card */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Configurações de Notificação
            </h4>

            {/* Push Notifications Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    Notificações no Navegador (Push)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {pushStatus === 'granted'
                      ? 'Permissão concedida no navegador'
                      : pushStatus === 'denied'
                      ? 'Bloqueado nas configurações do navegador'
                      : pushStatus === 'unsupported'
                      ? 'Navegador sem suporte'
                      : 'Receba alertas mesmo com o app minimizado'}
                  </div>
                </div>
              </div>

              <div>
                {pushStatus === 'default' ? (
                  <button
                    onClick={handleTogglePush}
                    className="px-2.5 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
                  >
                    Ativar
                  </button>
                ) : pushStatus === 'granted' ? (
                  <button
                    onClick={handleTogglePush}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                      prefs.pushEnabled
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {prefs.pushEnabled ? 'Ativas' : 'Pausadas'}
                  </button>
                ) : (
                  <span className="text-[11px] text-rose-400 font-medium">Bloqueado</span>
                )}
              </div>
            </div>

            {/* Audio Alert Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                {prefs.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold text-slate-200">Alerta Sonoro (Chime)</div>
                  <div className="text-[11px] text-slate-400">
                    Tocar sinal de áudio ao encontrar produtos com zero vídeos
                  </div>
                </div>
              </div>

              <button
                onClick={handleToggleSound}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                  prefs.soundEnabled
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                {prefs.soundEnabled ? 'Ligado' : 'Mudo'}
              </button>
            </div>

            {/* Test Notification Button */}
            <div className="pt-1 flex items-center justify-between">
              <button
                onClick={handleTestNotification}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-700"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{testSent ? 'Alerta disparado com sucesso!' : 'Testar Alerta Visual e Sonoro'}</span>
              </button>
            </div>
          </div>

          {/* Quick Action to filter 0 videos directly */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/50 to-orange-950/40 border border-amber-600/40 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-amber-200">
              <Flame className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Deseja ver apenas produtos com 0 vídeos agora?</span>
            </div>
            <button
              onClick={() => {
                onFilterZeroVideos();
                onClose();
              }}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-md shadow-amber-600/20"
            >
              <span>Ver no Radar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Alert History Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>Histórico de Alertas</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-full font-mono">
                  {alerts.length}
                </span>
              </h4>

              {alerts.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMarkRead}
                    className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Marcar como lidos
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    onClick={handleClearAlerts}
                    className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Limpar</span>
                  </button>
                </div>
              )}
            </div>

            {alerts.length === 0 ? (
              <div className="py-8 text-center bg-slate-900/40 rounded-xl border border-slate-800/60 p-4">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium text-slate-300">Nenhum alerta recente</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Quando você realizar varreduras e forem detectados produtos com 0 vídeos, os avisos aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-xl border transition-colors ${
                      alert.read
                        ? 'bg-slate-900/50 border-slate-800 text-slate-400'
                        : 'bg-amber-950/30 border-amber-500/40 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span>{alert.count} produto(s) com 0 vídeos</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          • {alert.category}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {alert.formattedTime}
                      </span>
                    </div>

                    {/* Preview products */}
                    {alert.topProducts && alert.topProducts.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                        {alert.topProducts.map((p, idx) => (
                          <div
                            key={p.id || `alert-p-${idx}`}
                            className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/70 border border-slate-800/80"
                          >
                            <div className="w-7 h-7 rounded overflow-hidden bg-slate-800 shrink-0">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ShoppingBag className="w-3.5 h-3.5 text-slate-600 m-auto mt-1.5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium text-slate-200 truncate">
                                {p.title}
                              </p>
                              <p className="text-[10px] text-amber-400">
                                {p.salesCount.toLocaleString('pt-BR')} vendas
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Varreduras automáticas alertam em tempo real.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
