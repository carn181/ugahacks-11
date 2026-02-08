import type { ARGameObject, ARGameObjectType, Rarity } from "@/types";

interface ObjectTemplate {
  type: ARGameObjectType;
  name: string;
  description: string;
  rarity: Rarity;
}

const TEMPLATES: ObjectTemplate[] = [
  {
    type: "potion",
    name: "Health Potion",
    description: "Restores 50 HP. A wizard's best friend.",
    rarity: "Common",
  },
  {
    type: "potion",
    name: "Mana Elixir",
    description: "Replenishes magical energy.",
    rarity: "Uncommon",
  },
  {
    type: "chest",
    name: "Enchanted Chest",
    description: "Contains rare magical artifacts.",
    rarity: "Rare",
  },
  {
    type: "scroll",
    name: "Spell Scroll",
    description: "Teaches a random spell when opened.",
    rarity: "Uncommon",
  },
  {
    type: "scroll",
    name: "Ancient Tome Page",
    description: "A fragment of forbidden knowledge.",
    rarity: "Epic",
  },
  {
    type: "gem",
    name: "Arcane Gem",
    description: "Pulses with raw magical energy.",
    rarity: "Epic",
  },
  {
    type: "gem",
    name: "Soul Crystal",
    description: "Contains the essence of a defeated foe.",
    rarity: "Rare",
  },
  {
    type: "wand",
    name: "Apprentice Wand",
    description: "A basic wand crackling with potential.",
    rarity: "Legendary",
  },
  {
    type: "chest",
    name: "Mimic Chest",
    description: "Is it treasure or a trap?",
    rarity: "Common",
  },
  {
    type: "potion",
    name: "Phoenix Tears",
    description: "Revives the fallen with blazing power.",
    rarity: "Legendary",
  },
];

/**
 * Generate AR game objects at random positions around the player.
 * Objects spawn within a radius of 5-30 meters at random compass directions.
 */
export function generateRandomNearbyObjects(
  playerLat: number,
  playerLng: number,
  count: number = 5,
): ARGameObject[] {
  // Meters per degree at this latitude
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((playerLat * Math.PI) / 180);

  // Shuffle templates and pick `count`
  const shuffled = [...TEMPLATES].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, count);

  return picked.map((template, i) => {
    // Random distance 5-30 meters
    const distance = 5 + Math.random() * 25;
    // Random angle 0-360 degrees
    const angle = Math.random() * 2 * Math.PI;

    const offsetMetersN = distance * Math.cos(angle);
    const offsetMetersE = distance * Math.sin(angle);

    const lat = playerLat + offsetMetersN / metersPerDegLat;
    const lng = playerLng + offsetMetersE / metersPerDegLng;
    const altitude = 0.3 + Math.random() * 1.0;

    return {
      id: `ar-${template.type}-${i}-${Date.now()}`,
      type: template.type,
      name: template.name,
      description: template.description,
      rarity: template.rarity,
      position: { lat, lng, altitude },
      pickupRadius:
        template.rarity === "Legendary"
          ? 3
          : template.rarity === "Epic"
            ? 4
            : 5,
      spriteKey: template.type,
      collected: false,
    };
  });
}
