// 游戏逻辑Hook
import { useState, useCallback } from 'react'
import { subjectApi, questionApi, quizApi, monsterApi, rankingApi, achievementApi } from '../services/api'
import type { Subject, Question, QuizResult, RankingItem, Achievement } from '../types'

// 带超时的请求包装：避免后端延迟导致前端按钮永久"提交中..."
export async function withTimeout<T>(promise: Promise<T>, timeoutMs = 15000, errorMsg = '请求超时，请重试'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export function useGame() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取学科列表
  const fetchSubjects = useCallback(async () => {
    try {
      const data = await subjectApi.list()
      setSubjects(data.subjects)
      return data.subjects
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取学科失败')
      return []
    }
  }, [])

  // 获取随机题目
  const fetchQuestions = useCallback(async (subjectId: string, count = 10) => {
    setLoading(true)
    setError(null)
    try {
      const data = await questionApi.random(subjectId, count)
      setQuestions(data.questions)
      return data.questions
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取题目失败')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // 提交答案（带15秒超时保护，避免按钮永久卡在"提交中..."）
  const submitAnswer = useCallback(async (questionId: string, selectedOption: number, timeTaken: number, fillblankAnswer?: string) => {
    try {
      const result = await withTimeout(
        quizApi.submit(questionId, selectedOption, timeTaken, fillblankAnswer),
        15000,
        '提交超时，请检查网络后重试'
      )
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : '提交答案失败'
      setError(msg)
      throw err
    }
  }, [])

  // 修改怪兽名字
  const renameMonster = useCallback(async (name: string) => {
    try {
      const data = await monsterApi.rename(name)
      return data.monsterName
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改名字失败')
      throw err
    }
  }, [])

  // 获取排行榜
  const fetchRanking = useCallback(async (type = 'level') => {
    setLoading(true)
    try {
      const data = await rankingApi.list(type)
      setRanking(data.ranking)
      return { ranking: data.ranking, myRank: data.myRank }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取排行榜失败')
      return { ranking: [], myRank: null }
    } finally {
      setLoading(false)
    }
  }, [])

  // 获取成就列表
  const fetchAchievements = useCallback(async () => {
    try {
      const data = await achievementApi.list()
      setAchievements(data.achievements)
      return data.achievements
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取成就失败')
      return []
    }
  }, [])

  return {
    subjects,
    questions,
    ranking,
    achievements,
    loading,
    error,
    fetchSubjects,
    fetchQuestions,
    submitAnswer,
    renameMonster,
    fetchRanking,
    fetchAchievements,
    setError,
  }
}
