import React from 'react';
import { Layers } from 'lucide-react';
import { ShopeeProduct } from '../types';

interface CategoryBreakdownProps {
  products: ShopeeProduct[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  products,
  selectedCategory,
  onSelectCategory,
}) => {
  // Group opportunities by category
  const breakdown = React.useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      map.set(p.category, (map.get(p.category) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  if (breakdown.length <= 1) return null;

  return (
    <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 my-2.5">
      <div className="flex items-center gap-1.5 text-slate-300 text-xs font-semibold mb-2">
        <Layers className="w-3.5 h-3.5 text-orange-400" />
        <span>Melhores oportunidades por nicho</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
        {breakdown.map((item) => {
          const isCurrent = selectedCategory === item.category;
          return (
            <button
              key={item.category}
              onClick={() => onSelectCategory(item.category)}
              className={`shrink-0 text-left px-2.5 py-1.5 rounded-lg border text-xs transition-all active:scale-95 ${
                isCurrent
                  ? 'bg-orange-500/15 border-orange-500 text-orange-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold truncate max-w-[130px]">
                {item.category}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {item.count} {item.count === 1 ? 'oportunidade' : 'oportunidades'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
