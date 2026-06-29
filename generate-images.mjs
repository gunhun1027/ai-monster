// 批量生成网站logo和怪兽形象
// 使用Trae内置图片生成API
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 图片配置
const images = [
  {
    name: 'logo/logo-256',
    prompt: 'A cute purple monster mascot logo for an educational quiz game, round icon design, adorable purple dragon with big sparkly eyes and friendly smile, glowing question mark symbol, gradient purple and pink background, modern flat design, vector style, clean minimal, kawaii style, app icon',
    size: 'square_hd',
  },
  {
    name: 'logo/favicon',
    prompt: 'A minimalist purple monster egg icon, simple geometric shape, glowing purple gradient, flat design, favicon style, clean, no text',
    size: 'square_hd',
  },
  {
    name: 'monsters/monster-egg',
    prompt: 'A mysterious purple magical egg with glowing cracks and sparkles, fantasy game art style, purple and blue gradient, clean white background, cute and adorable, digital art, kawaii style, centered',
    size: 'square',
  },
  {
    name: 'monsters/monster-slime',
    prompt: 'A cute green slime monster with big round eyes and happy smile, droopy jelly body, fantasy game character, kawaii style, bright green color, clean white background, digital art, centered',
    size: 'square',
  },
  {
    name: 'monsters/monster-dragon',
    prompt: 'A cute baby dragon with small wings and big eyes, blue and purple scales, friendly expression, fantasy game character, kawaii style, clean white background, digital art, centered',
    size: 'square',
  },
  {
    name: 'monsters/monster-fire',
    prompt: 'A majestic fire dragon with orange and red scales, flaming wings, powerful pose, fierce but friendly eyes, fantasy game character, digital art, clean white background, centered',
    size: 'square',
  },
  {
    name: 'monsters/monster-divine',
    prompt: 'A legendary divine beast with golden and white colors, glowing aura, majestic wings, holy light, mythical creature, fantasy game art, clean white background, digital art, centered',
    size: 'square',
  },
]

// 生成单张图片
async function generateImage(config) {
  const params = new URLSearchParams({
    prompt: config.prompt,
    image_size: config.size,
  })
  const url = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?${params}`

  console.log(`正在生成: ${config.name}...`)

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''

    // 如果直接返回图片
    if (contentType.includes('image/')) {
      const buffer = Buffer.from(await response.arrayBuffer())
      return { buffer, name: config.name }
    }

    // 如果返回JSON（可能包含图片URL）
    const data = await response.json()
    if (data.url || data.image_url || data.data?.url) {
      const imageUrl = data.url || data.image_url || data.data?.url
      const imgResponse = await fetch(imageUrl)
      const buffer = Buffer.from(await imgResponse.arrayBuffer())
      return { buffer, name: config.name }
    }

    throw new Error(`未知响应格式: ${JSON.stringify(data).substring(0, 200)}`)
  } catch (error) {
    console.error(`生成失败 ${config.name}: ${error.message}`)
    return null
  }
}

// 保存图片到多个目录
function saveImage(buffer, name) {
  const dirs = [
    path.join(__dirname, 'assets'),
    path.join(__dirname, 'client', 'public', 'assets'),
  ]

  for (const dir of dirs) {
    const filePath = path.join(dir, `${name}.png`)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, buffer)
    console.log(`  已保存: ${filePath}`)
  }
}

// 主函数
async function main() {
  console.log('🎨 开始生成网站logo和怪兽形象...\n')

  // 并行生成所有图片（每批3个，避免并发过多）
  const batchSize = 3
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize)
    const results = await Promise.all(batch.map((config) => generateImage(config)))

    for (const result of results) {
      if (result) {
        saveImage(result.buffer, result.name)
      }
    }
  }

  console.log('\n✅ 所有图片生成完成！')
}

main().catch(console.error)
