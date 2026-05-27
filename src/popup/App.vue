<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getMessage } from '../shared/i18n'
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../shared/constants'
import type { ExtensionSettings, ThemeMode } from '../shared/types'

const themeMode = ref<ThemeMode>(DEFAULT_SETTINGS.theme)
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

const isDarkActive = computed(() => {
  if (themeMode.value === 'dark') return true
  if (themeMode.value === 'light') return false
  return mediaQuery.matches
})

function applyTheme(mode: ThemeMode) {
  const isDark = mode === 'dark' || (mode === 'system' && mediaQuery.matches)
  document.documentElement.classList.toggle('dark', isDark)
}

function saveTheme(mode: ThemeMode) {
  themeMode.value = mode
  chrome.storage.local.get(STORAGE_KEYS.SETTINGS).then((data) => {
    const s = ((data[STORAGE_KEYS.SETTINGS] as Partial<ExtensionSettings>) ?? { ...DEFAULT_SETTINGS }) as ExtensionSettings
    s.theme = mode
    chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: s })
  })
}

function cycleTheme() {
  const order: ThemeMode[] = ['light', 'dark', 'system']
  const next = order[(order.indexOf(themeMode.value) + 1) % order.length]
  saveTheme(next)
}

function onSystemThemeChange() {
  if (themeMode.value === 'system') applyTheme('system')
}

watch(themeMode, (mode) => applyTheme(mode))

async function openSearchOverlay() {
  await chrome.runtime.sendMessage({ action: 'TOGGLE_SEARCH_OVERLAY' })
  window.close()
}


onMounted(async () => {
  const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS)
  const stored = data[STORAGE_KEYS.SETTINGS] as Partial<ExtensionSettings> | undefined
  if (stored?.theme) themeMode.value = stored.theme
  applyTheme(themeMode.value)
  mediaQuery.addEventListener('change', onSystemThemeChange)
})

onUnmounted(() => {
  mediaQuery.removeEventListener('change', onSystemThemeChange)
})
</script>

<template>
  <div class="popup-root">
    <header class="popup-header">
      <div class="popup-brand">
        <img src="/icons/icon-32.png" alt="" class="popup-logo" />
        <span class="popup-title">TabPilot</span>
      </div>
      <div class="popup-actions">
        <button
          class="icon-btn"
          @click="openSearchOverlay"
          :title="getMessage('searchTabs')"
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
          </svg>
        </button>
        <button
          class="icon-btn"
          @click="cycleTheme"
          :title="themeMode === 'light' ? 'Light mode' : themeMode === 'dark' ? 'Dark mode' : 'System theme'"
        >
          <!-- Sun: light mode -->
          <svg v-if="themeMode === 'light'" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.06 1.06l1.06 1.06z" />
          </svg>
          <!-- Moon: dark mode -->
          <svg v-else-if="themeMode === 'dark'" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clip-rule="evenodd" />
          </svg>
          <!-- Monitor: system mode -->
          <svg v-else viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v8.5A2.25 2.25 0 0115.75 15h-3.105a3.501 3.501 0 01-5.29 0H4.25A2.25 2.25 0 012 12.75v-8.5zM4.25 3.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h3.105a.75.75 0 01.672.418 2.001 2.001 0 003.946 0 .75.75 0 01.672-.418h3.105a.75.75 0 00.75-.75v-8.5a.75.75 0 00-.75-.75H4.25z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </header>

    <main class="popup-main">
      <button class="search-btn" @click="openSearchOverlay">
        <svg class="search-btn-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
        </svg>
        <span class="search-btn-label">{{ getMessage('searchTabs') }}</span>
        <kbd class="search-btn-kbd">Ctrl+Shift+F</kbd>
      </button>

      <div class="theme-row">
        <span class="theme-label" style="color: var(--text-secondary);">{{ getMessage('theme') ?? 'Theme' }}</span>
        <div class="theme-pills">
          <button
            v-for="mode in (['light', 'dark', 'system'] as ThemeMode[])"
            :key="mode"
            class="theme-pill"
            :class="{ active: themeMode === mode }"
            @click="saveTheme(mode)"
          >
            {{ mode.charAt(0).toUpperCase() + mode.slice(1) }}
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.popup-root {
  width: 300px;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 10px;
  box-shadow: 0 0.5px 0 var(--border);
}

.popup-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.popup-logo {
  width: 18px;
  height: 18px;
}

.popup-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.popup-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}

.icon-btn svg {
  width: 15px;
  height: 15px;
}

.icon-btn:hover {
  background: var(--hover);
}

.icon-btn:active {
  transform: scale(0.95);
}

.popup-main {
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  text-align: left;
}

.search-btn:hover {
  background: var(--hover);
  border-color: var(--accent);
}

.search-btn:active {
  transform: scale(0.98);
}

.search-btn-icon {
  width: 15px;
  height: 15px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.search-btn-label {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary);
}

.search-btn-kbd {
  font-size: 10px;
  padding: 2px 5px;
  border-radius: 4px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-tertiary);
  font-family: inherit;
  white-space: nowrap;
}

.theme-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.theme-label {
  font-size: 12px;
}

.theme-pills {
  display: flex;
  gap: 4px;
}

.theme-pill {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}

.theme-pill:hover {
  background: var(--hover);
}

.theme-pill.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
</style>
