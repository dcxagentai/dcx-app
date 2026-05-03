/**
 * CONTEXT:
 * Shared responsive layout hooks for DCX app master-detail workbenches.
 * Messages established the MVP pattern: mobile and tablet widths keep the table as the primary
 * surface and open detail content in a Sheet, while desktop widths use a resizable split.
 */
import { useEffect, useState } from "react"

export function useDcxAppDetailSheetMode(): boolean {
  const [isSheetMode, setIsSheetMode] = useState(() => {
    if (typeof window === "undefined") {
      return false
    }
    return window.matchMedia("(max-width: 1279px)").matches
  })

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia("(max-width: 1279px)")
    const updateSheetMode = () => setIsSheetMode(mediaQuery.matches)

    updateSheetMode()
    mediaQuery.addEventListener("change", updateSheetMode)

    return () => mediaQuery.removeEventListener("change", updateSheetMode)
  }, [])

  return isSheetMode
}

export function useDcxAppBalancedDesktopSplitMode(): boolean {
  const [isBalancedSplitMode, setIsBalancedSplitMode] = useState(() => {
    if (typeof window === "undefined") {
      return false
    }
    return window.matchMedia("(min-width: 1280px) and (max-width: 1599px)").matches
  })

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia("(min-width: 1280px) and (max-width: 1599px)")
    const updateBalancedSplitMode = () => setIsBalancedSplitMode(mediaQuery.matches)

    updateBalancedSplitMode()
    mediaQuery.addEventListener("change", updateBalancedSplitMode)

    return () => mediaQuery.removeEventListener("change", updateBalancedSplitMode)
  }, [])

  return isBalancedSplitMode
}
