import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import OfficePanel from './OfficePanel'
import PetThumbnail from './PetThumbnail'
import { usePetChoices, usePetSprites } from './office-pet-choices'

type FloorTeamPanelProps = {
  floorName: string
  /** Pet ids that work on this floor; empty dresses each agent by its kind. */
  team: readonly string[]
  onChange: (petIds: string[]) => void
  onOpenShop: () => void
  onClose: () => void
}

const THUMBNAIL_PX = 56

/** The team board: pick which pets work on this floor. */
export default function FloorTeamPanel({
  floorName,
  team,
  onChange,
  onOpenShop,
  onClose
}: FloorTeamPanelProps): React.JSX.Element {
  const choices = usePetChoices()
  const sprites = usePetSprites(choices)
  const picked = new Set(team)
  const toggle = (petId: string, on: boolean): void => {
    onChange(choices.map((c) => c.id).filter((id) => (id === petId ? on : picked.has(id))))
  }
  return (
    <OfficePanel
      title={translate('auto.components.agentOffice.team.title', 'Team of {{value0}}', {
        value0: floorName
      })}
      onClose={onClose}
    >
      <p className="mb-3 text-xs text-muted-foreground">
        {translate(
          'auto.components.agentOffice.team.description',
          'Pick the pets that work on this floor. Each new agent here draws one of them, whether it is Claude, Codex or another agent, and keeps it. With none picked, each kind of agent wears its pet from the reception. Saved on this computer.'
        )}
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {choices.map((choice) => {
          const on = picked.has(choice.id)
          return (
            <label
              key={choice.id}
              className={cn(
                'flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-2 text-sm',
                on ? 'border-primary bg-accent' : 'border-border hover:bg-accent/50'
              )}
            >
              <PetThumbnail sprite={sprites.get(choice.id) ?? null} size={THUMBNAIL_PX} />
              <span className="flex w-full min-w-0 items-center gap-1.5">
                <Checkbox
                  checked={on}
                  onCheckedChange={(checked) => toggle(choice.id, checked === true)}
                />
                <span className="truncate">{choice.label}</span>
              </span>
            </label>
          )
        })}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">
          {translate('auto.components.agentOffice.staff.morePets', 'Want more pets?')}
        </p>
        <Button variant="outline" size="sm" onClick={onOpenShop}>
          {translate('auto.components.agentOffice.staff.openShop', 'Open the pet shop')}
        </Button>
      </div>
    </OfficePanel>
  )
}
