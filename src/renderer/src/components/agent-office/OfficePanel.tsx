import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { Button } from '../ui/button'

type OfficePanelProps = {
  title: string
  onClose: () => void
  children: React.ReactNode
}

/** A window that opens over the office, closed with its X or Escape. */
export default function OfficePanel({
  title,
  onClose,
  children
}: OfficePanelProps): React.JSX.Element {
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bodyRef.current
      ?.querySelector<HTMLElement>('button, input, [role="combobox"], [tabindex="0"]')
      ?.focus()
  }, [])
  return (
    <div
      role="dialog"
      aria-label={title}
      className="absolute inset-x-3 top-3 z-20 mx-auto flex max-h-[calc(100%-1.5rem)] max-w-xl flex-col rounded-xl border border-border bg-popover text-popover-foreground shadow-floating"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          // Why: the page closes on Escape; here it only closes this window.
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border py-2 pr-2 pl-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={translate('auto.components.agentOffice.panel.close', 'Close')}
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      <div ref={bodyRef} className="scrollbar-sleek min-h-0 overflow-y-auto p-3">
        {children}
      </div>
    </div>
  )
}
