// Inventory feature module
// Placeholder for inventory management logic

import type { Creature, Rarity } from "@/types";

export function sortByRarity(creatures: Creature[]): Creature[] {
  const order: Record<Rarity, number> = {
    Common: 0,
    Uncommon: 1,
    Rare: 2,
    Epic: 3,
    Legendary: 4,
  };
  return [...creatures].sort((a, b) => order[b.rarity] - order[a.rarity]);
}

export function filterByRarity(
  creatures: Creature[],
  rarity: Rarity
): Creature[] {
  return creatures.filter((c) => c.rarity === rarity);
}
