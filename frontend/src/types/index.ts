export type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export interface Creature {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  element: string;
  power: number;
  imageUrl?: string;
  capturedAt?: Date;
  lat?: number;
  lng?: number;
}

export interface GameState {
  player: {
    id: string;
    name: string;
    level: number;
    xp: number;
    xpToNextLevel: number;
    creaturesCollected: number;
  };
  inventory: Creature[];
  activeQuest: string | null;
  mapPosition: {
    lat: number;
    lng: number;
  };
}

export const RARITY_COLORS: Record<Rarity, string> = {
  Common: "text-slate-400 border-slate-400",
  Uncommon: "text-green-400 border-green-400",
  Rare: "text-blue-400 border-blue-400",
  Epic: "text-purple-400 border-purple-400",
  Legendary: "text-amber-400 border-amber-400",
};

export const RARITY_BG_COLORS: Record<Rarity, string> = {
  Common: "bg-slate-400/20",
  Uncommon: "bg-green-400/20",
  Rare: "bg-blue-400/20",
  Epic: "bg-purple-400/20",
  Legendary: "bg-amber-400/20",
};

export const SAMPLE_CREATURES: Creature[] = [
  {
    id: "1",
    name: "Emberfox",
    description: "A sly fox wreathed in enchanted flames.",
    rarity: "Rare",
    element: "Fire",
    power: 72,
  },
  {
    id: "2",
    name: "Glimshroom",
    description: "A luminous mushroom spirit from the deep forest.",
    rarity: "Common",
    element: "Nature",
    power: 28,
  },
  {
    id: "3",
    name: "Stormwing",
    description: "A majestic raptor crackling with lightning.",
    rarity: "Epic",
    element: "Storm",
    power: 91,
  },
  {
    id: "4",
    name: "Crystalisk",
    description: "An ancient golem made of living gemstone.",
    rarity: "Legendary",
    element: "Earth",
    power: 99,
  },
  {
    id: "5",
    name: "Whispmoth",
    description: "A ghostly moth that drifts between dimensions.",
    rarity: "Uncommon",
    element: "Spirit",
    power: 45,
  },
];
