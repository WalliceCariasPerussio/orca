import { app } from 'electron'

// Fork builds (the Escritório workflow) set ORCA_DISABLE_APP_UPDATES=1 at build time: every update feed
// points at stablyai/orca, so accepting an update would replace the fork with the official app.
const APP_UPDATES_DISABLED_BY_BUILD =
  typeof ORCA_APP_UPDATES_DISABLED !== 'undefined' && ORCA_APP_UPDATES_DISABLED === true

/** False for unpackaged runs and for fork builds; both skip every app update check. */
export function appUpdatesAvailable(): boolean {
  return app.isPackaged && !APP_UPDATES_DISABLED_BY_BUILD
}
