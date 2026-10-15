import { ShopeeProduct } from '../types';

export interface NotificationPreferences {
  pushEnabled: boolean;
  soundEnabled: boolean;
  minSalesForAlert: number;
  bannerDismissedPrompt: boolean;
}

export interface ZeroVideoAlertItem {
  id: string;
  timestamp: string;
  formattedTime: string;
  count: number;
  category: string;
  topProducts: {
    id: string;
    title: string;
    imageUrl: string;
    salesCount: number;
    price: number;
    commissionRate: number | null;
  }[];
  read: boolean;
}

const PREFS_KEY = 'radar_shopee_notification_prefs';
const ALERTS_HISTORY_KEY = 'radar_shopee_zero_video_alerts';
const SEEN_ZERO_VIDEOS_KEY = 'radar_shopee_seen_zero_videos';

const DEFAULT_PREFS: NotificationPreferences = {
  pushEnabled: false,
  soundEnabled: true,
  minSalesForAlert: 0,
  bannerDismissedPrompt: false,
};

/**
 * Carrega as preferências de notificação do usuário
 */
export function getNotificationPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PREFS, ...parsed };
    }
  } catch (e) {
    console.warn('Erro ao carregar preferências de notificação:', e);
  }
  return DEFAULT_PREFS;
}

/**
 * Salva as preferências de notificação
 */
export function saveNotificationPreferences(prefs: Partial<NotificationPreferences>): NotificationPreferences {
  try {
    const current = getNotificationPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Erro ao salvar preferências de notificação:', e);
    return DEFAULT_PREFS;
  }
}

/**
 * Obtém o status de permissão de notificações do navegador
 */
export function getPushPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Solicita permissão para notificações push no navegador
 */
export async function requestPushPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      saveNotificationPreferences({ pushEnabled: true });
    } else {
      saveNotificationPreferences({ pushEnabled: false });
    }
    return permission;
  } catch (e) {
    console.warn('Erro ao solicitar permissão de notificações:', e);
    return 'denied';
  }
}

/**
 * Toca um sinal sonoro agradável e sutil usando Web Audio API (sem arquivos externos)
 */
export function playNotificationSound(): void {
  try {
    const prefs = getNotificationPreferences();
    if (!prefs.soundEnabled) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tom 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tom 2: E5 (659.25 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.12);
    gain2.gain.setValueAtTime(0.001, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.25, now + 0.17);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.4);

    // Tom 3: A5 (880.00 Hz) - acorde de confirmação e ouro
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(880, now + 0.24);
    gain3.gain.setValueAtTime(0.001, now + 0.24);
    gain3.gain.exponentialRampToValueAtTime(0.2, now + 0.28);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.24);
    osc3.stop(now + 0.65);

    // Limpeza após reprodução
    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        // Ignora erro ao fechar contexto
      }
    }, 1000);
  } catch (e) {
    console.warn('Erro ao tocar som de notificação:', e);
  }
}

/**
 * Dispara uma notificação nativa Push no navegador
 */
export function sendPushNotification(
  title: string,
  options: {
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    onClick?: () => void;
  }
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notif = new Notification(title, {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      badge: options.badge,
      tag: options.tag || 'radar-shopee-zero-videos',
      silent: false,
    });

    notif.onclick = () => {
      try {
        window.focus();
        if (options.onClick) {
          options.onClick();
        }
        notif.close();
      } catch (err) {
        console.warn('Erro ao clicar na notificação:', err);
      }
    };

    return true;
  } catch (e) {
    console.warn('Falha ao disparar Notification:', e);
    return false;
  }
}

/**
 * Histórico de alertas de produtos com zero vídeos
 */
export function getStoredAlerts(): ZeroVideoAlertItem[] {
  try {
    const raw = localStorage.getItem(ALERTS_HISTORY_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Erro ao carregar histórico de alertas:', e);
  }
  return [];
}

/**
 * Salva um novo alerta no histórico
 */
export function saveStoredAlert(alert: Omit<ZeroVideoAlertItem, 'id' | 'timestamp' | 'formattedTime' | 'read'>): ZeroVideoAlertItem {
  const alerts = getStoredAlerts();
  const date = new Date();
  const newAlert: ZeroVideoAlertItem = {
    ...alert,
    id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: date.toISOString(),
    formattedTime: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    read: false,
  };

  // Mantém os últimos 20 alertas
  const updated = [newAlert, ...alerts].slice(0, 20);
  try {
    localStorage.setItem(ALERTS_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Erro ao salvar histórico de alertas:', e);
  }

  return newAlert;
}

/**
 * Marca todos os alertas como lidos
 */
export function markAllAlertsAsRead(): void {
  const alerts = getStoredAlerts();
  const updated = alerts.map((a) => ({ ...a, read: true }));
  try {
    localStorage.setItem(ALERTS_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Erro ao marcar alertas como lidos:', e);
  }
}

/**
 * Limpa todo o histórico de alertas
 */
export function clearStoredAlerts(): void {
  try {
    localStorage.removeItem(ALERTS_HISTORY_KEY);
  } catch (e) {
    console.warn('Erro ao limpar histórico de alertas:', e);
  }
}

/**
 * Gerenciamento de IDs de produtos zero vídeos já vistos
 * para evitar notificar repetidamente sobre os mesmos itens
 */
export function getSeenZeroVideoIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_ZERO_VIDEOS_KEY);
    if (raw) {
      return new Set(JSON.parse(raw));
    }
  } catch (e) {
    console.warn('Erro ao ler produtos vistos:', e);
  }
  return new Set();
}

export function saveSeenZeroVideoIds(ids: string[]): void {
  try {
    const current = getSeenZeroVideoIds();
    ids.forEach((id) => current.add(id));
    // Mantém no máximo 500 IDs para não ocupar espaço excessivo
    const array = Array.from(current).slice(-500);
    localStorage.setItem(SEEN_ZERO_VIDEOS_KEY, JSON.stringify(array));
  } catch (e) {
    console.warn('Erro ao salvar produtos vistos:', e);
  }
}

/**
 * Dispara o sistema completo de aviso de Zero Vídeos (Push + Som + Histórico)
 */
export function processZeroVideosNotification(
  zeroVideoProducts: ShopeeProduct[],
  category: string,
  onOpenZeroVideosFilter?: () => void
): {
  isNew: boolean;
  newCount: number;
  alertItem?: ZeroVideoAlertItem;
} {
  if (!zeroVideoProducts || zeroVideoProducts.length === 0) {
    return { isNew: false, newCount: 0 };
  }

  const prefs = getNotificationPreferences();
  const seenIds = getSeenZeroVideoIds();

  // Filtra apenas produtos que ainda não foram notificados nesta sessão/máquina
  const newProducts = zeroVideoProducts.filter((p) => {
    const id = String(p.item_id || p.itemId || p.id || '').trim();
    return id && !seenIds.has(id);
  });

  const countToReport = newProducts.length > 0 ? newProducts.length : zeroVideoProducts.length;
  const productsToFeature = newProducts.length > 0 ? newProducts : zeroVideoProducts;

  // Atualiza os vistos
  saveSeenZeroVideoIds(
    zeroVideoProducts.map((p) => String(p.item_id || p.itemId || p.id || '').trim())
  );

  // Toca som se ativado
  playNotificationSound();

  // Registra no histórico de alertas
  const alertItem = saveStoredAlert({
    count: countToReport,
    category: category || 'Todos os nichos',
    topProducts: productsToFeature.slice(0, 3).map((p) => ({
      id: String(p.item_id || p.itemId || p.id || ''),
      title: p.title || 'Produto sem título',
      imageUrl: p.imageUrl || '',
      salesCount: Number(p.vendasTotais || (p as any).historical_sold || (p as any).sold_count || p.salesCount || 0),
      price: Number(p.price || 0),
      commissionRate: p.commissionRate,
    })),
  });

  // Dispara notificação push nativa se ativada
  if (prefs.pushEnabled && getPushPermissionStatus() === 'granted') {
    const topProd = productsToFeature[0];
    const topProdTitle = topProd ? `Ex: "${topProd.title.substring(0, 35)}..."` : '';
    sendPushNotification('🎯 Radar Shopee: Mina de Ouro Encontrada!', {
      body: `${countToReport} produto(s) com ZERO vídeos e alta demanda detectados! ${topProdTitle}`,
      tag: `zero-videos-${Date.now()}`,
      onClick: onOpenZeroVideosFilter,
    });
  }

  return {
    isNew: newProducts.length > 0,
    newCount: countToReport,
    alertItem,
  };
}
