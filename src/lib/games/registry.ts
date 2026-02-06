/**
 * Game Registry
 *
 * A simple typed config for all games on the platform.
 * Each game has metadata (name, description, icon) and routing info (basePath).
 *
 * This is intentionally NOT a plugin system — it's a flat config array.
 * When we add a second game, we just add another entry here.
 */

export interface GameConfig {
  /** Unique identifier (used in URLs and lookups) */
  id: string
  /** Display name */
  name: string
  /** Short description for the game browser */
  description: string
  /** Emoji icon for the game card */
  icon: string
  /** Base path for all routes (e.g., '/games/quiz') */
  basePath: string
  /** Whether this game is available to play */
  enabled: boolean
  /** Tailwind accent color class for the game card */
  accentColor: string
}

/**
 * All registered games on the platform.
 * Currently just quiz — add more entries as new games are built.
 */
const games: GameConfig[] = [
  {
    id: 'quiz',
    name: 'Bookit Quiz',
    description: 'Live classroom quiz games with multiple choice and spelling questions.',
    icon: '🎯',
    basePath: '/games/quiz',
    enabled: true,
    accentColor: 'blue',
  },
]

/** Look up a game by its ID */
export function getGame(id: string): GameConfig | undefined {
  return games.find((g) => g.id === id)
}

/** Get all enabled games (for the home page game browser) */
export function getEnabledGames(): GameConfig[] {
  return games.filter((g) => g.enabled)
}
