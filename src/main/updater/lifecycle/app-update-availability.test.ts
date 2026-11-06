import { afterEach, describe, expect, it, vi } from 'vitest'

const { appMock } = vi.hoisted(() => ({ appMock: { isPackaged: true } }))

vi.mock('electron', () => ({ app: appMock }))

async function loadAvailability(): Promise<() => boolean> {
  vi.resetModules()
  const module = await import('./app-update-availability')
  return module.appUpdatesAvailable
}

afterEach(() => {
  appMock.isPackaged = true
  vi.unstubAllGlobals()
})

describe('appUpdatesAvailable', () => {
  it('allows updates in a packaged build without the fork switch', async () => {
    expect((await loadAvailability())()).toBe(true)
  })

  it('skips updates when the app is not packaged', async () => {
    appMock.isPackaged = false
    expect((await loadAvailability())()).toBe(false)
  })

  it('skips updates in a packaged fork build', async () => {
    vi.stubGlobal('ORCA_APP_UPDATES_DISABLED', true)
    expect((await loadAvailability())()).toBe(false)
  })

  it('keeps updates when the switch is compiled to false', async () => {
    vi.stubGlobal('ORCA_APP_UPDATES_DISABLED', false)
    expect((await loadAvailability())()).toBe(true)
  })
})
