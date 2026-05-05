import type { HfSpaceViewMode } from './HfSpacesHeaderActions'
import type { HfSpaceLayoutMode } from './HfSpacesTopBar'

const HF_SPACES_VIEW_MODE_STORAGE_KEY = 'cloud-checkin:hf-spaces-view-mode'
const HF_SPACES_LAYOUT_MODE_STORAGE_KEY = 'cloud-checkin:hf-spaces-layout-mode'

export function readHfSpaceViewModePreference(): HfSpaceViewMode {
  try {
    return window.localStorage.getItem(HF_SPACES_VIEW_MODE_STORAGE_KEY) === 'users' ? 'users' : 'all'
  } catch {
    return 'all'
  }
}

export function saveHfSpaceViewModePreference(nextValue: HfSpaceViewMode) {
  try {
    window.localStorage.setItem(HF_SPACES_VIEW_MODE_STORAGE_KEY, nextValue)
  } catch {}
}

export function readHfSpaceLayoutModePreference(): HfSpaceLayoutMode {
  try {
    return window.localStorage.getItem(HF_SPACES_LAYOUT_MODE_STORAGE_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

export function saveHfSpaceLayoutModePreference(nextValue: HfSpaceLayoutMode) {
  try {
    window.localStorage.setItem(HF_SPACES_LAYOUT_MODE_STORAGE_KEY, nextValue)
  } catch {}
}
