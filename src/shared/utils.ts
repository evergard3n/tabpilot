export function isMac(): boolean {
  return /mac/i.test(navigator.platform) || navigator.userAgent.includes('Mac')
}

export function getSearchShortcutLabel(): string {
  return isMac() ? '⌃⇧F' : 'Ctrl+Shift+F'
}

export function extractDomain(url: string | undefined): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}
