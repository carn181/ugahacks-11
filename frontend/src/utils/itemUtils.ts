// Item utility functions for handling item states and display

export interface Item {
  id: string;
  type: string;
  subtype: string;
  owner_id?: string;
  map_id?: string;
  location?: {
    type: string;
    coordinates: [number, number];
  };
  expires_at?: string | null;
}

export function isItemExpired(item: Item): boolean {
  if (!item.expires_at) return false; // No expiration = permanent
  
  const expirationDate = new Date(item.expires_at);
  const now = new Date();
  return expirationDate < now;
}

export function getItemExpirationStatus(item: Item): {
  isExpired: boolean;
  expiresSoon: boolean;
  timeRemaining: string | null;
} {
  const isExpired = isItemExpired(item);
  
  if (!item.expires_at) {
    return {
      isExpired: false,
      expiresSoon: false,
      timeRemaining: null,
    };
  }
  
  const expirationDate = new Date(item.expires_at);
  const now = new Date();
  const timeDiff = expirationDate.getTime() - now.getTime();
  
  if (timeDiff <= 0) {
    return {
      isExpired: true,
      expiresSoon: false,
      timeRemaining: 'Expired',
    };
  }
  
  const hours = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  let timeRemaining = '';
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    timeRemaining = `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    timeRemaining = `${hours}h ${minutes}m`;
  } else {
    timeRemaining = `${minutes}m`;
  }
  
  const expiresSoon = hours < 1 && !isExpired;
  
  return {
    isExpired,
    expiresSoon,
    timeRemaining,
  };
}

export function getItemIcon(item: Item): string {
  const icons: Record<string, Record<string, string>> = {
    'Potion': {
      'default': '🧪',
      'Stun Brew': '⚗️',
    },
    'Gem': {
      'default': '💎',
      'Focus Crystal': '💠',
    },
    'Chest': {
      'default': '📦',
      'Iron Crate': '🪜',
    },
    'Wand': {
      'default': '🪄',
      'Oak Branch': '🌿',
    },
    'Scroll': {
      'default': '📜',
      'Mirror Image': '🪞',
    },
  };
  
  return icons[item.type]?.[item.subtype] || icons[item.type]?.['default'] || '📦';
}

export function getItemRarityColor(expired: boolean, expiresSoon: boolean): string {
  if (expired) {
    return 'border-gray-500/40 bg-gray-900/50 opacity-60'; // Grayed out for expired
  }
  if (expiresSoon) {
    return 'border-red-500/40 bg-red-900/20'; // Red tint for expiring soon
  }
  return 'border-purple-500/40 bg-purple-900/20'; // Normal purple
}

export function formatItemDistance(distanceInMeters: number): string {
  if (distanceInMeters < 1) {
    return 'Right here';
  } else if (distanceInMeters < 10) {
    return `${Math.round(distanceInMeters)}m`;
  } else {
    return `${Math.round(distanceInMeters)}m away`;
  }
}