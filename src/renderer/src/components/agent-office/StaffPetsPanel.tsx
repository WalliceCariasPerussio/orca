import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { BUNDLED_PETS } from '../pet/pet-models'
import OfficePanel from './OfficePanel'
import { STAFF_ROLES, type StaffPets, type StaffRole } from './office-staff-pets'

type StaffPetsPanelProps = {
  staffPets: StaffPets
  onAssign: (role: StaffRole, petId: string) => void
  onOpenShop: () => void
  onClose: () => void
}

function roleLabel(role: StaffRole): string {
  switch (role) {
    case 'claude':
      return 'Claude'
    case 'codex':
      return 'Codex'
    case 'opencode':
      return 'OpenCode'
    case 'other':
      return translate('auto.components.agentOffice.staff.otherAgents', 'Other agents')
  }
}

/** Pick the pet each kind of agent wears at its desk. */
export default function StaffPetsPanel({
  staffPets,
  onAssign,
  onOpenShop,
  onClose
}: StaffPetsPanelProps): React.JSX.Element {
  const customPets = useAppStore((s) => s.customPets)
  const choices = [
    ...BUNDLED_PETS.map((pet) => ({ id: pet.id, label: pet.label })),
    ...customPets.map((pet) => ({ id: pet.id, label: pet.label }))
  ]
  return (
    <OfficePanel
      title={translate('auto.components.agentOffice.staff.title', 'Team pets')}
      onClose={onClose}
    >
      <p className="mb-3 text-xs text-muted-foreground">
        {translate(
          'auto.components.agentOffice.staff.description',
          'Each kind of agent shows up at its desk as the pet you pick here. Saved on this computer.'
        )}
      </p>
      <div className="flex flex-col gap-2">
        {STAFF_ROLES.map((role) => (
          <div key={role} className="flex items-center justify-between gap-3">
            <span className="text-sm">{roleLabel(role)}</span>
            <Select value={staffPets[role]} onValueChange={(petId) => onAssign(role, petId)}>
              <SelectTrigger size="sm" className="w-56" aria-label={roleLabel(role)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {choices.map((choice) => (
                  <SelectItem key={choice.id} value={choice.id}>
                    {choice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
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
