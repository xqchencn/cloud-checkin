import { useEffect, useRef, useState } from 'react'

/**
 * 计算日志页面大小
 * @param listElement - 列表元素
 * @param paginationElement - 分页元素
 * @returns 页面大小
 */
export function calculateLogPageSize(listElement?: HTMLElement | null, paginationElement?: HTMLElement | null): number {
  if (typeof window === 'undefined') return 10
  const isDesktop = window.matchMedia('(min-width: 768px)').matches
  const minRows = isDesktop ? 8 : 10
  const maxRows = isDesktop ? 40 : 30
  const bounds = listElement?.getBoundingClientRect()
  const paginationHeight = paginationElement?.getBoundingClientRect().height ?? 58
  const listTop = bounds?.top ?? (isDesktop ? 300 : 320)
  const headerHeight = isDesktop ? listElement?.querySelector('thead')?.getBoundingClientRect().height ?? 38 : 0
  const itemElement = isDesktop ? listElement?.querySelector('tbody tr') : listElement?.querySelector('article')
  const itemHeight = itemElement?.getBoundingClientRect().height || (isDesktop ? 49 : 136)
  const available = Math.max(0, window.innerHeight - listTop - headerHeight - paginationHeight - 24)
  return Math.max(minRows, Math.min(maxRows, Math.floor(available / itemHeight)))
}

/**
 * 使用日志页面大小 Hook
 * @returns 页面大小和引用
 */
export function useLogPageSize() {
  const listRef = useRef<HTMLDivElement | null>(null)
  const paginationRef = useRef<HTMLDivElement | null>(null)
  const [pageSize, setPageSize] = useState(() => calculateLogPageSize())

  useEffect(() => {
    function updatePageSize() {
      setPageSize(current => {
        const next = calculateLogPageSize(listRef.current, paginationRef.current)
        return current === next ? current : next
      })
    }
    updatePageSize()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePageSize)
    if (observer) {
      if (listRef.current) observer.observe(listRef.current)
      if (paginationRef.current) observer.observe(paginationRef.current)
    }
    window.addEventListener('resize', updatePageSize)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updatePageSize)
    }
  }, [])

  return { pageSize, listRef, paginationRef }
}
