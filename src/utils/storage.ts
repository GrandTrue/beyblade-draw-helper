import type { DrawStateMap } from '../types'
import { STORAGE_KEY } from './constants'

export function loadDrawStates(): DrawStateMap {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as DrawStateMap } catch { return {} }
}
export function saveDrawStates(states: DrawStateMap) { localStorage.setItem(STORAGE_KEY, JSON.stringify(states)) }
