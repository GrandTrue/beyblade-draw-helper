import { useRef, useState } from 'react'
import type { DrawStateMap, DrawStatus } from '../types'
import { loadDrawStates } from '../utils/storage'

const PROFILES_KEY = 'funbox_draw_profiles_v2'
type Profiles = Record<'line1' | 'line2', DrawStateMap>
const loadProfiles = (): Profiles => {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || 'null') || { line1: loadDrawStates(), line2: {} } }
  catch { return { line1: {}, line2: {} } }
}

export function useDrawStatus(profile: 'line1' | 'line2') {
  const [profiles, setProfiles] = useState<Profiles>(loadProfiles)
  const profilesRef = useRef(profiles)
  const updateProfiles = (update: (current: Profiles) => Profiles) => {
    const next = update(profilesRef.current)
    profilesRef.current = next
    localStorage.setItem(PROFILES_KEY, JSON.stringify(next))
    setProfiles(next)
  }
  const states = profiles[profile]
  const setStatus = (id: string, status: DrawStatus) => updateProfiles(current => ({ ...current, [profile]: { ...current[profile], [id]: { status, updatedAt: new Date().toISOString() } } }))
  const clear = () => updateProfiles(current => ({ ...current, [profile]: {} }))
  const importStates = (next: DrawStateMap) => updateProfiles(current => ({ ...current, [profile]: next }))
  return { states, setStatus, clear, importStates }
}
