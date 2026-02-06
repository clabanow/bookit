/**
 * Profanity Blocklist & Allowlist
 *
 * Comprehensive word list for a kids' platform. Organized by category.
 * The profanity filter uses SUBSTRING matching after normalization,
 * so "ass" will match "assassin" — the allowlist prevents false positives.
 *
 * Guidelines for maintaining this list:
 * - When adding a short word (3-4 chars), check for false positives
 *   and add innocent words to the ALLOWLIST
 * - Prefer longer/specific forms when short forms cause too many
 *   false positives (e.g., "tits" instead of "tit")
 * - The filter already handles character substitution (@ → a, $ → s, etc.)
 *   so you don't need to add "f@ck" separately
 */

// ============================================
// BLOCKLIST — organized by category
// ============================================

const PROFANITY: string[] = [
  'fuck',
  'fucker',
  'stfu',
  'shit',
  'bullshit',
  'bitch',
  'bitches',
  'bastard',
  'damn',
  'dammit',
  'goddamn',
  'crap',
  'piss',
  'pissed',
  'arse',
  'arsehole',
  'asshole',
  'dumbass',
  'jackass',
  'badass',
  'fatass',
  'smartass',
  'kickass',
  'hardass',
  'wiseass',
]

const SLURS: string[] = [
  'nigger',
  'nigga',
  'negro',
  'coon',
  'darkie',
  'chink',
  'gook',
  'spic',
  'spick',
  'wetback',
  'beaner',
  'kike',
  'hebe',
  'cracker',
  'honky',
  'gringo',
  'wop',
  'dago',
  'raghead',
  'towelhead',
  'camel jockey',
  'paki',
  'gypsy',
  'redskin',
  'savage',
  'fag',
  'faggot',
  'dyke',
  'tranny',
  'shemale',
  'retard',
  'retarded',
  'spaz',
  'spastic',
  'cripple',
  'tard',
]

const SEXUAL: string[] = [
  'cock',
  'cocks',
  'dick',
  'dicks',
  'penis',
  'vagina',
  'pussy',
  'pussies',
  'cunt',
  'cunts',
  'tits',
  'titties',
  'boob',
  'boobs',
  'dildo',
  'blowjob',
  'handjob',
  'rimjob',
  'boner',
  'horny',
  'slut',
  'sluts',
  'slutty',
  'whore',
  'hoe',
  'thot',
  'porn',
  'porno',
  'orgasm',
  'jizz',
  'cum',
  'cumming',
  'semen',
  'erection',
  'masturbat',
  'wank',
  'wanker',
  'hooker',
  'prostitut',
  'milf',
  'anal',
  'anus',
  'butthole',
  'nude',
  'nudes',
  'naked',
  'sexy',
  'sex',
  'rape',
  'rapist',
  'molest',
  'pedophil',
  'paedophil',
  'grooming',
]

const DRUGS: string[] = [
  'cocaine',
  'heroin',
  'meth',
  'crack',
  'weed',
  'marijuana',
  'stoner',
  'junkie',
  'overdose',
]

const VIOLENCE_AND_HATE: string[] = [
  'kill yourself',
  'kys',
  'hang yourself',
  'go die',
  'shoot up',
  'bomb threat',
  'terrorist',
  'nazi',
  'hitler',
  'genocide',
  'holocaust',
  'white power',
  'white supremac',
  'heil',
  'swastika',
  'kkk',
  'ku klux',
]

const BULLYING: string[] = [
  'loser',
  'idiot',
  'moron',
  'stupid',
  'dumb',
  'ugly',
  'fatty',
  'fatso',
  'lard',
  'pig',
  'noob',
  'trash',
  'worthless',
  'pathetic',
  'useless',
  'creep',
  'freak',
  'weirdo',
  'sucker',
  'suck',
]

// ============================================
// ALLOWLIST — innocent words that contain
// blocked substrings (prevents false positives)
// ============================================

const ALLOWLIST: string[] = [
  // Contains "ass"
  'class',
  'classic',
  'bass',
  'grass',
  'pass',
  'mass',
  'assign',
  'assist',
  'assistant',
  'assassin',
  'brass',
  'compass',
  'embassy',
  'harass',
  'sass',
  'sassy',
  'lassie',
  'glasses',
  'molasses',
  'cassette',
  'amass',
  'bypass',
  'surpass',
  'carcass',
  'morass',
  'trespass',
  'massage',
  'passage',
  'passenger',
  'passive',
  'password',
  'sassafras',

  // Contains "hell"
  'hello',
  'shell',
  'shellfish',
  'seashell',
  'nutshell',
  'eggshell',
  'bombshell',
  'michelle',
  'helium',
  'helicopter',
  'helmet',
  'othello',

  // Contains "damn"
  'amsterdam',

  // Contains "cum"
  'cucumber',
  'document',
  'circumstance',
  'accumulate',
  'succumb',

  // Contains "cock"
  'peacock',
  'cockatoo',
  'cockpit',
  'cocktail',
  'woodcock',
  'hancock',
  'hitchcock',

  // Contains "dick"
  'dickens',

  // Contains "hoe"
  'shoe',
  'shoes',
  'phoenix',
  'horseshoe',

  // Contains "ho" + "sex" — "homosexual" should be allowed
  'homosexual',

  // Contains "rape"
  'grape',
  'grapes',
  'drape',
  'drapes',
  'scrape',
  'trapeze',

  // Contains "anal"
  'analog',
  'analogy',
  'analysis',
  'analyze',
  'canal',
  'banal',
  'national',
  'final',
  'journal',
  'signal',
  'original',
  'criminal',
  'animal',
  'terminal',
  'personal',

  // Contains "anus"
  'janus',
  'uranus',
  'manuscript',

  // Contains "nud"/"nude"
  'nudge',

  // Contains "sex"
  'essex',
  'sussex',

  // Contains "crack"
  'cracker',
  'firecracker',
  'nutcracker',
  'crackle',

  // Contains "weed"
  'seaweed',
  'tweed',

  // Contains "meth"
  'method',
  'methods',
  'something',
  'prometheus',

  // Contains "crap"
  'scrap',
  'scrape',
  'scrapbook',

  // Contains "pig"
  'pigeon',

  // Contains "suck"
  'sucker punch',
  'honeysuckle',

  // Contains "fag"
  'flag',

  // Contains "dyke"
  'vandyke',

  // Contains "spic"
  'spice',
  'spicy',
  'despicable',
  'suspicious',
  'auspicious',

  // Contains "coon"
  'raccoon',
  'cocoon',
  'tycoon',
  'balloon',

  // Contains "tard"
  'custard',
  'mustard',
  'bastard', // still blocked on its own
  'leotard',
  'standard',
  'tardy',

  // Contains "boob"
  'booboo',

  // Contains "piss"
  'mississippi',

  // Contains "kys"
  'keys',

  // Contains "heil"
  'ceiling',

  // Contains "savage"
  // (commonly used positively by kids — "that play was savage")
  // Uncomment this if you want to allow it:
  // 'savage',
]

// ============================================
// Exports
// ============================================

/**
 * The full blocklist — all categories combined.
 * All words are lowercased by the ProfanityFilter constructor.
 */
export const DEFAULT_BLOCKLIST: string[] = [
  ...PROFANITY,
  ...SLURS,
  ...SEXUAL,
  ...DRUGS,
  ...VIOLENCE_AND_HATE,
  ...BULLYING,
]

/**
 * Words that are safe despite containing blocked substrings.
 */
export const DEFAULT_ALLOWLIST: string[] = ALLOWLIST
