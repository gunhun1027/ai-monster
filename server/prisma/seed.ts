// AI出题怪兽 - Prisma 种子数据
// 初始化学科、题目、成就、管理员账号和系统配置

import { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ============ 题目数据定义 ============

// 英语题目（20道）：根据指定单词生成的中文释义选择题
const englishQuestions = [
  { content: 'Apple 的中文意思是？', options: ['苹果', '橘子', '香蕉', '梨'], answer: 0, difficulty: 1 },
  { content: 'Beautiful 的中文意思是？', options: ['丑陋的', '美丽的', '平凡的', '奇怪的'], answer: 1, difficulty: 2 },
  { content: 'Computer 的中文意思是？', options: ['电视机', '手机', '电脑', '收音机'], answer: 2, difficulty: 1 },
  { content: 'Elephant 的中文意思是？', options: ['老虎', '狮子', '熊', '大象'], answer: 3, difficulty: 1 },
  { content: 'Friend 的中文意思是？', options: ['敌人', '朋友', '陌生人', '邻居'], answer: 1, difficulty: 1 },
  { content: 'Garden 的中文意思是？', options: ['田野', '森林', '花园', '草地'], answer: 2, difficulty: 2 },
  { content: 'Happy 的中文意思是？', options: ['悲伤的', '愤怒的', '快乐的', '疲倦的'], answer: 2, difficulty: 1 },
  { content: 'Island 的中文意思是？', options: ['大陆', '岛屿', '沙漠', '山脉'], answer: 1, difficulty: 2 },
  { content: 'Journey 的中文意思是？', options: ['回家', '停留', '旅行', '休息'], answer: 2, difficulty: 3 },
  { content: 'Knowledge 的中文意思是？', options: ['无知', '知识', '猜测', '谣言'], answer: 1, difficulty: 4 },
  { content: 'Library 的中文意思是？', options: ['书店', '教室', '图书馆', '办公室'], answer: 2, difficulty: 2 },
  { content: 'Mountain 的中文意思是？', options: ['河流', '湖泊', '平原', '山'], answer: 3, difficulty: 1 },
  { content: 'Notebook 的中文意思是？', options: ['课本', '笔记本', '小说', '杂志'], answer: 1, difficulty: 1 },
  { content: 'Ocean 的中文意思是？', options: ['小溪', '池塘', '海洋', '水井'], answer: 2, difficulty: 2 },
  { content: 'Picture 的中文意思是？', options: ['音乐', '图片', '文字', '声音'], answer: 1, difficulty: 1 },
  { content: 'Quiet 的中文意思是？', options: ['吵闹的', '安静的', '热闹的', '欢乐的'], answer: 1, difficulty: 2 },
  { content: 'Rainbow 的中文意思是？', options: ['乌云', '彩虹', '闪电', '雷声'], answer: 1, difficulty: 3 },
  { content: 'School 的中文意思是？', options: ['医院', '超市', '学校', '公园'], answer: 2, difficulty: 1 },
  { content: 'Teacher 的中文意思是？', options: ['学生', '老师', '医生', '工人'], answer: 1, difficulty: 1 },
  { content: 'Umbrella 的中文意思是？', options: ['帽子', '雨伞', '鞋子', '手套'], answer: 1, difficulty: 2 },
]

// 初中数学题目（20道）：涵盖代数、几何、方程等
const mathQuestions = [
  { content: '若 x + 5 = 12，则 x 等于多少？', options: ['5', '7', '6', '8'], answer: 1, difficulty: 1 },
  { content: '一个三角形三个内角之和等于多少度？', options: ['90°', '180°', '270°', '360°'], answer: 1, difficulty: 1 },
  { content: '下列哪个数是质数？', options: ['4', '9', '13', '15'], answer: 2, difficulty: 2 },
  { content: '方程 2x = 10 的解是？', options: ['x = 3', 'x = 4', 'x = 5', 'x = 6'], answer: 2, difficulty: 1 },
  { content: '圆的面积公式是？', options: ['2πr', 'πr²', 'πd', '2πr²'], answer: 1, difficulty: 2 },
  { content: '若 |a| = 5，则 a 的值是？', options: ['5', '-5', '5或-5', '0'], answer: 2, difficulty: 2 },
  { content: '下列哪组数能构成直角三角形的三边？', options: ['1,2,3', '3,4,5', '2,3,4', '4,5,6'], answer: 1, difficulty: 3 },
  { content: '计算：(-3)² = ？', options: ['-6', '6', '-9', '9'], answer: 3, difficulty: 2 },
  { content: '一元二次方程 x² - 4 = 0 的解是？', options: ['x = 2', 'x = -2', 'x = ±2', 'x = 4'], answer: 2, difficulty: 3 },
  { content: '正方形有几种对称轴？', options: ['2条', '3条', '4条', '6条'], answer: 2, difficulty: 2 },
  { content: '若 3x - 2 = 7，则 x 等于？', options: ['2', '3', '4', '5'], answer: 1, difficulty: 2 },
  { content: '两个互补的角之和为？', options: ['90°', '180°', '270°', '360°'], answer: 1, difficulty: 1 },
  { content: '下列哪个是最简分数？', options: ['2/4', '3/6', '5/8', '6/9'], answer: 2, difficulty: 2 },
  { content: '已知 a:b = 2:3，若 a = 6，则 b 等于？', options: ['8', '9', '10', '12'], answer: 1, difficulty: 3 },
  { content: '函数 y = 2x + 1 在 y 轴上的截距是？', options: ['0', '1', '2', '-1'], answer: 1, difficulty: 3 },
  { content: '圆周率 π 约等于？', options: ['3.14', '2.71', '1.41', '1.73'], answer: 0, difficulty: 1 },
  { content: '一个正方体的棱长为 2，则其体积为？', options: ['4', '6', '8', '12'], answer: 2, difficulty: 2 },
  { content: '不等式 2x > 6 的解集是？', options: ['x > 2', 'x > 3', 'x > 4', 'x < 3'], answer: 1, difficulty: 2 },
  { content: '下列哪个不是无理数？', options: ['√2', 'π', '0.5', '√3'], answer: 2, difficulty: 4 },
  { content: '相似三角形的对应边成比例，对应角？', options: ['相等', '互补', '互余', '不成比例'], answer: 0, difficulty: 3 },
]

// 高中历史题目（20道）：涵盖中国历史和世界历史
const historyQuestions = [
  { content: '中国历史上第一个统一的封建王朝是？', options: ['秦朝', '汉朝', '周朝', '商朝'], answer: 0, difficulty: 1 },
  { content: '丝绸之路的开拓者是？', options: ['张骞', '玄奘', '郑和', '班超'], answer: 0, difficulty: 2 },
  { content: '下列哪位是唐朝的著名皇帝？', options: ['刘邦', '李世民', '赵匡胤', '朱元璋'], answer: 1, difficulty: 2 },
  { content: '鸦片战争爆发于哪一年？', options: ['1839年', '1840年', '1842年', '1856年'], answer: 1, difficulty: 2 },
  { content: '辛亥革命爆发于哪一年？', options: ['1898年', '1911年', '1919年', '1921年'], answer: 1, difficulty: 2 },
  { content: '《史记》的作者是？', options: ['班固', '司马迁', '司马光', '陈寿'], answer: 1, difficulty: 2 },
  { content: '中国古代四大发明不包括下列哪一项？', options: ['造纸术', '印刷术', '地动仪', '火药'], answer: 2, difficulty: 3 },
  { content: '文艺复兴运动最早起源于哪个国家？', options: ['法国', '英国', '意大利', '德国'], answer: 2, difficulty: 3 },
  { content: '第一次世界大战开始于哪一年？', options: ['1912年', '1914年', '1916年', '1918年'], answer: 1, difficulty: 3 },
  { content: '美国独立宣言发表于哪一年？', options: ['1776年', '1789年', '1812年', '1865年'], answer: 0, difficulty: 3 },
  { content: '下列哪个朝代被称为"盛唐"？', options: ['唐太宗时期', '唐玄宗开元时期', '唐高宗时期', '武则天时期'], answer: 1, difficulty: 3 },
  { content: '法国大革命爆发于哪一年？', options: ['1776年', '1789年', '1799年', '1804年'], answer: 1, difficulty: 3 },
  { content: '郑和下西洋发生在哪个朝代？', options: ['唐朝', '宋朝', '明朝', '清朝'], answer: 2, difficulty: 2 },
  { content: '《马关条约》签订于哪次战争之后？', options: ['鸦片战争', '甲午中日战争', '八国联军侵华', '抗日战争'], answer: 1, difficulty: 3 },
  { content: '下列哪位不是三国时期的人物？', options: ['曹操', '刘备', '孙权', '赵匡胤'], answer: 3, difficulty: 2 },
  { content: '古巴比伦的《汉谟拉比法典》是用什么文字刻写的？', options: ['象形文字', '楔形文字', '甲骨文', '拉丁文'], answer: 1, difficulty: 4 },
  { content: '第二次世界大战结束于哪一年？', options: ['1943年', '1944年', '1945年', '1946年'], answer: 2, difficulty: 2 },
  { content: '中国近代史上第一个不平等条约是？', options: ['《南京条约》', '《马关条约》', '《辛丑条约》', '《北京条约》'], answer: 0, difficulty: 3 },
  { content: '古希腊文明起源于哪个地区？', options: ['尼罗河流域', '两河流域', '爱琴海地区', '印度河流域'], answer: 2, difficulty: 4 },
  { content: '新中国成立于哪一年？', options: ['1945年', '1949年', '1950年', '1956年'], answer: 1, difficulty: 1 },
]

// 初中语文题目（20道）：涵盖古诗词、文学常识、文言文
const chineseQuestions = [
  { content: '"床前明月光"的作者是？', options: ['杜甫', '李白', '王维', '白居易'], answer: 1, difficulty: 1 },
  { content: '"春眠不觉晓"出自哪首诗？', options: ['《静夜思》', '《春晓》', '《登鹳雀楼》', '《悯农》'], answer: 1, difficulty: 1 },
  { content: '《红楼梦》的作者是？', options: ['罗贯中', '施耐庵', '吴承恩', '曹雪芹'], answer: 3, difficulty: 2 },
  { content: '"三人行，必有我师焉"出自？', options: ['《孟子》', '《论语》', '《大学》', '《中庸》'], answer: 1, difficulty: 2 },
  { content: '下列哪位被称为"诗圣"？', options: ['李白', '杜甫', '王维', '苏轼'], answer: 1, difficulty: 2 },
  { content: '"但愿人长久，千里共婵娟"中的"婵娟"指？', options: ['美女', '月亮', '太阳', '星星'], answer: 1, difficulty: 3 },
  { content: '《西游记》中的孙悟空的武器是？', options: ['九齿钉耙', '金箍棒', '降妖宝杖', '青龙偃月刀'], answer: 1, difficulty: 1 },
  { content: '"欲穷千里目，更上一层楼"出自？', options: ['王之涣《登鹳雀楼》', '李白《望庐山瀑布》', '杜甫《春望》', '王维《鹿柴》'], answer: 0, difficulty: 2 },
  { content: '"路漫漫其修远兮"的作者是？', options: ['孔子', '屈原', '司马迁', '庄子'], answer: 1, difficulty: 3 },
  { content: '《三国演义》的作者是？', options: ['罗贯中', '施耐庵', '吴承恩', '曹雪芹'], answer: 0, difficulty: 2 },
  { content: '"会当凌绝顶，一览众山小"描写的是哪座山？', options: ['华山', '泰山', '黄山', '衡山'], answer: 1, difficulty: 3 },
  { content: '下列哪个成语出自《庄子》？', options: ['守株待兔', '刻舟求剑', '庖丁解牛', '掩耳盗铃'], answer: 2, difficulty: 4 },
  { content: '"先天下之忧而忧，后天下之乐而乐"出自？', options: ['欧阳修《醉翁亭记》', '范仲淹《岳阳楼记》', '苏轼《赤壁赋》', '王安石《游褒禅山记》'], answer: 1, difficulty: 3 },
  { content: '《水调歌头·明月几时有》的作者是？', options: ['李白', '杜甫', '苏轼', '辛弃疾'], answer: 2, difficulty: 2 },
  { content: '"桃花潭水深千尺，不及汪伦送我情"中"汪伦"是？', options: ['李白的朋友', '杜甫的字', '王维的号', '白居易的别号'], answer: 0, difficulty: 3 },
  { content: '被称为"唐宋八大家"之一的苏轼是哪个朝代的人？', options: ['唐朝', '宋朝', '明朝', '清朝'], answer: 1, difficulty: 2 },
  { content: '《诗经》共有多少篇？', options: ['250篇', '300篇', '305篇', '350篇'], answer: 2, difficulty: 4 },
  { content: '"出师未捷身先死，长使英雄泪满襟"描写的是？', options: ['刘备', '关羽', '诸葛亮', '张飞'], answer: 2, difficulty: 3 },
  { content: '下列哪部作品不属于"四书"？', options: ['《大学》', '《中庸》', '《论语》', '《春秋》'], answer: 3, difficulty: 4 },
  { content: '"落红不是无情物，化作春泥更护花"的作者是？', options: ['龚自珍', '林则徐', '魏源', '黄遵宪'], answer: 0, difficulty: 3 },
]

// ============ 主函数 ============

async function main() {
  console.log('🌱 开始初始化种子数据...\n')

  // ---- 1. 清理旧数据（避免外键冲突） ----
  console.log('🧹 清理旧数据...')
  await prisma.userAchievement.deleteMany()
  await prisma.quizRecord.deleteMany()
  await prisma.question.deleteMany()
  await prisma.subject.deleteMany()
  await prisma.achievement.deleteMany()
  await prisma.systemConfig.deleteMany()
  // 保留普通用户，仅清理管理员账号（避免误删真实用户数据，但种子通常需要干净环境）
  await prisma.user.deleteMany({
    where: { role: 'admin' }
  })
  console.log('✅ 旧数据已清理\n')

  // ---- 2. 创建学科 ----
  console.log('📚 创建学科...')
  const subjects = [
    { name: '英语单词 🧠', description: '日常英语单词学习', icon: '🧠' },
    { name: '初中数学 📐', description: '初中数学知识点', icon: '📐' },
    { name: '高中历史 📜', description: '高中历史知识', icon: '📜' },
    { name: '初中语文 📖', description: '初中语文文学常识', icon: '📖' },
  ]

  const subjectRecords = []
  for (const subject of subjects) {
    const record = await prisma.subject.create({
      data: subject,
    })
    subjectRecords.push(record)
    console.log(`  ✓ 创建学科: ${subject.name}`)
  }
  console.log('✅ 学科创建完成\n')

  // ---- 3. 创建题目 ----
  console.log('❓ 创建题目...')

  const questionGroups = [
    { subjectId: subjectRecords[0].id, questions: englishQuestions, label: '英语单词' },
    { subjectId: subjectRecords[1].id, questions: mathQuestions, label: '初中数学' },
    { subjectId: subjectRecords[2].id, questions: historyQuestions, label: '高中历史' },
    { subjectId: subjectRecords[3].id, questions: chineseQuestions, label: '初中语文' },
  ]

  let totalQuestions = 0
  for (const group of questionGroups) {
    await prisma.question.createMany({
      data: group.questions.map((q) => ({
        subjectId: group.subjectId,
        content: q.content,
        options: JSON.stringify(q.options),
        answer: String(q.answer),
        difficulty: q.difficulty,
      })),
    })
    totalQuestions += group.questions.length
    console.log(`  ✓ ${group.label}: ${group.questions.length} 道题目`)
  }
  console.log(`✅ 题目创建完成，共 ${totalQuestions} 道\n`)

  // ---- 4. 创建成就 ----
  console.log('🏆 创建成就...')
  const achievements = [
    { name: '破壳而出 🐣', icon: '🐣', description: '完成第一次答题', condition: 'first_quiz', threshold: 1 },
    { name: '坚持不懈 🔥', icon: '🔥', description: '连续学习7天', condition: 'streak_7', threshold: 7 },
    { name: '百题斩 💯', icon: '💯', description: '累计答对100题', condition: 'total_correct_100', threshold: 100 },
    { name: '传说降临 👑', icon: '👑', description: '怪兽进化为传说神兽', condition: 'monster_divine', threshold: 50 },
    { name: '连击大师 ⚡', icon: '⚡', description: '达成10连击', condition: 'combo_10', threshold: 10 },
    { name: '勤学之星 📚', icon: '📚', description: '完成50道题目', condition: 'total_quiz_50', threshold: 50 },
    { name: '龙之进化 🐉', icon: '🐉', description: '怪兽达到30级', condition: 'monster_level_30', threshold: 30 },
  ]

  for (const achievement of achievements) {
    await prisma.achievement.create({ data: achievement })
    console.log(`  ✓ 创建成就: ${achievement.name}`)
  }
  console.log('✅ 成就创建完成\n')

  // ---- 5. 创建管理员账号 ----
  console.log('👤 创建管理员账号...')
  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@monster.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
      monsterName: '管理员神兽',
    },
  })
  console.log('  ✓ 管理员账号已创建 (admin / admin123)')
  console.log('✅ 管理员账号创建完成\n')

  // ---- 6. 创建系统配置 ----
  console.log('⚙️ 创建系统配置...')
  const configs = [
    { key: 'announcement', value: '欢迎来到AI出题怪兽！答题喂养你的专属怪兽吧！' },
    { key: 'season_active', value: 'true' },
    { key: 'max_questions_per_round', value: '10' },
  ]

  for (const config of configs) {
    await prisma.systemConfig.create({ data: config })
    console.log(`  ✓ 配置项: ${config.key} = ${config.value}`)
  }
  console.log('✅ 系统配置创建完成\n')

  // ---- 7. 创建道具数据 ----
  console.log('🛍️ 创建道具数据...')
  const items = [
    { name: '红苹果', description: '恢复30点饥饿度', type: 'food', effect: 'hunger+30', price: 10, icon: '🍎' },
    { name: '鲜鱼', description: '恢复50点饥饿度和5点快乐度', type: 'food', effect: 'hunger+50,happiness+5', price: 20, icon: '🐟' },
    { name: '蛋糕', description: '恢复40点饥饿度和15点快乐度', type: 'food', effect: 'hunger+40,happiness+15', price: 30, icon: '🍰' },
    { name: '能量饮料', description: '30分钟内答题经验×1.5', type: 'consumable', effect: 'exp_boost_1.5_30min', price: 50, icon: '⚡' },
    { name: '幸运护符', description: '宝箱掉落率+10%', type: 'equipment', effect: 'chest_drop_rate+10%', price: 100, icon: '🍀', unlockedAt: 10 },
    { name: '学霸眼镜', description: '答题经验+20%', type: 'equipment', effect: 'exp+20%', price: 150, icon: '👓', unlockedAt: 15 },
    { name: '皇冠', description: '怪兽的华丽装饰', type: 'decoration', effect: 'none', price: 200, icon: '👑', unlockedAt: 20 },
  ]

  // 清理旧道具数据
  await prisma.userItem.deleteMany()
  await prisma.item.deleteMany()

  for (const item of items) {
    await prisma.item.create({ data: item })
    console.log(`  ✓ 创建道具: ${item.name}`)
  }
  console.log('✅ 道具创建完成\n')

  // ---- 8. 创建剧情系统数据（知识大陆 + NPC导师） ----
  console.log('🗺️ 创建剧情系统数据...')

  // 清理旧剧情数据
  await prisma.npcTask.deleteMany()
  await prisma.npcDialog.deleteMany()
  await prisma.userCard.deleteMany()
  await prisma.userStoryChoice.deleteMany()
  await prisma.knowledgeCard.deleteMany()
  await prisma.storyChoice.deleteMany()
  await prisma.storyNode.deleteMany()
  await prisma.storyChapter.deleteMany()
  await prisma.npcMentor.deleteMany()

  // 大陆和节点定义
  const chaptersData = [
    {
      subjectIndex: 0, // 英语单词 🧠
      name: '英语单词森林',
      description: '茂密的森林中隐藏着英语语法的秘密，驱散迷雾才能找到出口',
      icon: '🌲',
      themeColor: '#22c55e',
      order: 0,
      nodes: [
        { name: '时态之泉', description: '掌握一般现在时和一般过去时', order: 0, questionCount: 5, difficulty: 1, requiredStars: 0, rewardStars: 1 },
        { name: '语法峡谷', description: '穿越被动语态和从句的峡谷', order: 1, questionCount: 5, difficulty: 2, requiredStars: 1, rewardStars: 1 },
        { name: '阅读圣殿', description: '在圣殿中完成阅读理解挑战', order: 2, questionCount: 8, difficulty: 3, requiredStars: 2, rewardStars: 2 },
        { name: '词汇王座', description: 'Boss战！综合运用所有英语知识', order: 3, questionCount: 10, difficulty: 4, isBoss: true, requiredStars: 4, rewardStars: 3 },
      ],
    },
    {
      subjectIndex: 1, // 初中数学 📐
      name: '数学几何山脉',
      description: '高耸的山脉中藏着数学真理，攀登每一座山峰都需要智慧',
      icon: '🏔️',
      themeColor: '#3b82f6',
      order: 1,
      nodes: [
        { name: '函数峰', description: '攀登一次函数和二次函数的峰顶', order: 0, questionCount: 5, difficulty: 1, requiredStars: 0, rewardStars: 1 },
        { name: '几何谷', description: '穿越三角形和四边形的山谷', order: 1, questionCount: 5, difficulty: 2, requiredStars: 1, rewardStars: 1 },
        { name: '代数神殿', description: '解开方程和不等式的封印', order: 2, questionCount: 8, difficulty: 3, requiredStars: 2, rewardStars: 2 },
        { name: '数理之巅', description: 'Boss战！综合运用所有数学知识', order: 3, questionCount: 10, difficulty: 4, isBoss: true, requiredStars: 4, rewardStars: 3 },
      ],
    },
    {
      subjectIndex: 2, // 高中历史 📜
      name: '历史文明长河',
      description: '时间的长河奔流不息，每一段文明都等待你去探索',
      icon: '🏛️',
      themeColor: '#f59e0b',
      order: 2,
      nodes: [
        { name: '古文明之源', description: '探索四大古文明的起源', order: 0, questionCount: 5, difficulty: 1, requiredStars: 0, rewardStars: 1 },
        { name: '王朝兴衰', description: '见证历代王朝的兴衰更替', order: 1, questionCount: 5, difficulty: 2, requiredStars: 1, rewardStars: 1 },
        { name: '近代风云', description: '近代历史的波澜壮阔', order: 2, questionCount: 8, difficulty: 3, requiredStars: 2, rewardStars: 2 },
        { name: '文明之钟', description: 'Boss战！穿越时空的综合挑战', order: 3, questionCount: 10, difficulty: 4, isBoss: true, requiredStars: 4, rewardStars: 3 },
      ],
    },
    {
      subjectIndex: 3, // 初中语文 📖
      name: '语文诗词花园',
      description: '诗词歌赋在花园中绽放，每一朵都是千年的智慧',
      icon: '🌸',
      themeColor: '#ec4899',
      order: 3,
      nodes: [
        { name: '诗词小径', description: '漫步唐诗宋词的小径', order: 0, questionCount: 5, difficulty: 1, requiredStars: 0, rewardStars: 1 },
        { name: '文学亭台', description: '在亭台中品味文学常识', order: 1, questionCount: 5, difficulty: 2, requiredStars: 1, rewardStars: 1 },
        { name: '古文长廊', description: '穿越文言文的长廊', order: 2, questionCount: 8, difficulty: 3, requiredStars: 2, rewardStars: 2 },
        { name: '文心雕龙', description: 'Boss战！语文综合素养挑战', order: 3, questionCount: 10, difficulty: 4, isBoss: true, requiredStars: 4, rewardStars: 3 },
      ],
    },
  ]

  // NPC导师定义
  const npcMentorsData = [
    {
      subjectIndex: 0,
      name: '智语猫头鹰',
      avatar: '🦉',
      personality: '博学、优雅，说话喜欢用古语和谚语',
      greeting: '知识的探索者，欢迎来到英语单词森林。我是智语猫头鹰，愿智慧之光照亮你的前路。',
    },
    {
      subjectIndex: 1,
      name: '齿轮博士',
      avatar: '⚙️',
      personality: '严谨、逻辑控，说话像写证明题',
      greeting: '你好。我是齿轮博士。在数学的世界里，每一个结论都需要严格的证明。你准备好了吗？',
    },
    {
      subjectIndex: 2,
      name: '时光旅者',
      avatar: '⏳',
      personality: '讲故事高手，说话像在讲述史诗',
      greeting: '年轻人，历史的河流在你脚下流淌。我是时光旅者，带你穿越时空，见证文明的兴衰。',
    },
    {
      subjectIndex: 3,
      name: '墨韵先生',
      avatar: '🎨',
      personality: '诗意、浪漫，说话像念诗',
      greeting: '笔墨纸砚，皆为知己。我是墨韵先生，愿与你在文字的海洋中，共赴一场文学的盛宴。',
    },
  ]

  // 创建大陆和节点
  const chapterRecords = []
  for (const chapterData of chaptersData) {
    const subject = subjectRecords[chapterData.subjectIndex]
    const chapter = await prisma.storyChapter.create({
      data: {
        subjectId: subject.id,
        name: chapterData.name,
        description: chapterData.description,
        icon: chapterData.icon,
        themeColor: chapterData.themeColor,
        order: chapterData.order,
        nodes: {
          create: chapterData.nodes.map((n) => ({
            name: n.name,
            description: n.description,
            order: n.order,
            requiredStars: n.requiredStars,
            questionCount: n.questionCount,
            difficulty: n.difficulty,
            isBoss: n.isBoss || false,
            rewardStars: n.rewardStars,
          })),
        },
      },
      include: { nodes: { select: { id: true, order: true, isBoss: true } } },
    })
    chapterRecords.push(chapter)
    console.log(`  ✓ 创建大陆: ${chapter.name} (${chapterData.nodes.length}个节点)`)
  }

  // 创建NPC导师
  for (const mentorData of npcMentorsData) {
    const subject = subjectRecords[mentorData.subjectIndex]
    const mentor = await prisma.npcMentor.create({
      data: {
        subjectId: subject.id,
        name: mentorData.name,
        avatar: mentorData.avatar,
        personality: mentorData.personality,
        greeting: mentorData.greeting,
      },
    })
    console.log(`  ✓ 创建导师: ${mentor.name}`)
  }
  console.log('✅ 剧情系统数据创建完成\n')

  // ---- 9. 创建知识卡片数据 ----
  console.log('📇 创建知识卡片数据...')

  const knowledgeCardsData = [
    // 英语单词森林
    {
      subjectIndex: 0,
      cards: [
        { name: '一般现在时', content: '表示经常发生的动作或客观真理，动词用原形（第三人称单数加-s）', funFact: '莎士比亚的作品中大量使用一般现在时来增强戏剧感', rarity: 'common', icon: '🕐', themeColor: '#22c55e', dropRate: 0.3 },
        { name: '不规则动词', content: 'go-went-gone, see-saw-seen 等不规则变化需牢记', funFact: '英语中有超过200个不规则动词，都源自古英语', rarity: 'common', icon: '📝', themeColor: '#22c55e', dropRate: 0.3 },
        { name: '常用介词', content: 'in/on/at 表示时间和地点的用法区别', funFact: '介词是英语中最难掌握的词类之一', rarity: 'common', icon: '🔗', themeColor: '#22c55e', dropRate: 0.3 },
        { name: '被动语态', content: 'be + 过去分词，强调动作承受者而非执行者', funFact: '学术写作中被动语态使用频率是主动语态的3倍', rarity: 'rare', icon: '🔄', themeColor: '#22c55e', dropRate: 0.1 },
        { name: '虚拟语气', content: '表示假设或非真实情况，动词需用特定形式', funFact: 'If I were you 是最经典的虚拟语气例子', rarity: 'rare', icon: '💭', themeColor: '#22c55e', dropRate: 0.1 },
        { name: '莎士比亚名言', content: 'To be, or not to be, that is the question. — Hamlet', funFact: '这句台词出现在《哈姆雷特》第三幕第一场', rarity: 'epic', icon: '🎭', themeColor: '#22c55e', dropRate: 0.05 },
        { name: '语言大师认证', content: '掌握英语的终极证明，你已通晓语言的奥秘', funFact: '英语拥有超过17万个单词，是全球词汇量最大的语言', rarity: 'legendary', icon: '👑', themeColor: '#22c55e', dropRate: 0.01, condition: 'chapter_complete' },
      ],
    },
    // 初中数学
    {
      subjectIndex: 1,
      cards: [
        { name: '勾股定理', content: '直角三角形两直角边平方和等于斜边平方：a² + b² = c²', funFact: '毕达哥拉斯发现的这个定理在中国古代称为商高定理', rarity: 'common', icon: '📐', themeColor: '#3b82f6', dropRate: 0.3 },
        { name: '圆周率π', content: '圆的周长与直径之比，约等于3.14159...', funFact: 'π已计算到小数点后62.8万亿位', rarity: 'common', icon: '🔵', themeColor: '#3b82f6', dropRate: 0.3 },
        { name: '一元二次方程', content: 'ax² + bx + c = 0 (a≠0)，求根公式 x = (-b±√(b²-4ac))/2a', funFact: '判别式Δ=b²-4ac决定根的性质', rarity: 'common', icon: '✖️', themeColor: '#3b82f6', dropRate: 0.3 },
        { name: '黄金分割', content: '比值为(√5-1)/2 ≈ 0.618，自然界最美的比例', funFact: '达芬奇的名画《维特鲁威人》就运用了黄金分割', rarity: 'rare', icon: '📏', themeColor: '#3b82f6', dropRate: 0.1 },
        { name: '欧拉公式', content: 'e^(iπ) + 1 = 0，被誉为最美的数学公式', funFact: '它把数学中最重要的5个常数联系在了一起', rarity: 'rare', icon: '🌀', themeColor: '#3b82f6', dropRate: 0.1 },
        { name: '费马大定理', content: '当n>2时，x^n + y^n = z^n 没有正整数解', funFact: '费马在书页边写下这一定理，困扰数学家358年才被证明', rarity: 'epic', icon: '📖', themeColor: '#3b82f6', dropRate: 0.05 },
        { name: '数学家认证', content: '掌握数学的终极证明，你已具备逻辑思维的力量', funFact: '数学是宇宙的语言，毕达哥拉斯学派如是说', rarity: 'legendary', icon: '🧠', themeColor: '#3b82f6', dropRate: 0.01, condition: 'chapter_complete' },
      ],
    },
    // 高中历史
    {
      subjectIndex: 2,
      cards: [
        { name: '丝绸之路', content: '张骞出使西域开辟的古代贸易路线，连接东西方文明', funFact: '丝绸之路总长超过6440公里', rarity: 'common', icon: '🐫', themeColor: '#f59e0b', dropRate: 0.3 },
        { name: '四大发明', content: '造纸术、印刷术、火药、指南针，中国古代四大科技成就', funFact: '指南针最早用于航海是在北宋时期', rarity: 'common', icon: '📜', themeColor: '#f59e0b', dropRate: 0.3 },
        { name: '文艺复兴', content: '14-17世纪起源于意大利的思想文化运动，强调人文主义', funFact: '文艺复兴三杰：达芬奇、米开朗基罗、拉斐尔', rarity: 'common', icon: '🎨', themeColor: '#f59e0b', dropRate: 0.3 },
        { name: '法国大革命', content: '1789年爆发，攻占巴士底狱，颁布《人权宣言》', funFact: '自由、平等、博爱成为革命口号', rarity: 'rare', icon: '⚔️', themeColor: '#f59e0b', dropRate: 0.1 },
        { name: '工业革命', content: '18世纪60年代始于英国，蒸汽机的发明改变了世界', funFact: '瓦特改良蒸汽机是工业革命的标志性事件', rarity: 'rare', icon: '⚙️', themeColor: '#f59e0b', dropRate: 0.1 },
        { name: '玛雅文明', content: '中美洲古文明，拥有精确的历法和发达的天文学', funFact: '玛雅人预测的2012年世界末日曾引发全球恐慌', rarity: 'epic', icon: '🗿', themeColor: '#f59e0b', dropRate: 0.05 },
        { name: '历史学者认证', content: '掌握历史的终极证明，你已洞悉文明的兴衰规律', funFact: '读史使人明智 — 培根', rarity: 'legendary', icon: '📚', themeColor: '#f59e0b', dropRate: 0.01, condition: 'chapter_complete' },
      ],
    },
    // 初中语文
    {
      subjectIndex: 3,
      cards: [
        { name: '静夜思', content: '床前明月光，疑是地上霜。举头望明月，低头思故乡。— 李白', funFact: '这是李白最广为人知的诗作，几乎所有中国人都会背诵', rarity: 'common', icon: '🌙', themeColor: '#ec4899', dropRate: 0.3 },
        { name: '唐宋八大家', content: '韩愈、柳宗元、欧阳修、苏洵、苏轼、苏辙、王安石、曾巩', funFact: '其中苏轼一家就占了三位（苏洵、苏轼、苏辙）', rarity: 'common', icon: '✍️', themeColor: '#ec4899', dropRate: 0.3 },
        { name: '四大名著', content: '《三国演义》《水浒传》《西游记》《红楼梦》', funFact: '《红楼梦》后四十回普遍认为是高鹗续写', rarity: 'common', icon: '📕', themeColor: '#ec4899', dropRate: 0.3 },
        { name: '岳阳楼记', content: '先天下之忧而忧，后天下之乐而乐。— 范仲淹', funFact: '范仲淹写此文时并未亲临岳阳楼，全凭想象', rarity: 'rare', icon: '🏯', themeColor: '#ec4899', dropRate: 0.1 },
        { name: '离骚', content: '路漫漫其修远兮，吾将上下而求索。— 屈原', funFact: '《离骚》是中国最长的抒情诗，共373句', rarity: 'rare', icon: '🐲', themeColor: '#ec4899', dropRate: 0.1 },
        { name: '庄子哲学', content: '庖丁解牛、庄周梦蝶，道家思想的经典寓言', funFact: '庄子妻子死后鼓盆而歌，体现了道家的生死观', rarity: 'epic', icon: '🦋', themeColor: '#ec4899', dropRate: 0.05 },
        { name: '文学大家认证', content: '掌握语文的终极证明，你已领悟中华文化的精髓', funFact: '文章千古事，得失寸心知 — 杜甫', rarity: 'legendary', icon: '🖋️', themeColor: '#ec4899', dropRate: 0.01, condition: 'chapter_complete' },
      ],
    },
  ]

  for (const group of knowledgeCardsData) {
    const subject = subjectRecords[group.subjectIndex]
    for (const card of group.cards) {
      await prisma.knowledgeCard.create({
        data: {
          subjectId: subject.id,
          name: card.name,
          content: card.content,
          funFact: card.funFact,
          rarity: card.rarity,
          icon: card.icon,
          themeColor: card.themeColor,
          dropRate: card.dropRate,
          condition: card.condition || null,
        },
      })
    }
    console.log(`  ✓ 创建知识卡片: ${group.cards.length} 张 (${subject.name})`)
  }
  console.log('✅ 知识卡片数据创建完成\n')

  // ---- 10. 创建剧情选择数据 ----
  console.log('🎭 创建剧情选择数据...')

  // 全局连击触发（挂载到第一章英语森林，但触发类型为 streak_*）
  const englishChapter = chapterRecords[0]
  const globalStoryChoices = [
    {
      chapterId: englishChapter.id,
      triggerType: 'streak_correct',
      triggerValue: 5,
      title: '连击觉醒',
      description: '你已经连续答对5题，内心的力量开始觉醒。你感到一股冲劲涌上心头，要如何引导这股力量？',
      options: [
        { id: 'brave', text: '乘势追击，冲击更高连击！', routeEffect: 'brave', nextDialog: '你的勇气如同烈火，燃烧着前行的道路。勇者之路已开启。' },
        { id: 'cultivation', text: '稳扎稳打，保持节奏', routeEffect: 'cultivation', nextDialog: '稳健的心态是修行者的武器。修行之路已开启。' },
        { id: 'balanced', text: '顺其自然，享受答题', routeEffect: 'balanced', nextDialog: '平和的心境让你看得更远。平衡之道已开启。' },
      ],
      order: 1,
    },
    {
      chapterId: englishChapter.id,
      triggerType: 'streak_correct',
      triggerValue: 10,
      title: '十连巅峰',
      description: '十连击！你已进入心流状态，思维如电。此刻你想到的是什么？',
      options: [
        { id: 'brave', text: '挑战极限，冲击20连击！', routeEffect: 'brave', nextDialog: '追求极限的勇气，正是勇者战士的特质。' },
        { id: 'balanced', text: '享受此刻的专注', routeEffect: 'balanced', nextDialog: '专注当下，是智者的修行。' },
      ],
      order: 2,
    },
    {
      chapterId: englishChapter.id,
      triggerType: 'streak_wrong',
      triggerValue: 3,
      title: '逆境思考',
      description: '连续答错3题，挫折感袭来。但这正是成长的契机，你选择如何面对？',
      options: [
        { id: 'cultivation', text: '总结错因，下次必胜', routeEffect: 'cultivation', nextDialog: '从失败中学习，是修行者的智慧。修行之路已开启。' },
        { id: 'brave', text: '不甘心，再来一题证明自己', routeEffect: 'brave', nextDialog: '不服输的劲头，是勇者的火焰。' },
        { id: 'balanced', text: '调整心态，换种题型', routeEffect: 'balanced', nextDialog: '懂得变通，是平衡之道的智慧。' },
      ],
      order: 3,
    },
  ]

  for (const choice of globalStoryChoices) {
    await prisma.storyChoice.create({
      data: {
        chapterId: choice.chapterId,
        triggerType: choice.triggerType,
        triggerValue: choice.triggerValue,
        title: choice.title,
        description: choice.description,
        options: choice.options,
        order: choice.order,
      },
    })
  }
  console.log(`  ✓ 创建全局剧情选择: ${globalStoryChoices.length} 个（连击/逆境触发）`)

  // 每章 Boss 胜利/失败 + 首次进入剧情选择
  for (let i = 0; i < chapterRecords.length; i++) {
    const chapter = chapterRecords[i]
    const bossNode = chapter.nodes.find((n: { isBoss: boolean }) => n.isBoss)

    // 首次进入该章节
    await prisma.storyChoice.create({
      data: {
        chapterId: chapter.id,
        triggerType: 'first_enter',
        triggerValue: 0,
        title: `初见${chapter.name}`,
        description: `你第一次踏入${chapter.name}。${chapter.description}前方是未知的旅程，你的心告诉你...`,
        options: [
          { id: 'brave', text: '直接挑战最难的关卡', routeEffect: 'brave', nextDialog: `勇敢的冒险者，${chapter.name}将记住你的名字。` },
          { id: 'cultivation', text: '从简单的开始，循序渐进', routeEffect: 'cultivation', nextDialog: `稳扎稳打的修行者，${chapter.name}欢迎你。` },
        ],
        order: 0,
      },
    })

    // Boss 胜利
    if (bossNode) {
      await prisma.storyChoice.create({
        data: {
          chapterId: chapter.id,
          nodeId: bossNode.id,
          triggerType: 'boss_win',
          triggerValue: 0,
          title: `Boss降临：${chapter.name}`,
          description: `你击败了${chapter.name}的Boss！胜利的喜悦中，你听到了内心深处的声音...`,
          options: [
            { id: 'brave', text: '乘胜追击，挑战下一片大陆', routeEffect: 'brave', nextDialog: '你的勇气如同烈火，照亮前行的路。勇者之路越走越宽。' },
            { id: 'cultivation', text: '巩固根基，收集遗漏的卡片', routeEffect: 'cultivation', nextDialog: '稳扎稳打的修行者，根基决定高度。' },
          ],
          order: 10,
        },
      })

      // Boss 失败
      await prisma.storyChoice.create({
        data: {
          chapterId: chapter.id,
          nodeId: bossNode.id,
          triggerType: 'boss_lose',
          triggerValue: 0,
          title: `败北时刻：${chapter.name}`,
          description: `你在Boss战中失利了。挫败感袭来，但真正的勇者从不退缩...`,
          options: [
            { id: 'cultivation', text: '重整旗鼓，复盘学习', routeEffect: 'cultivation', nextDialog: '从失败中汲取力量，是修行者的智慧。' },
            { id: 'brave', text: '立即再战，一雪前耻', routeEffect: 'brave', nextDialog: '不服输的火焰，正是勇者的标志。' },
          ],
          order: 11,
        },
      })
    }
  }
  console.log(`  ✓ 创建章节剧情选择: ${chapterRecords.length * 3} 个（首入+Boss胜败）`)
  console.log('✅ 剧情选择数据创建完成\n')

  console.log('🎉 种子数据初始化完成！')
  console.log(`   学科: ${subjects.length} 个`)
  console.log(`   题目: ${totalQuestions} 道`)
  console.log(`   成就: ${achievements.length} 个`)
  console.log(`   配置: ${configs.length} 项`)
  console.log(`   知识大陆: ${chaptersData.length} 块`)
  console.log(`   NPC导师: ${npcMentorsData.length} 位`)
  console.log(`   知识卡片: ${knowledgeCardsData.reduce((sum, g) => sum + g.cards.length, 0)} 张`)
  console.log(`   剧情选择: ${globalStoryChoices.length + chapterRecords.length * 3} 个`)
  console.log('   管理员: admin / admin123')
}

// ============ 启动与错误处理 ============

main()
  .catch((e) => {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('❌ Prisma 错误:', e.code, e.message)
    } else {
      console.error('❌ 种子数据初始化失败:', e)
    }
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
