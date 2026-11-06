import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '@/store'
import type { DashboardCard, DashboardRevealAgentArgs } from '../../../../shared/dashboard-snapshot'
import { revealDashboardAgent } from '../dashboard/reveal-dashboard-agent'
import { mountAgentTerminal } from './office-agent-launch'
import { wakeSleepers } from './office-sleepers'

/** How long a woken agent's window waits for it to come back before giving up. */
const WAKE_OPEN_MS = 30_000

export type OfficeAgentWindow = {
  /** The agent shown in the window; null keeps it closed. */
  card: DashboardCard | null
  open: (paneKey: string) => void
  onOpenChange: (open: boolean) => void
  onReveal: (args: DashboardRevealAgentArgs) => void
  onBrowserForeground: () => void
}

function leaveOffice(): void {
  if (useAppStore.getState().activeView === 'office') {
    useAppStore.getState().closeAgentOfficePage()
  }
}

function goToAgent(args: DashboardRevealAgentArgs): void {
  if (revealDashboardAgent(args)) {
    leaveOffice()
  }
}

/** The agent window in the middle of the office follows the live card, as the Agent Dashboard's does. */
export function useOfficeAgentWindow(cards: readonly DashboardCard[]): OfficeAgentWindow {
  const cardsRef = useRef(cards)
  useLayoutEffect(() => {
    cardsRef.current = cards
  })
  const [opened, setOpened] = useState<DashboardCard | null>(null)
  const card = useMemo(() => {
    if (!opened) {
      return null
    }
    // Why: a finished agent stays on screen until dismissed, without routing, because PTY ids can be reused.
    return (
      cards.find((c) => c.paneKey === opened.paneKey) ?? { ...opened, ptyId: null, leafId: null }
    )
  }, [cards, opened])

  const clickAcked = useRef<{ paneKey: string; stateChangedAt: number } | null>(null)
  const waking = useRef<{ paneKey: string; until: number } | null>(null)
  const open = useCallback((paneKey: string) => {
    const found = cardsRef.current.find((c) => c.paneKey === paneKey)
    if (!found) {
      // Why: a sleeping agent has no card; wake it, and its window opens once it is back.
      const record = useAppStore.getState().sleepingAgentSessionsByPaneKey[paneKey]
      if (record && wakeSleepers(record.worktreeId, paneKey) > 0) {
        waking.current = { paneKey, until: Date.now() + WAKE_OPEN_MS }
      }
      return
    }
    // Why: an agent started in the background has no live terminal until its tab mounts.
    if (!found.ptyId) {
      mountAgentTerminal(found.worktreeId, found.tabId)
    }
    useAppStore.getState().acknowledgeAgents([paneKey], undefined, 'explicit')
    clickAcked.current = { paneKey, stateChangedAt: found.stateChangedAt }
    setOpened(found)
  }, [])

  useEffect(() => {
    const woken = waking.current
    const back = woken && cards.find((c) => c.paneKey === woken.paneKey)
    if (woken && (back || Date.now() > woken.until)) {
      waking.current = null
      if (back) {
        setOpened(back)
      }
    }
  }, [cards])

  // Why: a state change seen in the open window is read, so the agent does not turn unseen behind it.
  useEffect(() => {
    const clicked = clickAcked.current
    if (
      card?.unseen &&
      !(clicked?.paneKey === card.paneKey && clicked.stateChangedAt === card.stateChangedAt)
    ) {
      useAppStore.getState().acknowledgeAgents([card.paneKey], undefined, 'view')
    }
  }, [card?.paneKey, card?.unseen, card?.stateChangedAt])

  const onOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setOpened(null)
    }
  }, [])

  return { card, open, onOpenChange, onReveal: goToAgent, onBrowserForeground: leaveOffice }
}
