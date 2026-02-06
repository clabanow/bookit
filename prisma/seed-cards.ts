/**
 * Card Catalog Seeder
 *
 * Seeds the 28 trading cards across 5 rarity tiers.
 * Uses upsert so it's safe to run multiple times — existing cards
 * get updated, new cards get created.
 *
 * Run with: npx tsx prisma/seed-cards.ts
 */

import { PrismaClient, CardRarity } from '@prisma/client'

const prisma = new PrismaClient()

interface CardSeed {
  name: string
  description: string
  rarity: CardRarity
  coinCost: number
  season: string | null
}

const cards: CardSeed[] = [
  // ============================================
  // COMMON (50 coins) — 6 cards, always available
  // ============================================
  {
    name: 'Cat',
    description: 'A curious kitty who loves to nap on keyboards.',
    rarity: CardRarity.COMMON,
    coinCost: 50,
    season: null,
  },
  {
    name: 'Puppy',
    description: 'A playful pup who chases its own tail.',
    rarity: CardRarity.COMMON,
    coinCost: 50,
    season: null,
  },
  {
    name: 'Dog',
    description: 'A loyal companion who always wants belly rubs.',
    rarity: CardRarity.COMMON,
    coinCost: 50,
    season: null,
  },
  {
    name: 'Chicken',
    description: 'Bawk bawk! The farmyard champion.',
    rarity: CardRarity.COMMON,
    coinCost: 50,
    season: null,
  },
  {
    name: 'Chick',
    description: 'A tiny fluffball learning to peck.',
    rarity: CardRarity.COMMON,
    coinCost: 50,
    season: null,
  },
  {
    name: 'Cow',
    description: 'Mooooo! Loves grass and giving milk.',
    rarity: CardRarity.COMMON,
    coinCost: 50,
    season: null,
  },

  // ============================================
  // RARE (200 coins) — 5 cards, some seasonal
  // ============================================
  {
    name: 'Pumpkin Puppy',
    description: 'A puppy in a pumpkin costume — spooktacular!',
    rarity: CardRarity.RARE,
    coinCost: 200,
    season: 'OCT',
  },
  {
    name: 'Autumn Cat',
    description: 'A cozy cat curled up in autumn leaves.',
    rarity: CardRarity.RARE,
    coinCost: 200,
    season: 'OCT',
  },
  {
    name: 'Crow',
    description: 'A mysterious crow that watches from the treetops.',
    rarity: CardRarity.RARE,
    coinCost: 200,
    season: 'OCT',
  },
  {
    name: 'Zombie',
    description: 'Braaaains! A friendly undead shuffler.',
    rarity: CardRarity.RARE,
    coinCost: 200,
    season: 'OCT',
  },
  {
    name: 'Santa Sleigh',
    description: 'Dashing through the snow with eight tiny reindeer!',
    rarity: CardRarity.RARE,
    coinCost: 200,
    season: 'DEC',
  },

  // ============================================
  // LEGENDARY (500 coins) — 7 cards
  // ============================================
  {
    name: 'King',
    description: 'The ruler of the quiz kingdom. Bow before the crown!',
    rarity: CardRarity.LEGENDARY,
    coinCost: 500,
    season: null,
  },
  {
    name: 'Turkey',
    description: 'Gobble gobble! The star of the Thanksgiving table.',
    rarity: CardRarity.LEGENDARY,
    coinCost: 500,
    season: 'NOV',
  },
  {
    name: 'Megalodon',
    description: 'An ancient shark the size of a school bus!',
    rarity: CardRarity.LEGENDARY,
    coinCost: 500,
    season: null,
  },
  {
    name: 'Baby Shark',
    description: 'Doo doo doo doo doo doo!',
    rarity: CardRarity.LEGENDARY,
    coinCost: 500,
    season: null,
  },
  {
    name: 'Santa',
    description: 'Ho ho ho! He knows if you\'ve been studying.',
    rarity: CardRarity.LEGENDARY,
    coinCost: 500,
    season: 'DEC',
  },
  {
    name: 'Ghost',
    description: 'A spooky specter who haunts the leaderboard.',
    rarity: CardRarity.LEGENDARY,
    coinCost: 500,
    season: 'OCT',
  },
  {
    name: 'King of Hearts',
    description: 'The most beloved ruler in the deck.',
    rarity: CardRarity.LEGENDARY,
    coinCost: 500,
    season: null,
  },

  // ============================================
  // MYSTICAL (1,500 coins) — 6 cards
  // ============================================
  {
    name: 'Spooky Ghost',
    description: 'BOO! A ghost so spooky even other ghosts are scared.',
    rarity: CardRarity.MYSTICAL,
    coinCost: 1500,
    season: 'OCT',
  },
  {
    name: 'Hamsta Claus',
    description: 'A hamster in a Santa outfit delivering tiny presents.',
    rarity: CardRarity.MYSTICAL,
    coinCost: 1500,
    season: 'DEC',
  },
  {
    name: 'Phantom King',
    description: 'Half ghost, half royalty — rules the spirit realm.',
    rarity: CardRarity.MYSTICAL,
    coinCost: 1500,
    season: 'OCT',
  },
  {
    name: 'Tim the Alien',
    description: 'Came from outer space to ace your quiz.',
    rarity: CardRarity.MYSTICAL,
    coinCost: 1500,
    season: null,
  },
  {
    name: 'Rainbow Astronaut',
    description: 'Exploring the universe in a trail of colors.',
    rarity: CardRarity.MYSTICAL,
    coinCost: 1500,
    season: null,
  },
  {
    name: 'Pele',
    description: 'The legendary footballer — king of the beautiful game.',
    rarity: CardRarity.MYSTICAL,
    coinCost: 1500,
    season: null,
  },

  // ============================================
  // IRIDESCENT (5,000 coins) — 4 cards, always available
  // The rarest cards, named after the dev's family!
  // ============================================
  {
    name: 'Lex',
    description: 'The eldest sibling — always first on the leaderboard.',
    rarity: CardRarity.IRIDESCENT,
    coinCost: 5000,
    season: null,
  },
  {
    name: 'Mack',
    description: 'The inventor of Bookit — a quiz master in the making.',
    rarity: CardRarity.IRIDESCENT,
    coinCost: 5000,
    season: null,
  },
  {
    name: 'Lucy',
    description: 'The youngest champion — small but mighty!',
    rarity: CardRarity.IRIDESCENT,
    coinCost: 5000,
    season: null,
  },
  {
    name: 'Pippa',
    description: 'A fluffy brown half Shih Tzu, half Maltese who loves treats.',
    rarity: CardRarity.IRIDESCENT,
    coinCost: 5000,
    season: null,
  },
]

async function seedCards() {
  console.log('Seeding card catalog...')

  for (const card of cards) {
    await prisma.card.upsert({
      where: { name: card.name },
      update: {
        description: card.description,
        rarity: card.rarity,
        coinCost: card.coinCost,
        season: card.season,
      },
      create: {
        name: card.name,
        description: card.description,
        rarity: card.rarity,
        coinCost: card.coinCost,
        season: card.season,
      },
    })
    console.log(`  ✓ ${card.rarity} — ${card.name} (${card.coinCost} coins)`)
  }

  console.log(`\nDone! Seeded ${cards.length} cards.`)
}

seedCards()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
