/**
 * Card Image Generator
 *
 * Downloads AI-generated images for all 28 trading cards using
 * Hugging Face's free Inference API with the FLUX.1-schnell model.
 *
 * Usage: HF_TOKEN=hf_xxx npx tsx scripts/generate-card-images.ts
 *
 * The script skips cards that already have images, so it's safe to re-run.
 * Images are saved as JPEGs to public/cards/.
 */

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Config
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'cards')
const HF_TOKEN = process.env.HF_TOKEN
const MODEL_URL =
  'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell'

if (!HF_TOKEN) {
  console.error('Error: HF_TOKEN environment variable is required.')
  console.error('Usage: HF_TOKEN=hf_xxx npx tsx scripts/generate-card-images.ts')
  process.exit(1)
}

// Consistent style suffix for all prompts
const STYLE =
  'cute cartoon illustration, trading card game art style, vibrant colors, clean lines, centered subject, solid color background, digital art, high quality'

// Each card with a tailored image prompt
const cards: { name: string; filename: string; prompt: string }[] = [
  // === COMMON ===
  {
    name: 'Cat',
    filename: 'cat.jpg',
    prompt: `a cute orange tabby cat sitting and looking curious, big eyes, ${STYLE}`,
  },
  {
    name: 'Puppy',
    filename: 'puppy.jpg',
    prompt: `a cute golden retriever puppy playing, wagging tail, ${STYLE}`,
  },
  {
    name: 'Dog',
    filename: 'dog.jpg',
    prompt: `a loyal friendly dog sitting with tongue out, happy expression, ${STYLE}`,
  },
  {
    name: 'Chicken',
    filename: 'chicken.jpg',
    prompt: `a proud cartoon chicken standing in a farmyard, red comb, ${STYLE}`,
  },
  {
    name: 'Chick',
    filename: 'chick.jpg',
    prompt: `a tiny fluffy yellow baby chick, adorable, round body, ${STYLE}`,
  },
  {
    name: 'Cow',
    filename: 'cow.jpg',
    prompt: `a friendly black and white cartoon cow, happy face, standing in grass, ${STYLE}`,
  },

  // === RARE ===
  {
    name: 'Pumpkin Puppy',
    filename: 'pumpkin-puppy.jpg',
    prompt: `a cute puppy wearing a pumpkin halloween costume, autumn leaves around, ${STYLE}`,
  },
  {
    name: 'Autumn Cat',
    filename: 'autumn-cat.jpg',
    prompt: `a cozy cat curled up in colorful autumn leaves, warm orange and red colors, ${STYLE}`,
  },
  {
    name: 'Crow',
    filename: 'crow.jpg',
    prompt: `a mysterious black crow perched on a branch, glowing eyes, slightly spooky, ${STYLE}`,
  },
  {
    name: 'Zombie',
    filename: 'zombie.jpg',
    prompt: `a friendly cartoon zombie character, green skin, tattered clothes, not scary, silly expression, ${STYLE}`,
  },
  {
    name: 'Santa Sleigh',
    filename: 'santa-sleigh.jpg',
    prompt: `santa claus riding a sleigh through the night sky with reindeer, christmas stars, ${STYLE}`,
  },

  // === LEGENDARY ===
  {
    name: 'King',
    filename: 'king.jpg',
    prompt: `a cartoon king wearing a golden crown and royal robe, majestic pose, ${STYLE}`,
  },
  {
    name: 'Turkey',
    filename: 'turkey.jpg',
    prompt: `a proud thanksgiving turkey with colorful tail feathers spread out, ${STYLE}`,
  },
  {
    name: 'Megalodon',
    filename: 'megalodon.jpg',
    prompt: `a massive megalodon shark with huge jaws, underwater scene, ancient and powerful, ${STYLE}`,
  },
  {
    name: 'Baby Shark',
    filename: 'baby-shark.jpg',
    prompt: `a tiny adorable baby shark smiling, underwater with bubbles, small and cute, ${STYLE}`,
  },
  {
    name: 'Santa',
    filename: 'santa.jpg',
    prompt: `santa claus portrait, jolly face, red hat, white beard, twinkling eyes, christmas, ${STYLE}`,
  },
  {
    name: 'Ghost',
    filename: 'ghost.jpg',
    prompt: `a cute cartoon ghost floating with a mischievous smile, glowing white, spooky but friendly, ${STYLE}`,
  },
  {
    name: 'King of Hearts',
    filename: 'king-of-hearts.jpg',
    prompt: `the king of hearts playing card character, red heart symbol, royal outfit, ${STYLE}`,
  },

  // === MYSTICAL ===
  {
    name: 'Spooky Ghost',
    filename: 'spooky-ghost.jpg',
    prompt: `a scary ghost with glowing red eyes, chains, dark purple aura, haunted, ${STYLE}`,
  },
  {
    name: 'Hamsta Claus',
    filename: 'hamsta-claus.jpg',
    prompt: `a cute hamster wearing a tiny santa claus outfit and hat, holding a small present, ${STYLE}`,
  },
  {
    name: 'Phantom King',
    filename: 'phantom-king.jpg',
    prompt: `a ghostly king figure, half transparent, wearing a crown, purple and blue ethereal glow, ${STYLE}`,
  },
  {
    name: 'Tim the Alien',
    filename: 'tim-the-alien.jpg',
    prompt: `a friendly green alien character named Tim, big head, big eyes, holding a book, spaceship in background, ${STYLE}`,
  },
  {
    name: 'Rainbow Astronaut',
    filename: 'rainbow-astronaut.jpg',
    prompt: `an astronaut in a white spacesuit floating in space with a rainbow trail behind them, stars and planets, ${STYLE}`,
  },
  {
    name: 'Pele',
    filename: 'pele.jpg',
    prompt: `a legendary cartoon footballer doing a bicycle kick, golden jersey number 10, soccer ball, stadium lights, ${STYLE}`,
  },

  // === IRIDESCENT ===
  {
    name: 'Lex',
    filename: 'lex.jpg',
    prompt: `a cool confident kid with blonde hair wearing a red number 7 soccer jersey, standing like a champion, sparkling golden aura, ${STYLE}`,
  },
  {
    name: 'Mack',
    filename: 'mack.jpg',
    prompt: `a strong athletic 8 year old boy with blonde hair, both arms visible, wearing an orange Dutch Netherlands soccer jersey, kicking a soccer ball, confident happy pose, full body, ${STYLE}`,
  },
  {
    name: 'Lucy',
    filename: 'lucy.jpg',
    prompt: `a cute pudgy blonde girl in a pink princess dress, tiara, cheerful smile, sparkling stars around her, ${STYLE}`,
  },
  {
    name: 'Pippa',
    filename: 'pippa.jpg',
    prompt: `a fluffy brown shih tzu maltese mix dog, adorable face, big eyes, sitting with a treat, ${STYLE}`,
  },
]

/** Generate an image using Hugging Face Inference API */
async function generateImage(prompt: string, filename: string): Promise<void> {
  const response = await fetch(MODEL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: prompt }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const filePath = path.join(OUTPUT_DIR, filename)
  await writeFile(filePath, buffer)
}

/** Wait for a specified number of milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  console.log('🎨 Card Image Generator (Hugging Face FLUX.1-schnell)')
  console.log(`   Generating ${cards.length} images`)
  console.log(`   Output: ${OUTPUT_DIR}\n`)

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true })
  }

  let success = 0
  let failed = 0

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]
    const outputPath = path.join(OUTPUT_DIR, card.filename)

    // Skip if already generated
    if (existsSync(outputPath)) {
      console.log(`  ⏭️  [${i + 1}/${cards.length}] ${card.name} — already exists, skipping`)
      success++
      continue
    }

    console.log(`  🖼️  [${i + 1}/${cards.length}] ${card.name} — generating...`)

    try {
      await generateImage(card.prompt, card.filename)
      console.log(`  ✅  ${card.name} — saved to ${card.filename}`)
      success++
    } catch (error) {
      console.error(
        `  ❌  ${card.name} — ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      failed++
    }

    // Wait 2 seconds between requests to respect rate limits
    if (i < cards.length - 1) {
      await sleep(2000)
    }
  }

  console.log(`\n🎉 Done! ${success} succeeded, ${failed} failed.`)

  if (failed > 0) {
    console.log('   Re-run the script to retry failed images (existing ones are skipped).')
  }
}

main().catch((e) => {
  console.error('Script failed:', e)
  process.exit(1)
})
