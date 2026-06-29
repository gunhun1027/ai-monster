import type {
  AuthResponse,
  CurrentUserResponse,
  SubjectsResponse,
  QuestionsResponse,
  MonsterResponse,
  EvolutionStagesResponse,
  QuizResult,
  QuizHistoryResponse,
  RenameResponse,
  RankingResponse,
  AchievementsResponse,
  AdminStatsResponse,
  AdminUsersResponse,
  AdminUserDetailResponse,
  AdminQuestionsResponse,
  AdminQuestionResponse,
  AdminSubjectsResponse,
  AdminSubjectResponse,
  SuccessResponse,
  UpdateUserRequest,
  AddQuestionRequest,
  UpdateQuestionRequest,
  AddSubjectRequest,
  UpdateSubjectRequest,
  MonsterStatus,
  FeedResponse,
  PlayResponse,
  CleanResponse,
  DailyRewardStatus,
  ClaimRewardResponse,
  WrongAnswersResponse,
  ReviewQuestionsResponse,
  MasterResponse,
  AnalyticsOverview,
  StudyPlanData,
  TodayProgress,
  WeeklyProgressResponse,
  PathPointsResponse,
  ChooseBranchResponse,
  ShopItemsResponse,
  BuyItemResponse,
  InventoryResponse,
  UseItemResponse,
  EquipItemResponse,
  ChallengesResponse,
  ChallengeStartResponse,
  ChallengeSubmitResponse,
  AiQuestionStatus,
  AiGenerateResponse,
  AiQuickQuizResponse,
  AiQuestionConfig,
  StoryChaptersResponse,
  StoryChapterDetailResponse,
  StoryCompleteRequest,
  StoryCompleteResponse,
  NpcMentorsResponse,
  NpcMentorDetailResponse,
  NpcDailyTasksResponse,
  NpcTaskProgressResponse,
  NpcClaimResponse,
  NpcStoryDialogsResponse,
  StoryChoicesResponse,
  StoryChoiceSelectResponse,
  TitlesResponse,
  EquipTitleResponse,
  CardsListResponse,
  CardCollectionResponse,
  CardDetailResponse,
  HeatmapResponse,
  StreakResponse,
  CreateGroupRequest,
  CreateGroupResponse,
  GroupListResponse,
  MyGroupsResponse,
  GroupDetailResponse,
  CreateGroupGoalRequest,
  CreateGroupGoalResponse,
  GroupRankingResponse,
  GroupActionResponse,
} from '../types'

const API_BASE = '/api'
const TOKEN_KEY = 'monster_quiz_token'

// Cookie 操作工具
function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/+^])/g, '\\$1') + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
}

export function getToken(): string | null {
  return getCookie(TOKEN_KEY)
}

export function setToken(token: string) {
  setCookie(TOKEN_KEY, token, 7) // 7天有效期
}

export function clearToken() {
  deleteCookie(TOKEN_KEY)
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || '请求失败')
    }

    return data
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查网络连接')
  }
}

// ===== 认证API =====
export const authApi = {
  register: (username: string, email: string, password: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  login: (username: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<CurrentUserResponse>('/auth/me'),
}

// ===== 学科API =====
export const subjectApi = {
  list: () => request<SubjectsResponse>('/subjects'),
}

// ===== 题目API =====
export const questionApi = {
  random: (subjectId: string, count = 10) =>
    request<QuestionsResponse>(`/questions/random?subjectId=${subjectId}&count=${count}`),
}

// ===== 答题API =====
export const quizApi = {
  submit: (questionId: string, selectedOption: number, timeTaken: number, fillblankAnswer?: string) =>
    request<QuizResult>('/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ questionId, selectedOption, timeTaken, fillblankAnswer }),
    }),

  history: (page = 1, limit = 20) =>
    request<QuizHistoryResponse>(`/quiz/history?page=${page}&limit=${limit}`),
}

// ===== 怪兽API =====
export const monsterApi = {
  get: () => request<MonsterResponse>('/monster'),
  evolution: () => request<EvolutionStagesResponse>('/monster/evolution'),
  rename: (monsterName: string) =>
    request<RenameResponse>('/monster/name', {
      method: 'PUT',
      body: JSON.stringify({ monsterName }),
    }),
  status: () => request<MonsterStatus>('/monster/status'),
  feed: (itemType: 'apple' | 'fish' | 'cake') =>
    request<FeedResponse>('/monster/feed', {
      method: 'POST',
      body: JSON.stringify({ itemType }),
    }),
  play: () =>
    request<PlayResponse>('/monster/play', {
      method: 'POST',
    }),
  clean: () =>
    request<CleanResponse>('/monster/clean', {
      method: 'POST',
    }),
}

// ===== 排行榜API =====
export const rankingApi = {
  list: (type = 'level', page = 1, limit = 50) =>
    request<RankingResponse>(`/ranking?type=${type}&page=${page}&limit=${limit}`),
}

// ===== 成就API =====
export const achievementApi = {
  list: () => request<AchievementsResponse>('/achievements'),
}

// ===== 每日奖励API =====
export const rewardsApi = {
  daily: () => request<DailyRewardStatus>('/rewards/daily'),
  claim: () =>
    request<ClaimRewardResponse>('/rewards/daily/claim', {
      method: 'POST',
    }),
}

// ===== 管理后台API =====
export const adminApi = {
  stats: () => request<AdminStatsResponse>('/admin/stats'),

  users: (page = 1, limit = 20, search = '') =>
    request<AdminUsersResponse>(`/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
  userDetail: (id: string) => request<AdminUserDetailResponse>(`/admin/users/${id}`),
  updateUser: (id: string, data: UpdateUserRequest) =>
    request<AdminUserDetailResponse>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  questions: (page = 1, limit = 20, subjectId = '') =>
    request<AdminQuestionsResponse>(`/admin/questions?page=${page}&limit=${limit}&subjectId=${subjectId}`),
  addQuestion: (data: AddQuestionRequest) =>
    request<AdminQuestionResponse>('/admin/questions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateQuestion: (id: string, data: UpdateQuestionRequest) =>
    request<AdminQuestionResponse>(`/admin/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteQuestion: (id: string) =>
    request<SuccessResponse>(`/admin/questions/${id}`, { method: 'DELETE' }),

  subjects: () => request<AdminSubjectsResponse>('/admin/subjects'),
  addSubject: (data: AddSubjectRequest) =>
    request<AdminSubjectResponse>('/admin/subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSubject: (id: string, data: UpdateSubjectRequest) =>
    request<AdminSubjectResponse>(`/admin/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

// ===== 错题本API =====
export const wrongAnswerApi = {
  list: (page = 1, limit = 20, subjectId = '', mastered = '') =>
    request<WrongAnswersResponse>(`/wrong-answers?page=${page}&limit=${limit}&subjectId=${subjectId}&mastered=${mastered}`),
  master: (id: string) =>
    request<MasterResponse>(`/wrong-answers/${id}/master`, { method: 'POST' }),
  review: (limit = 10) =>
    request<ReviewQuestionsResponse>(`/wrong-answers/review?limit=${limit}`),
}

// ===== 学习分析API =====
export const analyticsApi = {
  overview: () => request<AnalyticsOverview>('/analytics/overview'),
  // 学习热力图（v3）
  heatmap: () => request<HeatmapResponse>('/analytics/heatmap'),
  streak: () => request<StreakResponse>('/analytics/streak'),
}

// ===== 学习计划API =====
export const studyPlanApi = {
  get: () => request<StudyPlanData>('/study-plan'),
  update: (data: Partial<StudyPlanData>) =>
    request<StudyPlanData>('/study-plan', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  today: () => request<TodayProgress>('/study-plan/today'),
  weekly: () => request<WeeklyProgressResponse>('/study-plan/weekly'),
}

// ===== 进化分支API =====
export const branchApi = {
  pathPoints: () => request<PathPointsResponse>('/monster/path-points'),
  chooseBranch: (branch: string) =>
    request<ChooseBranchResponse>('/monster/choose-branch', {
      method: 'POST',
      body: JSON.stringify({ branch }),
    }),
}

// ===== 商店API =====
export const shopApi = {
  items: () => request<ShopItemsResponse>('/shop/items'),
  buy: (itemId: string, quantity = 1) =>
    request<BuyItemResponse>('/shop/buy', {
      method: 'POST',
      body: JSON.stringify({ itemId, quantity }),
    }),
}

// ===== 背包API =====
export const itemApi = {
  inventory: () => request<InventoryResponse>('/shop/inventory'),
  use: (userItemId: string) =>
    request<UseItemResponse>('/shop/use', {
      method: 'POST',
      body: JSON.stringify({ userItemId }),
    }),
  equip: (userItemId: string, equip: boolean) =>
    request<EquipItemResponse>('/shop/equip', {
      method: 'POST',
      body: JSON.stringify({ userItemId, equip }),
    }),
}

// ===== 挑战模式API =====
export const challengeApi = {
  list: () => request<ChallengesResponse>('/challenges'),
  start: (challengeType: string, subjectId?: string) =>
    request<ChallengeStartResponse>('/challenges/start', {
      method: 'POST',
      body: JSON.stringify({ challengeType, subjectId }),
    }),
  submit: (challengeId: string, answers: Array<{ questionId: string; isCorrect: boolean; timeTaken: number }>, score: number, challengeType: string) =>
    request<ChallengeSubmitResponse>(`/challenges/${challengeId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers, score, challengeType }),
    }),
}

// ===== AI出题API =====
export const aiQuestionApi = {
  status: () => request<AiQuestionStatus>('/ai-questions/status'),
  generate: (config: AiQuestionConfig & { subjectId?: string }) =>
    request<AiGenerateResponse>('/ai-questions/generate', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  quickQuiz: (config: AiQuestionConfig) =>
    request<AiQuickQuizResponse>('/ai-questions/quick-quiz', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
}

// ===== 剧情系统API（知识大陆 + 剧情分支v2） =====
export const storyApi = {
  chapters: () => request<StoryChaptersResponse>('/story/chapters'),
  chapterNodes: (chapterId: string) =>
    request<StoryChapterDetailResponse>(`/story/chapters/${chapterId}/nodes`),
  completeNode: (nodeId: string, data: StoryCompleteRequest) =>
    request<StoryCompleteResponse>(`/story/nodes/${nodeId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  // 剧情分支 v2：可触发选择 / 首入触发 / 做出选择
  availableChoices: () => request<StoryChoicesResponse>('/story/choices/available'),
  firstEnterChoices: (chapterId: string) =>
    request<StoryChoicesResponse>(`/story/choices/${chapterId}/first-enter`),
  selectChoice: (choiceId: string, optionId: string) =>
    request<StoryChoiceSelectResponse>(`/story/choices/${choiceId}/select`, {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    }),
}

// ===== NPC导师系统API =====
export const npcApi = {
  mentors: () => request<NpcMentorsResponse>('/npc/mentors'),
  mentorDetail: (mentorId: string) =>
    request<NpcMentorDetailResponse>(`/npc/mentors/${mentorId}`),
  generateDailyTasks: () =>
    request<NpcDailyTasksResponse>('/npc/tasks/generate-daily', { method: 'POST' }),
  claimTask: (taskId: string) =>
    request<NpcClaimResponse>(`/npc/tasks/${taskId}/claim`, { method: 'POST' }),
  storyDialogs: (chapterId: string, nodeId?: string) =>
    request<NpcStoryDialogsResponse>(`/npc/dialogs/story?chapterId=${chapterId}${nodeId ? `&nodeId=${nodeId}` : ''}`),
}

// ===== 称号系统API（剧情系统v2） =====
export const titleApi = {
  list: () => request<TitlesResponse>('/user/titles'),
  equip: (titleId: string) =>
    request<EquipTitleResponse>('/user/titles/equip', {
      method: 'POST',
      body: JSON.stringify({ titleId }),
    }),
}

// ===== 知识卡片系统API（剧情系统v2） =====
export const cardApi = {
  list: () => request<CardsListResponse>('/cards'),
  collection: () => request<CardCollectionResponse>('/cards/collection'),
  detail: (cardId: string) => request<CardDetailResponse>(`/cards/${cardId}`),
}

// ===== 学习小组API（v3 - 知识守护者联盟） =====
export const groupApi = {
  // 创建小组
  create: (data: CreateGroupRequest) =>
    request<CreateGroupResponse>('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  // 获取公开小组列表
  list: (page = 1, limit = 20, search = '') =>
    request<GroupListResponse>(`/groups?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
  // 获取我加入的小组
  my: () => request<MyGroupsResponse>('/groups/my'),
  // 获取小组详情
  detail: (groupId: string) => request<GroupDetailResponse>(`/groups/${groupId}`),
  // 加入小组
  join: (groupId: string) =>
    request<GroupActionResponse>(`/groups/${groupId}/join`, { method: 'POST' }),
  // 退出小组
  leave: (groupId: string) =>
    request<GroupActionResponse>(`/groups/${groupId}/leave`, { method: 'POST' }),
  // 创建小组目标
  createGoal: (groupId: string, data: CreateGroupGoalRequest) =>
    request<CreateGroupGoalResponse>(`/groups/${groupId}/goals`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  // 获取小组排行榜
  ranking: (groupId: string) => request<GroupRankingResponse>(`/groups/${groupId}/ranking`),
}

export default { authApi, subjectApi, questionApi, quizApi, monsterApi, rankingApi, achievementApi, rewardsApi, adminApi, wrongAnswerApi, analyticsApi, studyPlanApi, branchApi, shopApi, itemApi, challengeApi, aiQuestionApi, storyApi, npcApi, titleApi, cardApi, groupApi }
