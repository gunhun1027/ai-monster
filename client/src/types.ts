// 类型定义

// 通用分页
export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// 用户
export interface User {
  id: string
  username: string
  email: string
  role: string
  avatarUrl: string | null
  monsterName: string
  monsterStage: string
  monsterLevel: number
  monsterExp: number
  monsterMaxExp: number
  monsterMood: string
  hunger: number
  cleanliness: number
  happiness: number
  coins: number
  streakDays: number
  lastQuizDate: string | null
  totalCorrect: number
  totalQuiz: number
  combo: number
  maxCombo: number
  createdAt: string
  pathType?: string
  pathPoints?: PathPoints
  evolutionBranch?: string | null
  abilityScore?: number
  // 剧情系统 v2 字段
  storyRoute?: string // 'none' | 'brave' | 'cultivation' | 'balanced'
  title?: string // 当前称号
  cardCollectionCount?: number // 已收集卡片数
  wrongStreak?: number // 连续答错次数
}

// 学科
export interface Subject {
  id: string
  name: string
  description: string | null
  icon: string
  questionCount: number
}

// 题目（普通答题用，不含答案字段）
export interface Question {
  id: string
  content: string
  options: string[]
  answer?: string // 正确答案索引(选择题)或答案文本(填空题)，挑战模式本地判题需要
  difficulty: number
  subjectId: string
  type?: string // "choice" | "fillblank"
  explanation?: string | null
  tags?: string[] | null
}

// 管理后台题目（包含答案、启用状态、学科信息）
export interface AdminQuestion extends Omit<Question, 'answer'> {
  answer: number
  isActive: boolean
  type?: string
  explanation?: string | null
  tags?: string[] | null
  subject: { name: string; icon: string }
  createdAt: string
}

// 怪兽阶段信息
export interface StageInfo {
  name: string
  emoji: string
  image: string
  minLevel: number
  maxLevel: number
  expPerLevel: number
  description: string
}

// 进化阶段配置（包含stage字段）
export interface EvolutionStage extends StageInfo {
  stage: string
}

// 怪兽
export interface Monster {
  monsterName: string
  monsterStage: string
  monsterLevel: number
  monsterExp: number
  monsterMaxExp: number
  monsterMood: string
  stageInfo: StageInfo
}

// 答题结果中的怪兽信息
export interface QuizMonster {
  name: string
  stage: string
  stageInfo: StageInfo
  level: number
  exp: number
  maxExp: number
  mood: string
  hunger: number
  happiness: number
  cleanliness: number
  coins: number
}

// 升级信息
export interface LevelUpInfo {
  newLevel: number
}

// 进化信息
export interface EvolutionInfo {
  newStage: string
  stageInfo: StageInfo
}

// 新解锁成就（简化版）
export interface NewAchievement {
  id: string
  name: string
  icon: string
  description: string
}

// 宝箱掉落
export interface ChestDrop {
  type: string // 'normal' | 'rare' | 'legendary'
  coins: number
  label: string
}

// 答题结果
export interface QuizResult {
  isCorrect: boolean
  correctAnswer: number
  correctAnswerText?: string // 填空题的正确答案文本
  explanation?: string | null // 题目解析
  expGained: number
  coinsGained: number
  chestDrop: ChestDrop | null
  combo: number
  wrongStreak: number // 答错连击数（剧情系统v2）
  streakDays: number
  monster: QuizMonster
  levelUp: LevelUpInfo | null
  evolution: EvolutionInfo | null
  newAchievements: NewAchievement[] | null
  // 剧情系统 v2 附加字段
  droppedCards: DroppedCardInfo[] | null
  pendingStoryChoices: StoryChoiceSummary[] | null
  unlockedTitles: TitleDef[] | null
}

// 成就
export interface Achievement {
  id: string
  name: string
  icon: string
  description: string
  condition: string
  threshold: number
  unlocked: boolean
  unlockedAt: string | null
}

// 排行榜项
export interface RankingItem {
  rank: number
  id: string
  username: string
  avatarUrl: string | null
  monsterName: string
  monsterStage: string
  stageEmoji: string
  monsterLevel: number
  streakDays: number
  totalCorrect: number
  totalQuiz: number
  maxCombo: number
  isMe: boolean
}

// 我的排名
export interface MyRank {
  rank: number
  value: number
}

// 答题记录中的题目信息
export interface QuizRecordQuestion {
  content: string
  options: string[]
  answer: number
  subject: { name: string; icon: string }
}

// 答题记录
export interface QuizRecord {
  id: string
  isCorrect: boolean
  timeTaken: number
  expGained: number
  comboAtTime: number
  createdAt: string
  question: QuizRecordQuestion
}

// 管理后台用户（列表展示用）
export interface AdminUser {
  id: string
  username: string
  email: string
  role: string
  avatarUrl: string | null
  monsterName: string
  monsterStage: string
  monsterLevel: number
  streakDays: number
  totalCorrect: number
  totalQuiz: number
  maxCombo: number
  createdAt: string
  lastQuizDate: string | null
}

// 管理后台用户详情
export interface AdminUserDetail extends AdminUser {
  monsterExp: number
  monsterMaxExp: number
  combo: number
}

// 管理后台更新用户请求
export interface UpdateUserRequest {
  role?: string
  monsterLevel?: number
  monsterExp?: number
  streakDays?: number
  totalCorrect?: number
}

// 管理后台统计数据 - 学科分布
export interface SubjectDistribution {
  name: string
  icon: string
  count: number
}

// 管理后台统计数据
export interface AdminStats {
  totalUsers: number
  todayActiveUsers: number
  totalQuestions: number
  totalQuizRecords: number
  todayNewUsers: number
  subjectDistribution: SubjectDistribution[]
}

// 添加题目请求
export interface AddQuestionRequest {
  subjectId: string
  content: string
  options: string[]
  answer: number
  difficulty?: number
}

// 更新题目请求
export interface UpdateQuestionRequest {
  content?: string
  options?: string[]
  answer?: number
  difficulty?: number
  isActive?: boolean
  subjectId?: string
  type?: string
  explanation?: string
  tags?: string[]
}

// 添加学科请求
export interface AddSubjectRequest {
  name: string
  description?: string
  icon?: string
}

// 更新学科请求
export interface UpdateSubjectRequest {
  name?: string
  description?: string
  icon?: string
  isActive?: boolean
}

// ===== API响应类型 =====

// 认证响应
export interface AuthResponse {
  token: string
  user: User
}

// 当前用户响应
export interface CurrentUserResponse {
  user: User
}

// 学科列表响应
export interface SubjectsResponse {
  subjects: Subject[]
}

// 题目列表响应
export interface QuestionsResponse {
  questions: Question[]
}

// 怪兽信息响应
export interface MonsterResponse {
  monster: Monster
}

// 进化阶段响应
export interface EvolutionStagesResponse {
  stages: EvolutionStage[]
}

// 排行榜响应
export interface RankingResponse {
  ranking: RankingItem[]
  myRank: MyRank | null
  pagination: Pagination
}

// 成就列表响应
export interface AchievementsResponse {
  achievements: Achievement[]
}

// 答题历史响应
export interface QuizHistoryResponse {
  records: QuizRecord[]
  pagination: Pagination
}

// 重命名响应
export interface RenameResponse {
  monsterName: string
}

// 管理后台统计响应
export interface AdminStatsResponse {
  stats: AdminStats
}

// 管理后台用户列表响应
export interface AdminUsersResponse {
  users: AdminUser[]
  pagination: Pagination
}

// 管理后台用户详情响应
export interface AdminUserDetailResponse {
  user: AdminUserDetail
}

// 管理后台题目列表响应
export interface AdminQuestionsResponse {
  questions: AdminQuestion[]
  pagination: Pagination
}

// 管理后台题目响应
export interface AdminQuestionResponse {
  question: AdminQuestion
}

// 管理后台学科列表响应
export interface AdminSubjectsResponse {
  subjects: Subject[]
}

// 管理后台学科响应
export interface AdminSubjectResponse {
  subject: Subject
}

// 操作成功响应
export interface SuccessResponse {
  success: boolean
}

// API错误响应
export interface ApiErrorResponse {
  error: string
}

// ===== 怪兽养成相关类型 =====

// 怪兽完整状态
export interface MonsterStatus {
  hunger: number
  cleanliness: number
  happiness: number
  mood: string
  coins: number
  nextFeedInMinutes: number
  nextPlayInMinutes: number
  nextCleanInMinutes: number
}

// 怪兽状态响应
export interface MonsterStatusResponse extends MonsterStatus {}

// 喂食响应
export interface FeedResponse {
  hunger: number
  happiness: number
  mood: string
  coins: number
  message: string
}

// 玩耍响应
export interface PlayResponse {
  happiness: number
  mood: string
  message: string
}

// 清洁响应
export interface CleanResponse {
  cleanliness: number
  mood: string
  message: string
}

// ===== 每日奖励相关类型 =====

// 每日奖励状态
export interface DailyRewardStatus {
  todayReward: {
    dayStreak: number
    rewardType: string
    rewardValue: number
    claimed: boolean
  }
  canClaim: boolean
  weekHistory: Array<{
    date: string
    claimed: boolean
    dayStreak: number
  }>
}

// 领取奖励响应
export interface ClaimRewardResponse {
  success: boolean
  reward: {
    type: string
    value: number
    coins: number
    bonusType: string
  }
  newCoins: number
  newDayStreak: number
  message: string
}

// ===== 错题本相关类型 =====

// 错题记录
export interface WrongAnswerItem {
  id: string
  questionId: string
  subjectId: string
  selectedOption: number
  correctAnswer: number
  content: string
  options: string[]
  wrongCount: number
  lastWrongAt: string
  mastered: boolean
  createdAt: string
  subject: { name: string; icon: string }
}

// 错题本列表响应
export interface WrongAnswersResponse {
  items: WrongAnswerItem[]
  total: number
  masteredCount: number
  unmasteredCount: number
  pagination: Pagination
}

// 错题复习题目
export interface ReviewQuestion extends Question {
  wrongAnswerId: string
  wrongCount: number
}

// 错题复习响应
export interface ReviewQuestionsResponse {
  questions: ReviewQuestion[]
}

// 标记掌握响应
export interface MasterResponse {
  mastered: boolean
}

// ===== 学习分析相关类型 =====

// 每日趋势
export interface DailyTrend {
  date: string
  quizCount: number
  correctCount: number
  accuracy: number
}

// 学科统计
export interface SubjectStat {
  subjectId: string
  subjectName: string
  quizCount: number
  correctCount: number
  accuracy: number
}

// 薄弱知识点
export interface WeakPoint {
  tag: string
  wrongCount: number
  totalCount: number
  masteryRate: number
}

// 学习分析概览
export interface AnalyticsOverview {
  totalQuiz: number
  totalCorrect: number
  accuracyRate: number
  weeklyTrend: DailyTrend[]
  subjectStats: SubjectStat[]
  weakPoints: WeakPoint[]
  streakData: {
    currentStreak: number
    maxStreak: number
    weeklyStreakDays: number
  }
}

// ===== 学习计划相关类型 =====

// 学习计划
export interface StudyPlanData {
  dailyGoal: number
  dailyTimeGoal: number
  reminderTime: string | null
  reminderEnabled: boolean
}

// 今日进度
export interface TodayProgress {
  quizCount: number
  correctCount: number
  studyMinutes: number
  goalAchieved: boolean
  dailyGoal: number
  dailyTimeGoal: number
  progressPercent: number
}

// 本周进度日历
export interface WeeklyDay {
  date: string
  fullDate: string
  quizCount: number
  goalAchieved: boolean
  isToday: boolean
}

export interface WeeklyProgressResponse {
  days: WeeklyDay[]
}

// ===== 进化分支相关类型 =====

export interface PathPoints {
  brave: number
  wise: number
  tough: number
}

export interface PathPointsResponse extends PathPoints {
  recommendedPath: string
  currentBranch: string | null
}

export interface BranchStageInfo {
  name: string
  emoji: string
  image: string
  description?: string
}

export interface EvolutionBranch {
  name: string
  stages: Record<string, BranchStageInfo>
}

export interface ChooseBranchResponse {
  success: boolean
  branch: string
  stageInfo: BranchStageInfo | null
  branchName: string
}

// ===== 道具/商店相关类型 =====

export interface ShopItem {
  id: string
  name: string
  description: string
  type: string // 'food' | 'equipment' | 'decoration' | 'consumable'
  effect: string
  price: number
  icon: string
  unlockedAt: number | null
  unlocked: boolean
  createdAt: string
}

export interface ShopItemsResponse {
  success: boolean
  data: {
    items: ShopItem[]
    userCoins: number
  }
}

export interface BuyItemResponse {
  success: boolean
  data: {
    newCoins: number
    quantity: number
  }
}

export interface InventoryItem {
  id: string
  itemId: string
  name: string
  description: string
  type: string
  effect: string
  icon: string
  quantity: number
  equipped: boolean
}

export interface InventoryResponse {
  success: boolean
  data: {
    items: InventoryItem[]
    activeEffects: string[]
  }
}

export interface UseItemResponse {
  success: boolean
  data: {
    effect: string
    newStats: Record<string, number>
  }
}

export interface EquipItemResponse {
  success: boolean
  data: {
    equipped: boolean
  }
}

// ===== 挑战模式相关类型 =====

export interface ChallengeConfig {
  id: string
  name: string
  description: string
  type: string
  difficulty: number
  rewardCoins: number
  rewardExp: number
  icon: string
  timeLimit: number
  perQuestionTime: number
}

export interface ChallengesResponse {
  success: boolean
  data: {
    challenges: ChallengeConfig[]
  }
}

export interface ChallengeStartResponse {
  success: boolean
  data: {
    challengeId: string
    questions: Question[]
    timeLimit: number
    perQuestionTime: number
    config: ChallengeConfig
  }
}

export interface ChallengeSubmitResponse {
  success: boolean
  data: {
    score: number
    rewardCoins: number
    rewardExp: number
    newCoins: number
  }
}

// ===== 难度自适应相关类型 =====

export interface AbilityInfo {
  score: number
  level: string
  color: string
  difficulty: number
}

// ===== AI出题相关类型 =====

export interface AiQuestionStatus {
  enabled: boolean
  demoMode: boolean
  model: string
  baseUrl: string
}

export interface GeneratedQuestionData {
  content: string
  options: string[]
  answer: string
  type: 'choice' | 'fillblank'
  explanation: string
  tags: string[]
  difficulty: number
}

export interface AiGenerateResponse {
  success: boolean
  questions: Question[]
  saved: boolean
  savedCount: number
  demoMode: boolean
}

export interface AiQuickQuizResponse {
  success: boolean
  questions: Question[]
  demoMode: boolean
}

export interface AiQuestionConfig {
  subjectName: string
  topic: string
  difficulty: number
  count: number
  questionType: 'choice' | 'fillblank' | 'mixed'
}

// ============ 剧情系统类型 ============

// 故事章节（知识大陆）
export interface StoryChapter {
  id: string
  name: string
  description: string
  icon: string
  themeColor: string
  order: number
  subjectName: string
  subjectIcon: string
  totalNodes: number
  unlockedNodes: number
  isUnlocked: boolean
  progressPercent: number
}

export interface StoryChaptersResponse {
  chapters: StoryChapter[]
  totalStars: number
}

// 故事节点（知识关卡）
export interface StoryNodeInfo {
  id: string
  name: string
  description: string
  order: number
  requiredStars: number
  questionCount: number
  difficulty: number
  isBoss: boolean
  rewardStars: number
  isUnlocked: boolean
  isCompleted: boolean
}

export interface StoryChapterDetailResponse {
  chapter: {
    id: string
    name: string
    description: string
    icon: string
    themeColor: string
  }
  nodes: StoryNodeInfo[]
  userStars: number
  nextUnlockable: StoryNodeInfo | null
}

export interface StoryCompleteRequest {
  score: number
  correctCount: number
  totalCount: number
}

export interface StoryCompleteResponse {
  success: boolean
  isPassed: boolean
  earnedStars?: number
  totalStars?: number
  isBossDefeated?: boolean
  isChapterComplete?: boolean
  score?: number
  message: string
  // 剧情系统 v2 附加字段
  droppedCards?: DroppedCardInfo[]
  pendingStoryChoices?: StoryChoiceSummary[]
}

// ============ NPC导师系统类型 ============

export interface NpcMentor {
  id: string
  name: string
  avatar: string
  personality: string
  subjectName: string
  subjectIcon: string
  unreadCount: number
  activeTaskCount: number
}

export interface NpcMentorsResponse {
  mentors: NpcMentor[]
}

export interface NpcDialog {
  id: string
  dialogType: 'guide' | 'task' | 'story' | 'encourage' | 'explain'
  content: string
  createdAt: string
}

export interface NpcTask {
  id: string
  title: string
  description: string
  taskType: 'answer_count' | 'correct_count' | 'chapter_complete' | 'streak'
  currentValue: number
  targetValue: number
  rewardCoins: number
  rewardExp: number
  isCompleted: boolean
}

export interface NpcMentorDetailResponse {
  mentor: {
    id: string
    name: string
    avatar: string
    personality: string
    greeting: string
    subjectName: string
  }
  recentDialogs: NpcDialog[]
  activeTasks: NpcTask[]
}

export interface NpcDailyTasksResponse {
  tasks: { id: string; title: string; description: string; mentorName: string }[]
  message: string
}

export interface NpcTaskProgressResponse {
  currentValue: number
  targetValue: number
  isCompleted: boolean
  message?: string
}

export interface NpcClaimResponse {
  success: boolean
  rewardCoins: number
  rewardExp: number
}

export interface NpcStoryDialog {
  speaker: 'mentor' | 'user'
  avatar: string
  name: string
  content: string
}

export interface NpcStoryDialogsResponse {
  dialogs: NpcStoryDialog[]
}

// ============ 剧情系统 v2 类型（剧情分支 + 知识卡片） ============

// 掉落卡片信息（quiz 提交 / story 通关返回）
export interface DroppedCardInfo {
  cardId: string
  name: string
  content: string
  funFact: string | null
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  icon: string
  themeColor: string
  isNew: boolean
}

// 剧情选择项（选项）
export interface StoryChoiceOption {
  id: string
  text: string
  routeEffect: 'brave' | 'cultivation' | 'balanced'
  nextDialog?: string
}

// 剧情选择精简结构（返回前端）
export interface StoryChoiceSummary {
  id: string
  title: string
  description: string
  options: StoryChoiceOption[]
  triggerType: 'streak_correct' | 'streak_wrong' | 'boss_win' | 'boss_lose' | 'first_enter'
  triggerValue: number
}

// 剧情选择列表响应
export interface StoryChoicesResponse {
  choices: StoryChoiceSummary[]
}

// 做出剧情选择的响应
export interface StoryChoiceSelectResponse {
  success: boolean
  routeEffect: 'brave' | 'cultivation' | 'balanced' | null
  unlockedTitle: TitleDef | null
  nextDialog: string | null
  optionText: string | null
}

// 称号定义
export interface TitleDef {
  id: string
  name: string
  icon: string
  color: string
  desc: string
}

// 称号列表响应
export interface TitlesResponse {
  currentTitle: string
  unlockedTitles: string[]
  allTitles: TitleDef[]
}

// 装备称号响应
export interface EquipTitleResponse {
  success: boolean
  currentTitle: string
}

// 知识卡片列表项
export interface CardListItem {
  id: string
  name: string
  content: string
  funFact: string | null
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  icon: string
  themeColor: string
  subjectName: string
}

// 卡片列表响应
export interface CardsListResponse {
  cards: CardListItem[]
}

// 已收集卡片项
export interface CollectedCard {
  cardId: string
  name: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  icon: string
  themeColor: string
  count: number
  obtainedAt: string
  isNew: boolean
}

// 卡片收集情况响应
export interface CardCollectionResponse {
  collected: CollectedCard[]
  totalCards: number
  collectedCount: number
  collectionRate: number
  byRarity: {
    common: number
    rare: number
    epic: number
    legendary: number
  }
}

// 卡片详情响应
export interface CardDetailResponse {
  card: CardListItem
  isCollected: boolean
  count: number
}

// 剧情路线类型
export type StoryRouteType = 'brave' | 'cultivation' | 'balanced' | 'none'

// ============ 学习热力图（v3） ============

// 热力图单日数据
export interface HeatmapCell {
  date: string // YYYY-MM-DD
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

// 热力图统计信息
export interface HeatmapStats {
  totalDays: number
  longestStreak: number
  currentStreak: number
  totalQuestions: number
  averagePerDay: number
}

// 热力图响应
export interface HeatmapResponse {
  heatmapData: HeatmapCell[]
  stats: HeatmapStats
}

// 连续学习天数历史项
export interface StreakHistoryItem {
  date: string
  count: number
}

// 连续学习天数响应
export interface StreakResponse {
  currentStreak: number
  longestStreak: number
  streakHistory: StreakHistoryItem[]
}

// ============ 学习小组系统（v3） ============

// 小组目标类型
export type GroupGoalType = 'total_quiz' | 'total_correct' | 'streak_days'

// 小组成员角色
export type GroupRole = 'owner' | 'admin' | 'member'

// 创建小组请求
export interface CreateGroupRequest {
  name: string
  description?: string
  avatar?: string
}

// 创建小组响应
export interface CreateGroupResponse {
  group: {
    id: string
    name: string
    description: string | null
    avatar: string
    ownerId: string
    createdAt: string
  }
}

// 小组列表项
export interface GroupListItem {
  id: string
  name: string
  description: string | null
  avatar: string
  memberCount: number
  maxMembers: number
  ownerName: string
  createdAt: string
}

// 小组列表响应
export interface GroupListResponse {
  groups: GroupListItem[]
  total: number
}

// 我加入的小组项
export interface MyGroupItem {
  id: string
  name: string
  avatar: string
  description: string | null
  role: GroupRole
  memberCount: number
  maxMembers: number
  weeklyProgress: number
}

// 我加入的小组响应
export interface MyGroupsResponse {
  groups: MyGroupItem[]
}

// 小组成员项
export interface GroupMemberItem {
  userId: string
  username: string
  avatarUrl: string | null
  role: GroupRole
  weeklyQuizCount: number
  weeklyCorrectCount: number
  accuracy: number
}

// 小组目标项
export interface GroupGoalItem {
  id: string
  title: string
  description: string
  targetType: GroupGoalType
  targetValue: number
  currentValue: number
  rewardCoins: number
  isCompleted: boolean
  deadline: string | null
}

// 小组详情响应
export interface GroupDetailResponse {
  group: {
    id: string
    name: string
    description: string | null
    avatar: string
    ownerName: string
    ownerId: string
    memberCount: number
    maxMembers: number
    createdAt: string
  }
  members: GroupMemberItem[]
  goals: GroupGoalItem[]
  isMember: boolean
  isOwner: boolean
  myRole: GroupRole | null
}

// 创建小组目标请求
export interface CreateGroupGoalRequest {
  title: string
  description: string
  targetType: GroupGoalType
  targetValue: number
  deadline?: string
}

// 小组目标响应
export interface CreateGroupGoalResponse {
  goal: GroupGoalItem
}

// 小组进度更新响应
export interface GroupProgressResponse {
  updatedGoals: Array<{
    id: string
    isCompleted: boolean
    rewardCoins: number
  }>
}

// 小组排行榜项
export interface GroupRankingItem {
  userId: string
  username: string
  avatarUrl: string | null
  role: GroupRole
  weeklyQuizCount: number
  weeklyCorrectCount: number
  accuracy: number
}

// 小组排行榜响应
export interface GroupRankingResponse {
  ranking: GroupRankingItem[]
}

// 加入/退出小组响应
export interface GroupActionResponse {
  success: boolean
  message?: string
}
