export const getAssetEmoji = (asset: string): string => {
  const emojiMap: Record<string, string> = {
    'BTC': '₿',
    'ETH': 'Ξ',
    'USDT': '₮',
    'XRP': '✕',
    'TSLA': '🚗',
    'AAPL': '🍎',
    'GOOGL': '🔍',
    'NVDA': '🎮',
  };
  return emojiMap[asset] || '📊';
};
