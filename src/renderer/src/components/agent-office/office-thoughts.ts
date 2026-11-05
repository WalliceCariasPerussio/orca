import { translate } from '@/i18n/i18n'
import { agentRowToolInput } from '@/lib/agent-row-tool-preview'
import type { AgentStatusEntry } from '../../../../shared/agent-status/contracts/agent-status-types'
import type { DashboardCard } from '../../../../shared/dashboard-snapshot'

/** What each agent thinks out loud, by pane. */
export type OfficeThoughts = ReadonlyMap<string, string>

function toolVerb(toolName: string): string {
  switch (toolName) {
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit':
      return translate('auto.components.agentOffice.thought.edit', 'Editing')
    case 'Write':
      return translate('auto.components.agentOffice.thought.write', 'Writing')
    case 'Read':
      return translate('auto.components.agentOffice.thought.read', 'Reading')
    case 'Bash':
    case 'PowerShell':
      return translate('auto.components.agentOffice.thought.run', 'Running')
    case 'Grep':
    case 'Glob':
      return translate('auto.components.agentOffice.thought.search', 'Looking for')
    case 'WebSearch':
    case 'WebFetch':
      return translate('auto.components.agentOffice.thought.web', 'Researching')
    case 'Task':
    case 'Agent':
      return translate('auto.components.agentOffice.thought.delegate', 'Delegating')
    case 'TodoWrite':
      return translate('auto.components.agentOffice.thought.plan', 'Planning')
    default:
      // Why: MCP tools read as `mcp__server__tool`; the tool's own name says the most.
      return toolName.split('__').at(-1) ?? toolName
  }
}

function firstLine(text: string | undefined): string {
  return (text ?? '').trim().split('\n')[0]?.trim() ?? ''
}

// Why: a path says the most by its file name; anything else keeps its first line.
function shortTarget(input: string): string {
  const line = firstLine(input)
  return /^[^\s]*[\\/][^\s]*$/.test(line) ? (line.split(/[\\/]/).findLast(Boolean) ?? line) : line
}

/** AskUserQuestion arrives as its JSON input; the pet thinks the question itself. */
function questionOf(prompt: string): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(prompt)
  } catch {
    return firstLine(prompt)
  }
  const questions =
    parsed && typeof parsed === 'object' && 'questions' in parsed ? parsed.questions : null
  const first: unknown = Array.isArray(questions) ? questions[0] : null
  const question = first && typeof first === 'object' && 'question' in first ? first.question : null
  return typeof question === 'string' ? firstLine(question) : firstLine(prompt)
}

function toolThought(entry: AgentStatusEntry | undefined): string {
  const toolName = entry?.toolName?.trim()
  if (!entry || !toolName) {
    return ''
  }
  const target = shortTarget(agentRowToolInput(entry, entry.state))
  return target ? `${toolVerb(toolName)} ${target}` : toolVerb(toolName)
}

/** What a pet thinks: what its agent is doing, the question it has for you, or what it just said. */
export function thoughtOf(card: DashboardCard, entry: AgentStatusEntry | undefined): string {
  switch (card.bucket) {
    case 'attention': {
      if (card.askSummary) {
        return questionOf(card.askSummary)
      }
      const tool = toolThought(entry)
      return tool
        ? translate('auto.components.agentOffice.thought.allow', 'Allow: {{value0}}?', {
            value0: tool
          })
        : ''
    }
    case 'working':
      return (
        toolThought(entry) ||
        firstLine(card.lastAgentMessage) ||
        translate('auto.components.agentOffice.thought.thinking', 'Thinking…')
      )
    case 'done':
      return firstLine(card.lastAgentMessage)
    case 'idle':
      return ''
  }
}

export function thoughtsFrom(
  cards: readonly DashboardCard[],
  statusByPaneKey: Readonly<Record<string, AgentStatusEntry>>
): OfficeThoughts {
  const thoughts = new Map<string, string>()
  for (const card of cards) {
    const thought = thoughtOf(card, statusByPaneKey[card.paneKey])
    if (thought) {
      thoughts.set(card.paneKey, thought)
    }
  }
  return thoughts
}

export function sameThoughts(a: OfficeThoughts, b: OfficeThoughts): boolean {
  return a.size === b.size && [...a].every(([key, text]) => b.get(key) === text)
}
