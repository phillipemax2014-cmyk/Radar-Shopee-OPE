import React, { useState } from 'react';
import {
  Key,
  Shield,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Server,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ApiConfig, OpportunityWeights } from '../types';
import { testShopeeConnection } from '../services/apiClient';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  getPushPermissionStatus,
  requestPushPermission,
  playNotificationSound,
  sendPushNotification,
} from '../services/notificationService';

interface SettingsTabProps {
  apiConfig: ApiConfig;
  onSaveConfig: (config: ApiConfig) => void;
  weights: OpportunityWeights;
  onSaveWeights: (weights: OpportunityWeights) => void;
  onResetWeights: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  apiConfig,
  onSaveConfig,
  weights,
  onSaveWeights,
  onResetWeights,
}) => {
  const [appId, setAppId] = useState(apiConfig.appId);
  const [appSecret, setAppSecret] = useState(apiConfig.secretMasked || '');
  const secretKey = appSecret;
  const setSecretKey = setAppSecret;
  const [showSecret, setShowSecret] = useState(false);
  const [apiMode, setApiMode] = useState<'mock' | 'real'>(apiConfig.apiMode);
  const [environment, setEnvironment] = useState<'BR' | 'GLOBAL'>(apiConfig.environment);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Notification states
  const [notifPrefs, setNotifPrefs] = useState(getNotificationPreferences());
  const [pushStatus, setPushStatus] = useState(getPushPermissionStatus());
  const [testAlertSent, setTestAlertSent] = useState(false);

  const handleTogglePushNotif = async () => {
    if (pushStatus === 'default') {
      const res = await requestPushPermission();
      setPushStatus(res);
      setNotifPrefs(getNotificationPreferences());
    } else if (pushStatus === 'granted') {
      const updated = saveNotificationPreferences({ pushEnabled: !notifPrefs.pushEnabled });
      setNotifPrefs(updated);
    }
  };

  const handleToggleSoundNotif = () => {
    const updated = saveNotificationPreferences({ soundEnabled: !notifPrefs.soundEnabled });
    setNotifPrefs(updated);
    if (updated.soundEnabled) {
      playNotificationSound();
    }
  };

  const handleTestAlertInSettings = () => {
    playNotificationSound();
    sendPushNotification('🎯 Radar Shopee: Mina de Ouro (Teste)', {
      body: 'Alerta de teste funcionando! Notificações ativas para produtos com zero vídeos.',
    });
    setTestAlertSent(true);
    setTimeout(() => setTestAlertSent(false), 3000);
  };

  // Local weights state
  const [localWeights, setLocalWeights] = useState<OpportunityWeights>(weights);

  // Sincronização reativa instantânea se weights mudar externamente
  React.useEffect(() => {
    setLocalWeights(weights);
  }, [weights]);

  const handleTestConnection = async (overrideEnv?: 'BR' | 'GLOBAL' | React.MouseEvent) => {
    setTesting(true);
    setTestResult(null);
    const envToTest = typeof overrideEnv === 'string' ? overrideEnv : environment;
    try {
      const result = await testShopeeConnection(appId, appSecret, apiMode, envToTest);
      setTestResult(result);
      if (result.autoSwitched && result.environment) {
        setEnvironment(result.environment);
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Falha inesperada ao tentar comunicar com o serviço.',
      });
    } finally {
      setTesting(false);
    }
  };

  // Handshake de auto conexão
  const handleAutoConnect = async () => {
    if (!appId || !appSecret || appSecret.includes('••••')) return;
    if (apiMode !== 'real') return;
    await handleTestConnection();
  };

  React.useEffect(() => {
    // Só executa o handshake se ambas as credenciais já existirem no estado
    if (appId && appSecret) {
      handleAutoConnect();
    }
  }, [appId, appSecret]);

  const handleFixToBrasil = async () => {
    setEnvironment('BR');
    await handleTestConnection('BR');
  };

  const handleSaveCredentials = async () => {
    const isConfigured = !!appId && !!secretKey;
    const now = new Date();
    const newConfig: ApiConfig = {
      ...apiConfig,
      appId: appId.trim(),
      secretMasked: secretKey.trim(),
      apiMode,
      environment,
      isConfigured,
      isExpired: false,
      lastAuthDate: `Autenticado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Save locally
    onSaveConfig(newConfig);

    // Save to secure server backend
    try {
      await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: appId.trim(),
          appSecret: secretKey.trim(),
          environment,
          apiMode,
        }),
      });
    } catch {
      // Non-blocking
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    // Automatically test connection after saving
    handleTestConnection();
  };

  const handleWeightChange = (key: keyof OpportunityWeights, val: number) => {
    const updated = { ...localWeights, [key]: val };
    setLocalWeights(updated);
    onSaveWeights(updated);
  };

  const handleResetWeights = () => {
    const defaults: OpportunityWeights = {
      salesWeight: 35,
      stockWeight: 15,
      videoWeight: 30,
      affiliateWeight: 10,
      commissionWeight: 7,
      priceWeight: 3,
    };
    setLocalWeights(defaults);
    onSaveWeights(defaults);
    onResetWeights();
  };

  return (
    <div className="space-y-5 pb-24 text-slate-200">
      <div>
        <h2 className="text-base font-bold text-white font-display">
          Configurações da Integração
        </h2>
        <p className="text-xs text-slate-400">
          Gerencie o acesso à API da Shopee, segurança de credenciais e pesos do algoritmo.
        </p>
      </div>

      {/* Mode Switcher: Demonstration (MOCK) vs Real API */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Origem dos Dados
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            Alternar a qualquer momento
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setApiMode('mock')}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              apiMode === 'mock'
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dados Simulados (MOCK)</span>
          </button>

          <button
            onClick={() => setApiMode('real')}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              apiMode === 'real'
                ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>API Shopee Real</span>
          </button>
        </div>

        {apiMode === 'mock' ? (
          <div className="text-[11px] text-amber-300/90 bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 leading-relaxed">
            <strong>Modo Demonstração:</strong> utiliza dados simulados com validação completa da interface, pontuação e filtros. Identificado como <span className="underline">DEMONSTRAÇÃO — DADOS SIMULADOS</span> nos cards.
          </div>
        ) : (
          <div className="text-[11px] text-emerald-300/90 bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 leading-relaxed">
            <strong>Modo API Real:</strong> conecta-se diretamente à API Shopee Affiliate Open Platform via proxy backend seguro para buscar oportunidades em tempo real.
          </div>
        )}
      </div>

      {/* Shopee API Credentials Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-orange-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Credenciais Shopee Open Platform
            </h3>
          </div>
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-400" /> Protegido
          </span>
        </div>

        {/* Automatic Health & Connection Status Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Monitor Automático de Conexão
            </span>
            {apiMode === 'mock' ? (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full">
                MODO SIMULADO
              </span>
            ) : apiConfig.connectionStatus === 'error' || apiConfig.lastErrorMessage ? (
              <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 border border-rose-500/50 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                PROBLEMA DETECTADO
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                API ATIVA
              </span>
            )}
          </div>

          {apiMode === 'real' && (
            <div className="text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>Endpoint Atual:</span>
                <span className="font-mono text-white text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  {environment === 'BR' ? 'open-api.affiliate.shopee.com.br' : 'open-api.affiliate.shopee.com'}
                </span>
              </div>
              {apiConfig.lastErrorMessage && (
                <div className="bg-rose-950/50 border border-rose-600/40 rounded-lg p-2 text-rose-300 text-[11px] mt-1 leading-snug">
                  <strong>Diagnóstico:</strong> {apiConfig.lastErrorMessage}
                </div>
              )}
              {environment === 'GLOBAL' && (
                <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-2 text-amber-200 text-[11px] flex items-center justify-between gap-2 mt-1">
                  <span>Shopee Global pode retornar status 502 (em manutenção).</span>
                  <button
                    type="button"
                    onClick={handleFixToBrasil}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-[10px] px-2 py-1 rounded transition-colors shrink-0"
                  >
                    Usar Shopee Brasil
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expiration Notice if expired */}
        {apiConfig.isExpired && (
          <div className="bg-rose-950/80 border border-rose-600/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Conexão com a Shopee expirada ou com erro!</strong>
              <p className="text-[11px] text-rose-300 mt-0.5">
                Atualize suas credenciais ou alterne o endpoint para restabelecer a conexão.
              </p>
            </div>
          </div>
        )}

        {/* Environment */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-slate-400">
              Região / Endpoint Shopee
            </label>
            {environment === 'GLOBAL' && (
              <span className="text-[10px] text-rose-400 font-semibold">
                Global instável (502)
              </span>
            )}
          </div>
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as 'BR' | 'GLOBAL')}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
          >
            <option value="BR">Shopee Brasil (open-api.affiliate.shopee.com.br) — Recomendado</option>
            <option value="GLOBAL">Shopee Global (open-api.affiliate.shopee.com)</option>
          </select>
        </div>

        {/* App ID / Partner ID */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
            App ID / Partner ID
          </label>
          <input
            type="text"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            placeholder="Ex.: 1083921"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Secret / Key */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
            Chave Secreta / App Secret / Senha de API
          </label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Cole a chave secreta fornecida no portal de afiliados"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-9 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
            >
              {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Nunca exibido em texto aberto para terceiros. Processado com HMAC-SHA256 no backend.
          </p>
        </div>

        {/* Status / Last Auth info */}
        {apiConfig.lastAuthDate && (
          <div className="text-[11px] text-slate-400 bg-slate-950/60 rounded-xl p-2.5 flex items-center justify-between">
            <span>{apiConfig.lastAuthDate}</span>
            <span className="text-emerald-400 font-semibold">Credencial Ativa</span>
          </div>
        )}

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`rounded-xl p-3 text-xs flex items-start gap-2 ${
              testResult.success
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{testResult.message}</p>
              {testResult.latencyMs !== undefined && (
                <span className="text-[10px] opacity-75 mt-0.5 block">
                  Tempo de resposta: {testResult.latencyMs}ms
                </span>
              )}
              {!testResult.success && environment === 'GLOBAL' && (
                <button
                  type="button"
                  onClick={handleFixToBrasil}
                  className="mt-2 text-[11px] bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Alternar para Shopee Brasil e Retestar</span>
                </button>
              )}
              {!testResult.success && (
                <div className="mt-2.5 p-2 bg-slate-900/90 border border-slate-800 rounded-lg text-[10px] text-slate-300 space-y-1">
                  <span className="font-bold text-orange-400 block">Dica para resolver:</span>
                  <p>1. Verifique se a sua conta de afiliado está ativa no portal Shopee Affiliate Brasil.</p>
                  <p>2. Acesse <span className="text-orange-300 font-mono">affiliate.shopee.com.br/open_api</span> e copie o App ID e Chave Secreta exatos.</p>
                  <p>3. Use a região <strong>Shopee Brasil (.com.br)</strong> para evitar o erro 502 da rede global.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Buttons: Test Connection & Save */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="min-h-[42px] bg-slate-800 hover:bg-slate-700/90 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95 disabled:opacity-50"
          >
            {testing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Testando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
                <span>Testar Conexão</span>
              </>
            )}
          </button>

          <button
            onClick={handleSaveCredentials}
            className="min-h-[42px] bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/20 active:scale-95 transition-all"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Salvo com Sucesso!</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5" />
                <span>Atualizar Credenciais</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Opportunity Algorithm Weights Card (Section 22) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Pesos do Índice de Oportunidade
            </h3>
          </div>
          <button
            onClick={handleResetWeights}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-orange-400 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restaurar Padrão</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Ajuste centralizado dos critérios que definem o ranking e a classificação "Mina de Ouro":
        </p>

        <div className="space-y-3.5 text-xs">
          {/* 1. Volume de Vendas */}
          <div>
            <div className="flex justify-between text-slate-300 font-semibold mb-1">
              <span>Prioridade 1: Volume de Vendas</span>
              <span className="text-orange-400 font-bold">{localWeights.salesWeight} pts</span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              value={localWeights.salesWeight}
              onChange={(e) => handleWeightChange('salesWeight', Number(e.target.value))}
              className="w-full accent-orange-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* 2. Quantidade de Vídeos (Fator Crítico) */}
          <div>
            <div className="flex justify-between text-slate-300 font-semibold mb-1">
              <span>Prioridade 3: Poucos ou 0 Vídeos (Crítico)</span>
              <span className="text-emerald-400 font-bold">{localWeights.videoWeight} pts</span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              value={localWeights.videoWeight}
              onChange={(e) => handleWeightChange('videoWeight', Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* 3. Estoque */}
          <div>
            <div className="flex justify-between text-slate-300 font-semibold mb-1">
              <span>Prioridade 2: Estoque Saudável</span>
              <span className="text-teal-400 font-bold">{localWeights.stockWeight} pts</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              value={localWeights.stockWeight}
              onChange={(e) => handleWeightChange('stockWeight', Number(e.target.value))}
              className="w-full accent-teal-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* 4. Concorrência de Afiliados */}
          <div>
            <div className="flex justify-between text-slate-300 font-semibold mb-1">
              <span>Prioridade 4: Baixa Concorrência de Afiliados</span>
              <span className="text-slate-300 font-bold">{localWeights.affiliateWeight} pts</span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              value={localWeights.affiliateWeight}
              onChange={(e) => handleWeightChange('affiliateWeight', Number(e.target.value))}
              className="w-full accent-slate-400 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* 5. Comissão */}
          <div>
            <div className="flex justify-between text-slate-300 font-semibold mb-1">
              <span>Prioridade 5: Comissão Atrativa (%)</span>
              <span className="text-indigo-400 font-bold">{localWeights.commissionWeight} pts</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              value={localWeights.commissionWeight}
              onChange={(e) => handleWeightChange('commissionWeight', Number(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* 6. Preço Equilibrado */}
          <div>
            <div className="flex justify-between text-slate-300 font-semibold mb-1">
              <span>Prioridade 6: Preço Comercial</span>
              <span className="text-amber-400 font-bold">{localWeights.priceWeight} pts</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              value={localWeights.priceWeight}
              onChange={(e) => handleWeightChange('priceWeight', Number(e.target.value))}
              className="w-full accent-amber-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Seção de Notificações & Alertas */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Alertas de Zero Vídeos</h3>
              <p className="text-[11px] text-slate-400">
                Avisos em tempo real ao encontrar produtos sem concorrência
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Push Notifications Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-3">
              <BellRing className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-200">
                  Notificações no Navegador (Web Push)
                </div>
                <div className="text-[11px] text-slate-400">
                  {pushStatus === 'granted'
                    ? 'Permissão ativa. Você será notificado mesmo com a aba em segundo plano.'
                    : pushStatus === 'denied'
                    ? 'Bloqueado no navegador. Desbloqueie nas permissões do site.'
                    : pushStatus === 'unsupported'
                    ? 'Seu navegador não suporta a Web Notification API.'
                    : 'Receba alertas instantâneos no sistema operacional ao varrer novos produtos.'}
                </div>
              </div>
            </div>

            <div className="shrink-0 ml-2">
              {pushStatus === 'default' ? (
                <button
                  type="button"
                  onClick={handleTogglePushNotif}
                  className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-md shadow-amber-600/20 transition-colors"
                >
                  Ativar
                </button>
              ) : pushStatus === 'granted' ? (
                <button
                  type="button"
                  onClick={handleTogglePushNotif}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                    notifPrefs.pushEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {notifPrefs.pushEnabled ? 'Ativas' : 'Pausadas'}
                </button>
              ) : (
                <span className="text-xs text-rose-400 font-semibold">Bloqueado</span>
              )}
            </div>
          </div>

          {/* Audio Chime Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-3">
              {notifPrefs.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <div>
                <div className="text-xs font-bold text-slate-200">
                  Sinal Sonoro de Alerta (Chime)
                </div>
                <div className="text-[11px] text-slate-400">
                  Toca um acorde musical sutil quando oportunidades de ouro forem encontradas.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSoundNotif}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors shrink-0 ml-2 ${
                notifPrefs.soundEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
              }`}
            >
              {notifPrefs.soundEnabled ? 'Ativado' : 'Silencioso'}
            </button>
          </div>

          {/* Test Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleTestAlertInSettings}
              className="w-full py-2.5 px-3 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>
                {testAlertSent
                  ? 'Alerta enviado! Verifique o som e notificação.'
                  : 'Testar Alerta Sonoro e Push'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Guide: How to obtain Shopee Affiliate API credentials */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs text-slate-400">
        <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
          <span>Onde encontrar suas credenciais na Shopee?</span>
          <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
        </h4>
        <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed">
          <li>Acesse o Programa de Afiliados da Shopee (affiliate.shopee.com.br).</li>
          <li>Navegue até a seção <strong>Open Platform / Developer Tools</strong>.</li>
          <li>Gere ou copie seu <strong>App ID (Partner ID)</strong> e sua <strong>Chave Secreta</strong>.</li>
          <li>Cole-os acima e clique em <strong>Testar Conexão</strong> para validar.</li>
        </ol>
      </div>
    </div>
  );
};
