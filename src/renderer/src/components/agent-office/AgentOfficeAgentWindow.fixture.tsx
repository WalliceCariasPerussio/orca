import { defineFixture } from '../../component-fixtures/component-fixture'
import type { AgentStatusEntry } from '../../../../shared/agent-status/contracts/agent-status-types'
import { structuredAgentSessionPaneKey } from '../../../../shared/agent-session/view/structured-agent-session-projection'
import type { Repo } from '../../../../shared/repo-types'
import type { Tab } from '../../../../shared/tab-types'
import type { Worktree } from '../../../../shared/worktree/types'
import AgentOfficeBuilding from './AgentOfficeBuilding'
import { ROOM_COLS, ROOM_ROWS } from './office-room-grid'
import { deskSeats } from './project-floor-layout'
import { TILE_SIZE } from './vendor/pixel-agents/webview-ui/src/office/types'

const FLOOR_KEY = 'orca.agentOffice.floorId'

const repo: Repo = {
  id: 'mesa',
  path: 'F:/MesaLocal',
  displayName: 'MesaLocal',
  badgeColor: '#3b82f6',
  addedAt: 1
}

const worktree: Worktree = {
  id: 'mesa-checkout',
  displayName: 'Checkout redesign',
  repoId: repo.id,
  path: 'F:/MesaLocal/checkout',
  branch: 'checkout',
  head: 'abc123',
  isBare: false,
  isMainWorktree: false,
  comment: '',
  linkedIssue: null,
  linkedPR: null,
  linkedLinearIssue: null,
  isArchived: false,
  isUnread: false,
  isPinned: false,
  sortOrder: 0,
  lastActivityAt: 1
}

const tab: Tab = {
  id: 'chat-checkout',
  entityId: '22222222-2222-4222-8222-222222222222',
  contentType: 'agent-session',
  agentSessionAgent: 'claude',
  worktreeId: worktree.id,
  groupId: 'office',
  executionHostId: 'local',
  label: 'Chat',
  customLabel: null,
  color: null,
  sortOrder: 0,
  createdAt: 1
}

const entry: AgentStatusEntry = {
  paneKey: structuredAgentSessionPaneKey(tab.id, tab.entityId),
  worktreeId: worktree.id,
  agentType: 'claude',
  prompt: 'Redesign the checkout page',
  state: 'working',
  updatedAt: Date.now(),
  stateStartedAt: Date.now(),
  stateHistory: []
}

async function waitFor(frame: HTMLElement, selector: string): Promise<void> {
  for (let i = 0; i < 80 && !frame.querySelector(selector); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

// Why: mirror the office's integer-zoom centering to click the agent at the first desk.
function clickFirstDesk(canvas: HTMLCanvasElement): void {
  const box = canvas.getBoundingClientRect()
  const roomWidth = ROOM_COLS * TILE_SIZE
  const roomHeight = ROOM_ROWS * TILE_SIZE
  const zoom = Math.floor(Math.min(box.width / roomWidth, box.height / roomHeight))
  const { feet } = deskSeats(1)[0]
  canvas.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      clientX: box.left + Math.floor((box.width - roomWidth * zoom) / 2) + feet.x * zoom,
      clientY: box.top + Math.floor((box.height - roomHeight * zoom) / 2) + (feet.y - 10) * zoom
    })
  )
}

export const agentWindow = defineFixture({
  width: 960,
  store: {
    repos: [repo],
    worktreesByRepo: { [repo.id]: [worktree] },
    unifiedTabsByWorktree: { [worktree.id]: [tab] },
    agentStatusByPaneKey: { [entry.paneKey]: entry },
    agentStatusEpoch: 1
  },
  setup: () => localStorage.setItem(FLOOR_KEY, repo.id),
  render: () => (
    <div className="flex flex-col" style={{ height: 600 }}>
      <AgentOfficeBuilding />
    </div>
  ),
  interact: async (frame) => {
    await waitFor(frame, 'canvas + div button')
    await new Promise((resolve) => setTimeout(resolve, 500))
    const canvas = frame.querySelector('canvas')
    if (canvas) {
      clickFirstDesk(canvas)
    }
    await waitFor(frame, '[role="dialog"]')
  }
})
