import { useRef, useEffect, useCallback, useState } from 'react'

/**
 * 从 CSS transform 字符串中提取 translateX 值
 * 兼容所有浏览器，不依赖 DOMMatrixReadOnly
 */
function getTranslateX(transform: string): number {
  if (!transform || transform === 'none') return 0
  // 匹配 matrix(a, b, c, d, e, f) 中的 e 值（translateX）
  const matrixMatch = transform.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,\s*([\d.\-]+)/)
  if (matrixMatch) return parseFloat(matrixMatch[1])
  // 匹配 translateX(100px)
  const translateMatch = transform.match(/translateX\(\s*([\d.\-]+)px\s*\)/)
  if (translateMatch) return parseFloat(translateMatch[1])
  return 0
}

/**
 * 胶囊式分段控制器拖拽 Hook
 * 拖拽时滑块像素级跟随手指/鼠标，松手后吸附到最近的分段
 * 返回 displayIndex：当前高亮的索引
 * 返回 indicatorProgress：指示器在 0~(itemCount-1) 之间的连续浮点位置，用于文字颜色插值
 */
export function useCapsuleControl(options: {
  itemCount: number
  activeIndex: number
  onActivate: (index: number) => void
}) {
  const { itemCount, activeIndex, onActivate } = options
  const containerRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const itemWidthRef = useRef(0)
  const paddingRef = useRef(0)

  const isDragging = useRef(false)
  const startX = useRef(0)
  const startTransform = useRef(0)
  const hasMoved = useRef(false)

  // 拖动过程中实时高亮的索引（-1 表示未在拖动）
  const [hoverIndex, setHoverIndex] = useState(-1)
  // 指示器的连续浮点位置，用于文字颜色插值
  const [indicatorProgress, setIndicatorProgress] = useState(activeIndex)

  // 计算每个 tab 的宽度 & 设置指示器宽度
  const recalcWidths = useCallback(() => {
    const el = containerRef.current
    const ind = indicatorRef.current
    if (!el || itemCount === 0) return
    const style = getComputedStyle(el)
    const padLeft = parseFloat(style.paddingLeft) || 0
    const padRight = parseFloat(style.paddingRight) || 0
    paddingRef.current = padLeft
    const w = (el.offsetWidth - padLeft - padRight) / itemCount
    itemWidthRef.current = w
    if (ind) {
      ind.style.width = `${w}px`
    }
  }, [itemCount])

  // 设置指示器位置（基于距离计算持续时间，保持恒定速度）
  const setIndicatorPosition = useCallback((index: number, animate: boolean) => {
    const ind = indicatorRef.current
    if (!ind) return
    const targetX = index * itemWidthRef.current
    if (animate) {
      const style = getComputedStyle(ind)
      const currentX = getTranslateX(style.transform)
      const distance = Math.abs(targetX - currentX)
      const duration = Math.max(0.25, Math.min(0.6, distance / 500))
      ind.style.transition = `transform ${duration}s cubic-bezier(0.25, 1, 0.5, 1)`
    } else {
      ind.style.transition = 'none'
    }
    ind.style.transform = `translateX(${targetX}px)`
  }, [])

  // 监听指示器 transform 变化，实时更新 indicatorProgress
  useEffect(() => {
    const ind = indicatorRef.current
    if (!ind) return
    let rafId = 0
    const updateProgress = () => {
      const style = getComputedStyle(ind!)
      const x = getTranslateX(style.transform)
      const progress = itemWidthRef.current > 0 ? x / itemWidthRef.current : activeIndex
      setIndicatorProgress(progress)
      // 如果动画还在进行中，继续监听
      rafId = requestAnimationFrame(updateProgress)
    }
    rafId = requestAnimationFrame(updateProgress)
    return () => cancelAnimationFrame(rafId)
  }, [activeIndex])

  // 初始化 & resize
  useEffect(() => {
    recalcWidths()
    setIndicatorPosition(activeIndex, false)
    setIndicatorProgress(activeIndex)
    const raf = requestAnimationFrame(() => setIndicatorPosition(activeIndex, true))

    const onResize = () => {
      recalcWidths()
      setIndicatorPosition(activeIndex, false)
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [itemCount, recalcWidths, setIndicatorPosition])

  // activeIndex 变化时更新位置
  useEffect(() => {
    recalcWidths()
    setIndicatorPosition(activeIndex, true)
  }, [activeIndex, recalcWidths, setIndicatorPosition])

  // Pointer 事件处理
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      isDragging.current = true
      hasMoved.current = false
      startX.current = e.clientX
      el.setPointerCapture(e.pointerId)

      const ind = indicatorRef.current
      if (ind) {
        const style = getComputedStyle(ind)
        startTransform.current = getTranslateX(style.transform) ?? (activeIndex * itemWidthRef.current)
        ind.style.transition = 'none'
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return
      const deltaX = e.clientX - startX.current
      if (Math.abs(deltaX) > 3) hasMoved.current = true

      let targetX = startTransform.current + deltaX
      const maxX = (itemCount - 1) * itemWidthRef.current
      if (targetX < 0) targetX = 0
      if (targetX > maxX) targetX = maxX

      const ind = indicatorRef.current
      if (ind) {
        ind.style.transform = `translateX(${targetX}px)`
      }

      const hoverIdx = Math.round(targetX / itemWidthRef.current)
      setHoverIndex(hoverIdx)
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging.current) return
      isDragging.current = false
      try { el.releasePointerCapture(e.pointerId) } catch {}

      let targetIndex: number

      if (hasMoved.current) {
        const ind = indicatorRef.current
        if (ind) {
          const style = getComputedStyle(ind)
          const currentX = getTranslateX(style.transform)
          targetIndex = Math.round(currentX / itemWidthRef.current)
        } else {
          targetIndex = activeIndex
        }
      } else {
        const rect = el.getBoundingClientRect()
        const padLeft = paddingRef.current
        const clickX = e.clientX - rect.left - padLeft
        targetIndex = Math.floor(clickX / itemWidthRef.current)
      }

      targetIndex = Math.max(0, Math.min(itemCount - 1, targetIndex))
      setHoverIndex(-1)
      onActivate(targetIndex)
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
    }
  }, [itemCount, activeIndex, onActivate])

  const displayIndex = hoverIndex >= 0 ? hoverIndex : activeIndex

  return { containerRef, indicatorRef, displayIndex, indicatorProgress }
}
