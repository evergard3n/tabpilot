export interface TabInfo {
  id: number
  url: string
  title: string
  favIconUrl?: string
  windowId: number
  index: number
  active: boolean
  pinned: boolean
}

export interface TabHistoryEntry {
  url: string
  title: string
  favIconUrl?: string
  lastAccessed: number
  visitCount: number
  closed: boolean
}

export interface SearchResult {
  tab: TabInfo | TabHistoryEntry
  score: number
  isOpen: boolean
}

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ExtensionSettings {
  language: 'auto' | 'en' | 'zh_CN'
  searchShortcut: string
  theme: ThemeMode
}

export type MessageAction =
  | 'SEARCH_TABS'
  | 'GET_GOOGLE_SUGGESTIONS'
  | 'GET_SETTINGS'
  | 'SAVE_SETTINGS'
  | 'SWITCH_TAB'
  | 'OPEN_URL'
  | 'TOGGLE_SEARCH_OVERLAY'

export interface ExtensionMessage {
  action: MessageAction
  payload?: unknown
}
