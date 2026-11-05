import { defineFixture } from '../../component-fixtures/component-fixture'
import type { PetCatalogPage } from '../../../../shared/pet-catalog-types'
import PetShopPanel from './PetShopPanel'
import StaffPetsPanel from './StaffPetsPanel'
import { DEFAULT_STAFF_PETS } from './office-staff-pets'

const SAMPLE_PAGE: PetCatalogPage = {
  page: 1,
  totalPages: 3,
  pets: [
    {
      id: 'boxcat',
      displayName: 'Boxcat',
      description: 'A cat that lives in a cardboard box.',
      ownerHandle: 'railly',
      tags: ['cat'],
      posterUrl: null
    },
    {
      id: 'byte-bunny',
      displayName: 'Byte Bunny',
      description: 'A rabbit with a tiny laptop.',
      ownerHandle: 'railly',
      tags: ['animal'],
      posterUrl: null
    },
    {
      id: 'prompt-penguin',
      displayName: 'Prompt Penguin',
      description: 'A penguin that writes prompts.',
      ownerHandle: 'railly',
      tags: ['animal'],
      posterUrl: null
    }
  ]
}

function Frame({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="relative" style={{ height: 520 }}>
      {children}
    </div>
  )
}

export const staffPets = defineFixture({
  width: 640,
  render: () => (
    <Frame>
      <StaffPetsPanel
        staffPets={DEFAULT_STAFF_PETS}
        onAssign={() => {}}
        onOpenShop={() => {}}
        onClose={() => {}}
      />
    </Frame>
  )
})

export const petShop = defineFixture({
  width: 640,
  render: () => (
    <Frame>
      <PetShopPanel
        onClose={() => {}}
        catalog={{ catalogList: async () => SAMPLE_PAGE, catalogInstall: async () => null }}
      />
    </Frame>
  ),
  interact: async (frame) => {
    for (let i = 0; i < 30 && !frame.querySelector('li'); i++) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
})

export const petShopUnavailable = defineFixture({
  width: 640,
  render: () => (
    <Frame>
      <PetShopPanel
        onClose={() => {}}
        catalog={{ catalogList: async () => undefined as never, catalogInstall: async () => null }}
      />
    </Frame>
  )
})
