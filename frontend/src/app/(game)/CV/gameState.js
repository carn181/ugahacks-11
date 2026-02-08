/**
 * Spell-casting game state: move recording (L, R, U, P), spell patterns, arsenal, penalties, powerups.
 * Move buffer is cleared after every move for both players.
 */

/** @typedef {'L'|'R'|'U'|'D'} MoveDirection - Left, Right, Up, Down */

/** @typedef {{ direction: MoveDirection, timestamp: number }} MoveSegment */

/** @typedef {{ id: string, name: string, pattern: MoveDirection[] }} SpellDef */

/** @typedef {'double_damage'|'shield'|'heal'|'speed_cast'|'extra_move'} PowerupType */

export const MOVE_DIRECTIONS = /** @type {const} */ (['L', 'R', 'U', 'D']);

/** Default spell library: pattern -> spell id */
export const SPELL_PATTERNS = /** @type {SpellDef[]} */ ([
  { id: 'attack', name: 'Attack', pattern: ['U', 'L', 'R', 'L'] },
  { id: 'defense', name: 'Defense', pattern: ['D', 'R', 'L', 'R'] },
  { id: 'reflect', name: 'Reflect', pattern: ['U', 'D', 'U', 'D'] },
]);

/** Default arsenal (spell ids) per player - can be replaced by game */
const DEFAULT_ARSENAL = ['attack', 'defense', 'reflect'];

/**
 * Move buffer: records the current move sequence for the active player.
 * Cleared after every move (both players).
 */
export class MoveBuffer {
  constructor() {
    /** @type {MoveSegment[]} */
    this.sequence = [];
    /** @type {number} */
    this.maxLength = 12;
    /** @type {number} */
    this.minSegmentMs = 150;
    /** @type {number} */
    this.maxPauseMs = 1200;
  }

  /** @param {MoveDirection} direction */
  push(direction) {
    const now = Date.now();
    const last = this.sequence[this.sequence.length - 1];
    if (last && now - last.timestamp < this.minSegmentMs) return; // debounce
    if (this.sequence.length >= this.maxLength) this.sequence.shift();
    this.sequence.push({ direction, timestamp: now });
  }

  /** Clear after every move (call after each player's move) */
  clear() {
    this.sequence = [];
  }

  /** @returns {MoveDirection[]} */
  getPattern() {
    return this.sequence.map((s) => s.direction);
  }

  /** @returns {boolean} true if move has started (at least one segment) */
  hasStarted() {
    return this.sequence.length > 0;
  }

  /** Check if last segment is too old (timeout = move ended) */
  isStale() {
    if (this.sequence.length === 0) return true;
    const last = this.sequence[this.sequence.length - 1];
    return Date.now() - last.timestamp > this.maxPauseMs;
  }
}

/**
 * Match current buffer to a spell pattern. Truncate buffer to pattern length for match.
 * @param {MoveBuffer} buffer
 * @param {SpellDef[]} spells
 * @returns {{ spell: SpellDef, matched: true } | { matched: false }} 
 */
export function matchSpell(buffer, spells = SPELL_PATTERNS) {
  const pattern = buffer.getPattern();
  if (pattern.length < 2) return { matched: false };
  for (const spell of spells) {
    const p = spell.pattern;
    if (pattern.length < p.length) continue;
    const recent = pattern.slice(-p.length);
    if (recent.every((d, i) => d === p[i])) return { spell, matched: true };
  }
  return { matched: false };
}

/**
 * Check if the last completed move is valid: either matches a spell in arsenal or triggers penalty.
 * @param {MoveBuffer} buffer
 * @param {Set<string>} playerArsenal - spell ids the player has
 * @param {SpellDef[]} spells
 * @returns {{ type: 'spell', spell: SpellDef } | { type: 'penalty', reason: 'wrong_pattern'|'not_in_arsenal' } | null}
 */
export function evaluateMove(buffer, playerArsenal, spells = SPELL_PATTERNS) {
  const result = matchSpell(buffer, spells);
  if (!result.matched) {
    const minLen = spells.reduce((min, s) => Math.min(min, s.pattern.length), Infinity);
    if (buffer.getPattern().length >= minLen) return { type: 'penalty', reason: 'wrong_pattern' };
    return null;
  }
  if (!playerArsenal.has(result.spell.id)) return { type: 'penalty', reason: 'not_in_arsenal' };
  return { type: 'spell', spell: result.spell };
}

/** Powerup definitions for UI/game logic */
export const POWERUP_TYPES = /** @type {const} */ ({
  double_damage: { id: 'double_damage', name: 'Double Damage', icon: '⚔️' },
  shield: { id: 'shield', name: 'Shield', icon: '🛡️' },
  heal: { id: 'heal', name: 'Heal', icon: '💚' },
  speed_cast: { id: 'speed_cast', name: 'Speed Cast', icon: '⚡' },
  extra_move: { id: 'extra_move', name: 'Extra Move', icon: '✨' },
});

/**
 * Create default arsenal set for a player.
 * @returns {Set<string>}
 */
export function defaultArsenal() {
  return new Set(DEFAULT_ARSENAL);
}
