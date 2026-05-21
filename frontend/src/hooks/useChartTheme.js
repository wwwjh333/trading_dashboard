/**
 * Returns chart styling values derived from the current CSS custom properties.
 * Automatically reflects the active dark/light theme.
 */
export function useChartTheme() {
  // Read CSS vars from :root at call time (reactive via re-renders triggered by theme change)
  const style = getComputedStyle(document.documentElement)
  const get = (v) => style.getPropertyValue(v).trim()

  return {
    grid:       get('--chart-grid')       || '#21262d',
    tooltipBg:  get('--chart-tooltip-bg') || '#161b22',
    textColor:  get('--chart-text')       || '#8b949e',
    borderColor: get('--color-border')    || '#21262d',

    // Accent palette
    blue:   `rgb(${get('--accent-blue')})`,
    green:  `rgb(${get('--accent-green')})`,
    red:    `rgb(${get('--accent-red')})`,
    yellow: `rgb(${get('--accent-yellow')})`,
    purple: `rgb(${get('--accent-purple')})`,
  }
}

export const CHART_PALETTE = [
  'var(--tw-accent-blue,  #58a6ff)',
  '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
]
