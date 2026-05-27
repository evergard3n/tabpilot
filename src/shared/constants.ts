import type { ExtensionSettings } from './types'

export const DEFAULT_SETTINGS: ExtensionSettings = {
  language: 'auto',
  searchShortcut: 'Ctrl+Shift+F',
  theme: 'system',
}

export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  TAB_HISTORY: 'tabHistory',
} as const
