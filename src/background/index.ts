import { searchTabs } from './searcher'
import { recordTabVisit, getHistoryEntries } from './storage'
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../shared/constants'
import type { ExtensionMessage, TabInfo, TabHistoryEntry, ExtensionSettings } from '../shared/types'

console.log('[TabPilot] Service worker started')

chrome.runtime.onInstalled.addListener(() => {
  console.log('[TabPilot] Extension installed')
})

// --- Tab history tracking ---
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.title) {
    recordTabVisit(tab.url, tab.title, tab.favIconUrl)
  }
})

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    if (tab.url && tab.title) {
      recordTabVisit(tab.url, tab.title, tab.favIconUrl)
    }
  } catch {
    // Tab may have been removed
  }
})

// --- Command handler (keyboard shortcut) ---
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-search') {
    await toggleSearchOverlay()
  }
})

async function toggleSearchOverlay() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !tab.url) return
    // Skip restricted URLs where content scripts can't run
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) return

    const tabId = tab.id

    // Check if content script is already loaded
    let isLoaded = false
    try {
      const [checkResult] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => !!(window as unknown as Record<string, boolean>).__ATM_SEARCH_LOADED__,
      })
      isLoaded = !!checkResult?.result
    } catch {
      // scripting.executeScript failed — tab may not support it
    }

    // Inject content script if not loaded
    if (!isLoaded) {
      const manifest = chrome.runtime.getManifest()
      const contentScriptFiles = manifest.content_scripts?.[0]?.js || []
      if (contentScriptFiles.length > 0) {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: contentScriptFiles,
        })
      }
    }

    // Toggle the overlay via executeScript
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const toggleFn = (window as unknown as Record<string, () => void>).__ATM_TOGGLE_SEARCH__
        if (toggleFn) toggleFn()
      },
    })
  } catch {
    // Tab doesn't support scripting (e.g. chrome:// pages)
  }
}

// --- Message handler ---
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse).catch((err) => {
      console.error('[TabPilot] Error:', err)
      sendResponse({ error: err.message })
    })
    return true
  },
)

async function fetchGoogleSuggestions(query: string): Promise<string[]> {
  if (!query) return []
  const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`
  const res = await fetch(url)
  const data = await res.json() as [string, string[]]
  return data[1] ?? []
}

async function handleMessage(message: ExtensionMessage): Promise<unknown> {
  switch (message.action) {
    case 'SEARCH_TABS': {
      const payload = message.payload as { query: string; windowId?: number } | undefined
      const query = payload?.query ?? ''
      const windowId = payload?.windowId

      const [tabs, internalHistory, browserHistory] = await Promise.all([
        windowId !== undefined
          ? chrome.tabs.query({ windowId })
          : chrome.tabs.query({ currentWindow: true }),
        getHistoryEntries(),
        chrome.history.search({ text: query, maxResults: 100, startTime: 0 }),
      ])

      const openTabs: TabInfo[] = tabs
        .filter((t) => t.id !== undefined)
        .map((t) => ({
          id: t.id!,
          url: t.url || '',
          title: t.title || '',
          favIconUrl: t.favIconUrl,
          windowId: t.windowId,
          index: t.index,
          active: t.active,
          pinned: t.pinned,
        }))

      const browserEntries: TabHistoryEntry[] = browserHistory
        .filter((h) => h.url)
        .map((h) => ({
          url: h.url!,
          title: h.title || h.url!,
          lastAccessed: h.lastVisitTime ?? Date.now(),
          visitCount: h.visitCount ?? 1,
          closed: true,
        }))

      const internalUrls = new Set(internalHistory.map((e) => e.url))
      const merged: TabHistoryEntry[] = [
        ...internalHistory,
        ...browserEntries.filter((e) => !internalUrls.has(e.url)),
      ]

      return searchTabs(query, openTabs, merged)
    }

    case 'GET_GOOGLE_SUGGESTIONS': {
      const query = (message.payload as { query?: string } | undefined)?.query ?? ''
      return fetchGoogleSuggestions(query)
    }

    case 'GET_SETTINGS': {
      const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS)
      const saved = (data[STORAGE_KEYS.SETTINGS] ?? {}) as Partial<ExtensionSettings>
      return { ...DEFAULT_SETTINGS, ...saved }
    }

    case 'SAVE_SETTINGS': {
      const newSettings = message.payload as ExtensionSettings
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: newSettings })
      return { ok: true }
    }

    case 'SWITCH_TAB': {
      const tabId = (message.payload as { tabId: number })?.tabId
      if (tabId) {
        await chrome.tabs.update(tabId, { active: true })
      }
      return { ok: true }
    }

    case 'OPEN_URL': {
      const url = (message.payload as { url: string })?.url
      if (url) {
        await chrome.tabs.create({ url })
      }
      return { ok: true }
    }

    case 'TOGGLE_SEARCH_OVERLAY': {
      await toggleSearchOverlay()
      return { ok: true }
    }

    default:
      return { error: 'Unknown action' }
  }
}
