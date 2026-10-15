import React from 'react';
import { Radar, History, Clapperboard, Heart, Settings } from 'lucide-react';

export type NavTab = 'radar' | 'history' | 'producao' | 'favorites' | 'settings';

interface BottomNavProps {
  currentTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  favoritesCount: number;
  recordedCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  favoritesCount,
  recordedCount = 0,
}) => {
  const tabs = [
    { id: 'radar' as NavTab, label: 'Radar', icon: Radar },
    { id: 'history' as NavTab, label: 'Histórico', icon: History },
    {
      id: 'producao' as NavTab,
      label: 'Produção',
      icon: Clapperboard,
      badge: recordedCount > 0 ? recordedCount : null,
    },
    {
      id: 'favorites' as NavTab,
      label: 'Favoritos',
      icon: Heart,
      badge: favoritesCount > 0 ? favoritesCount : null,
    },
    { id: 'settings' as NavTab, label: 'Ajustes', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#080c14]/95 backdrop-blur-md border-t border-slate-800/90 py-1">
      <div className="max-w-md mx-auto grid grid-cols-5 items-center h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className="flex flex-col items-center justify-center h-full min-h-[44px] min-w-[40px] relative active:scale-95 transition-transform"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-orange-500 stroke-[2.2]' : 'text-slate-400'
                  }`}
                />
                {tab.badge !== null && tab.badge !== undefined && (
                  <span className={`absolute -top-1.5 -right-2 min-w-[15px] h-[15px] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 ${
                    tab.id === 'producao' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-semibold tracking-tight mt-1 transition-colors ${
                  isActive ? 'text-orange-500' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>

              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 bg-orange-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
