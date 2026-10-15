import { ShopeeProduct } from '../types';
import { buildDirectShopeeUrl, getValidProductUrl } from './apiClient';

/**
 * Builds the canonical Shopee Brasil direct item deep link
 * using shopId and itemId.
 *
 * Direct immutable product page: https://shopee.com.br/product/{shop_id}/{item_id}
 */
export function buildShopeeItemDeepLink(shopId?: string | number, itemId?: string | number): string | null {
  return buildDirectShopeeUrl(shopId, itemId);
}

/**
 * Resolves the specific target destination URL for a product.
 *
 * STRICT RESOLUTION HIERARCHY (Exclusively direct, validated links - ZERO search logic):
 * 1. Verified official affiliate link (e.g. s.shopee.com.br, shope.ee, or API affiliate link)
 * 2. Specific product item URL (when already configured with direct URL)
 * 3. Direct, immutable product URL built from shop_id + item_id (https://shopee.com.br/product/${shop_id}/${item_id})
 */
export function resolveShopeeUrl(product: ShopeeProduct | Partial<ShopeeProduct>): string | null {
  return getValidProductUrl(product);
}

/**
 * Returns the exact destination link for the product.
 */
export function getShopeeDirectProductUrl(product: ShopeeProduct | Partial<ShopeeProduct>): string | null {
  return getValidProductUrl(product);
}

/**
 * Copies the exact product title to the clipboard to provide immediate convenience
 * when pasting inside Shopee App or search box.
 */
export function copyProductExactTitle(title: string): void {
  try {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(title);
    }
  } catch {
    // Non-blocking
  }
}

/**
 * Opens the exact product on Shopee.
 * Automatically copies the exact product title to the clipboard as well,
 * guaranteeing zero loss of context if the user switches to the Shopee app.
 */
export function openShopeeProduct(product: ShopeeProduct, onUnavailable?: () => void): boolean {
  // Pre-copy product title to clipboard for seamless user experience
  copyProductExactTitle(product.title);

  const targetUrl = resolveShopeeUrl(product);

  if (!targetUrl) {
    if (onUnavailable) {
      onUnavailable();
    } else {
      console.warn('Link específico do produto não disponível.');
    }
    return false;
  }

  const anchor = document.createElement('a');
  anchor.href = targetUrl;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  return true;
}
