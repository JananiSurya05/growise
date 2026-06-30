// Consumer-facing "market price" markup used to compute the displayed
// marketPrice and the amount_saved figure on orders. Single source of truth —
// imported by both the shop UI (display) and the order-placement route
// (server-side recomputation) so they can never silently drift apart.
export const CONSUMER_MARKET_MARKUP = 1.35;

export function computeMarketPrice(price: number): number {
  return Math.round(price * CONSUMER_MARKET_MARKUP);
}
