/**
 * AI出题服务
 * 支持 NVIDIA NIM / DeepSeek / 通义千问 / 演示模式
 * 使用 OpenAI 兼容格式调用
 */

import axios from 'axios'

const AI_API_KEY = process.env.AI_API_KEY
const AI_BASE_URL = process.env.AI_BASE_URL || 'https://integrate.api.nvidia.com/v1'
const AI_MODEL = process.env.AI_MODEL || 'deepseek-ai/deepseek-v4-flash'
const AI_DEMO_MODE = !AI_API_KEY || AI_API_KEY === 'demo'

export interface AiQuestionConfig {
  subjectName: string
  topic: string // 知识点，如 "英语时态"、"初中几何"
  difficulty: number // 1-5
  count: number // 生成数量，默认5
  questionType: 'choice' | 'fillblank' | 'mixed'
}

export interface GeneratedQuestion {
  content: string
  options: string[]
  answer: string // 选择题: "0"-"3"，填空题: 答案文本
  type: 'choice' | 'fillblank'
  explanation: string
  tags: string[]
  difficulty: number
  source: 'ai' | 'demo' // 标识题目来源：AI 生成 or 演示模式回退
}

/**
 * 学科定制Prompt策略
 */
const SUBJECT_STRATEGIES: Record<string, string> = {
  '英语': `英语出题策略：
- 侧重语法辨析、词汇搭配和语境理解
- 单选题的干扰项要包含典型的中式英语错误（如时态混淆、单复数错误、介词误用）
- 可以包含情景对话类题目
- 英语句子要自然地道`,

  '数学': `数学出题策略：
- 侧重逻辑推理、计算能力和几何直观
- 几何题：如果涉及图形，必须用**文字描述图形**（如"已知直角三角形ABC，∠C=90°，AC=3，BC=4"），**禁止要求生成图片或图像**
- 支持LaTeX数学公式（如 $x^2 + y^2 = r^2$、$\\frac{a}{b}$、$\\sqrt{2}$、$\\angle A$ 等）
- 可以包含证明题、计算题、应用题
- 选项中的数字要精心设计，常见错误答案要作为干扰项`,

  '语文': `语文出题策略：
- 侧重文学常识、古文理解和语言运用
- 古诗词题目要引用准确的原文
- 文言文题目要考查实词、虚词和句式理解
- 可以包含阅读理解类题目（提供简短文本后提问）`,

  '历史': `历史出题策略：
- 侧重时间线、因果关系和史料分析
- 可以包含材料分析题（提供一段史料后提问）
- 涉及地图或图片时，用文字描述地理位置或场景
- 考查历史事件的影响和意义`,
}

/**
 * 难度详细描述
 */
const DIFFICULTY_DESCRIPTIONS = [
  '入门（1/5）：适合零基础或刚接触该知识点的学生。题目直接明了，无复杂陷阱，基本概念的直接考查。',
  '基础（2/5）：需要理解基本概念，题目有简单变形，但不需要综合运用。考查单一知识点的掌握。',
  '中等（3/5）：需要综合运用2-3个知识点，有常见的易错陷阱，需要一定的分析能力。',
  '较难（4/5）：需要深入理解和灵活应用，干扰项设计精巧，可能需要多步推理或逆向思维。',
  '困难（5/5）：高难度综合题，接近竞赛水平，需要创新思维和扎实的知识储备。',
]

/**
 * 生成AI Prompt
 */
function buildPrompt(config: AiQuestionConfig): string {
  const { subjectName, topic, difficulty, count, questionType } = config

  const diffLabel = ['入门', '基础', '中等', '较难', '困难'][difficulty - 1] || '中等'
  const diffDesc = DIFFICULTY_DESCRIPTIONS[difficulty - 1] || DIFFICULTY_DESCRIPTIONS[2]

  let typeInstruction = ''
  if (questionType === 'choice') {
    typeInstruction = '全部生成单选题（4个选项，只有1个正确答案）'
  } else if (questionType === 'fillblank') {
    typeInstruction = '全部生成填空题（在题目中用"____"标记填空位置）'
  } else {
    typeInstruction = '混合生成单选题和填空题（约70%单选题 + 30%填空题）'
  }

  // 匹配学科策略
  let subjectStrategy = ''
  for (const [key, strategy] of Object.entries(SUBJECT_STRATEGIES)) {
    if (subjectName.includes(key) || topic.includes(key)) {
      subjectStrategy = strategy
      break
    }
  }

  return `你是一位资深的教育出题专家，拥有10年以上一线教学经验。请根据以下要求生成${count}道高质量的${subjectName}题目：

========== 出题参数 ==========
【学科】${subjectName}
【知识点】${topic}
【难度】${diffLabel}（${difficulty}/5）
【难度说明】${diffDesc}
【题型】${typeInstruction}

========== 学科策略 ==========
${subjectStrategy || '题目内容清晰、准确，符合教学大纲要求。'}

========== 通用要求 ==========
1. 单选题规范：
   - 必须有且仅有4个选项（A/B/C/D）
   - 只有1个正确答案，其余3个干扰项必须有迷惑性
   - 干扰项要基于学生常见错误设计，不能是明显错误的答案
   - 选项长度尽量相近，避免正确答案过长或过短

2. 填空题规范：
   - 用"____"标记填空位置
   - 答案必须唯一且明确
   - 如果是数学公式答案，用LaTeX格式书写

3. 解析规范：
   - 每道题必须附带详细解析
   - 解析要说明：正确选项为什么对 + 其他选项为什么错
   - 解析中要指出本题考查的核心知识点

4. 图片/图形处理（非常重要）：
   - **严禁生成图片、图像或要求用户提供图片**
   - 几何题必须用文字描述图形（如"已知△ABC中，∠A=30°，AB=5"）
   - 涉及图形的题目，所有已知条件必须在文字中完整给出

5. 数学公式支持：
   - 数学题目支持LaTeX格式（如 $x^2$、$\\frac{1}{2}$、$\\sqrt{3}$、$\\angle A$ 等）
   - 公式用 $...$ 包裹

========== 输出格式 ==========
请严格按以下JSON格式返回（只返回JSON，不要任何其他文字、不要markdown代码块）：

{
  "questions": [
    {
      "content": "题目内容（支持LaTeX公式如 $x^2+y^2=r^2$）",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": "0",
      "type": "choice",
      "explanation": "详细解析：正确选项的分析 + 干扰项为什么错",
      "tags": ["知识点标签1", "知识点标签2"]
    }
  ]
}

字段说明：
- content: 题目内容，数学用LaTeX，几何用文字描述图形
- options: 4个选项的文本数组（填空题填空数组[]）
- answer: 选择题填"0"/"1"/"2"/"3"，填空题填答案文本
- type: "choice" 或 "fillblank"
- explanation: 必须包含完整解析
- tags: 知识点标签数组`
}

/**
 * 演示模式：使用模板生成模拟题目
 * 当没有配置API Key时使用，确保功能可演示
 */
function generateDemoQuestions(config: AiQuestionConfig): GeneratedQuestion[] {
  const { subjectName, topic, difficulty, count } = config

  const templates: Record<string, Omit<GeneratedQuestion, 'source'>[]> = {
    '英语': [
      {
        content: `What is the correct form of the verb? "She ____ to the gym every morning."`,
        options: ['go', 'goes', 'going', 'went'],
        answer: '1',
        type: 'choice',
        explanation: '主语 She 是第三人称单数，一般现在时动词要加 -es，所以用 goes。',
        tags: ['一般现在时', '动词变化'],
        difficulty,
      },
      {
        content: `Choose the correct word: "This is the ____ book I have ever read."`,
        options: ['more interesting', 'most interesting', 'interesting', 'interestinger'],
        answer: '1',
        type: 'choice',
        explanation: '形容词最高级前加 the，interesting 是多音节词，最高级用 most interesting。',
        tags: ['形容词最高级', '比较级'],
        difficulty,
      },
      {
        content: `Fill in the blank: "By the time we arrived, the movie ____ already ____."`,
        options: ['had...started', 'has...started', 'was...starting', 'did...start'],
        answer: '0',
        type: 'choice',
        explanation: 'By the time + 过去时间，主句用过去完成时 had + 过去分词。',
        tags: ['过去完成时', '时间状语从句'],
        difficulty,
      },
    ],
    '数学': [
      {
        content: `已知直角三角形的两条直角边分别为 3 和 4，则斜边长为 ____.`,
        options: ['5', '6', '7', '8'],
        answer: '0',
        type: 'choice',
        explanation: '根据勾股定理：a² + b² = c²，3² + 4² = 9 + 16 = 25 = 5²，所以斜边为 5。',
        tags: ['勾股定理', '直角三角形'],
        difficulty,
      },
      {
        content: `若 $x^2 - 5x + 6 = 0$，则 $x$ 的值为 ____.`,
        options: ['1 或 6', '2 或 3', '-2 或 -3', '-1 或 -6'],
        answer: '1',
        type: 'choice',
        explanation: '因式分解：(x-2)(x-3)=0，所以 x=2 或 x=3。',
        tags: ['一元二次方程', '因式分解'],
        difficulty,
      },
      {
        content: `已知△ABC中，$\\angle C = 90°$，$AC = 3$，$BC = 4$，点D是AB的中点，则 $CD =$ ____.`,
        options: ['2', '2.5', '3', '5'],
        answer: '1',
        type: 'choice',
        explanation: '直角三角形斜边中线等于斜边的一半。先求斜边 AB = √(3²+4²) = 5，所以 CD = AB/2 = 2.5。',
        tags: ['直角三角形', '斜边中线定理'],
        difficulty,
      },
      {
        content: `如图，正方形ABCD边长为4，E是BC中点，$\\triangle AEF$ 是等边三角形，则 $BF =$ ____.`,
        options: ['$2\\sqrt{3}$', '2', '$\\sqrt{3}$', '4'],
        answer: '0',
        type: 'choice',
        explanation: 'E是BC中点，BE=2。等边三角形AEF中，AE=AF=EF。由勾股定理 AE²=AB²+BE²=16+4=20。在△ABF中利用余弦定理可求得 BF = 2√3。',
        tags: ['正方形', '等边三角形', '勾股定理'],
        difficulty,
      },
    ],
    '语文': [
      {
        content: `"床前明月光"的下一句是 ____.`,
        options: ['疑是地上霜', '举头望明月', '低头思故乡', '唯见江心秋月白'],
        answer: '0',
        type: 'choice',
        explanation: '出自李白《静夜思》：床前明月光，疑是地上霜。举头望明月，低头思故乡。',
        tags: ['古诗词', '李白'],
        difficulty,
      },
      {
        content: `"学而不思则罔"中的"罔"意思是 ____.`,
        options: ['迷惑而无所得', '网络', '没有', '忘记'],
        answer: '0',
        type: 'choice',
        explanation: '"罔"意为迷惑而无所得。整句意思是：只学习不思考就会迷惑而无所得。',
        tags: ['文言文', '论语'],
        difficulty,
      },
    ],
    '历史': [
      {
        content: `秦始皇统一六国的时间是公元前 ____.`,
        options: ['221年', '220年', '210年', '230年'],
        answer: '0',
        type: 'choice',
        explanation: '公元前221年，秦始皇嬴政完成统一六国的大业，建立了中国历史上第一个中央集权的封建国家。',
        tags: ['秦朝', '秦始皇'],
        difficulty,
      },
      {
        content: `中国古代四大发明不包括 ____.`,
        options: ['造纸术', '指南针', '火药', '地动仪'],
        answer: '3',
        type: 'choice',
        explanation: '四大发明是造纸术、指南针、火药、印刷术。地动仪是张衡发明的地震仪器，但不属于四大发明。',
        tags: ['四大发明', '中国古代科技'],
        difficulty,
      },
    ],
  }

  // 匹配学科模板
  let questions: Omit<GeneratedQuestion, 'source'>[] = []
  for (const [key, value] of Object.entries(templates)) {
    if (subjectName.includes(key) || topic.includes(key)) {
      questions = [...questions, ...value]
    }
  }

  // 如果没有匹配到，使用通用模板
  if (questions.length === 0) {
    questions = [
      {
        content: `关于${topic}的知识点，以下说法正确的是：`,
        options: ['选项A描述', '选项B描述', '选项C描述', '选项D描述'],
        answer: '0',
        type: 'choice',
        explanation: `本题考查${topic}的核心概念，正确答案是A。`,
        tags: [topic],
        difficulty,
      },
      {
        content: `${topic}中，____ 是一个重要的基础概念。`,
        options: [],
        answer: '核心概念',
        type: 'fillblank',
        explanation: `在${topic}中，核心概念是理解和应用的基础。`,
        tags: [topic],
        difficulty,
      },
    ]
  }

  // 调整题目数量
  const result: GeneratedQuestion[] = []
  for (let i = 0; i < count; i++) {
    result.push({ ...questions[i % questions.length], source: 'demo' })
  }

  return result
}

/**
 * 调用AI API生成题目
 */
export async function generateQuestionsByAI(
  config: AiQuestionConfig
): Promise<GeneratedQuestion[]> {
  // 演示模式
  if (AI_DEMO_MODE) {
    return generateDemoQuestions(config)
  }

  try {
    const prompt = buildPrompt(config)

    const response = await axios.post(
      `${AI_BASE_URL}/chat/completions`,
      {
        model: AI_MODEL,
        messages: [
          { role: 'system', content: '你是一个专业的教育出题专家，只返回合法的JSON格式数据。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      },
      {
        headers: {
          Authorization: `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    )

    const content = response.data.choices?.[0]?.message?.content || ''

    // 清理可能的 markdown 代码块
    const jsonStr = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim()

    const parsed = JSON.parse(jsonStr)
    const questions: GeneratedQuestion[] = parsed.questions || []

    // 校验和补充字段
    return questions.map((q) => ({
      ...q,
      difficulty: config.difficulty,
      type: q.type || 'choice',
      options: q.options || [],
      tags: q.tags || [config.topic],
      explanation: q.explanation || '暂无解析',
      source: 'ai' as const,
    }))
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[AI出题] API调用失败:', msg)
    return generateDemoQuestions(config)
  }
}

/**
 * 检查是否配置了AI API
 */
export function isAiEnabled(): boolean {
  return true // 演示模式始终可用
}

/**
 * 获取AI状态信息
 */
export function getAiStatus() {
  return {
    enabled: true,
    demoMode: AI_DEMO_MODE,
    model: AI_MODEL,
    baseUrl: AI_BASE_URL,
  }
}
