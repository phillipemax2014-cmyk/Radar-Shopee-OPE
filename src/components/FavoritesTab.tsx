import React from 'react';
import { Heart, Sparkles, ExternalLink, Trash2 } from 'lucide-react';
import { ShopeeProduct } from '../types';
import { ProductCard } from './ProductCard';

interface FavoritesTabProps {
  favorites: ShopeeProduct[];
  onToggleFavorite: (product: ShopeeProduct) => void;
  onOpenDetails: (product: ShopeeProduct) => void;
}

export const FavoritesTab: React.FC<FavoritesTabProps> = ({
  favorites,
  onToggleFavorite,
  onOpenDetails,
}) => {
  if (favorites.length === 0) {
    return (
      <div className="py-16 text-center space-y-3 px-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <Heart className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white font-display">
          Nenhum produto salvo
        </h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Ao encontrar produtos com alto potencial no Radar, toque no coração para salvá-los e acompanhar aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white font-display">
            Produtos Favoritos
          </h2>
          <p className="text-xs text-slate-400">
            {favorites.length} {favorites.length === 1 ? 'oportunidade salva' : 'oportunidades salvas'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {favorites.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isFavorite={true}
            onToggleFavorite={onToggleFavorite}
            onOpenDetails={onOpenDetails}
          />
        ))}
      </div>
    </div>
  );
};
