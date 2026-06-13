import type { ColorTheme, PatternType, DesignParams } from '../types'

interface ThemeFeatures {
  avgHue: number
  avgSaturation: number
  avgLightness: number
  contrast: number
  isWarm: boolean
  isHighContrast: boolean
  isVibrant: boolean
  isPastel: boolean
  isMono: boolean
  dominantHues: number[]
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h * 360, s * 100, l * 100]
}

export function extractThemeFeatures(theme: ColorTheme): ThemeFeatures {
  const hsls = theme.colors.map(hexToHsl)
  const hues = hsls.map(h => h[0])
  const saturations = hsls.map(h => h[1])
  const lightnesses = hsls.map(h => h[2])

  const avgHue = hues.reduce((a, b) => a + b, 0) / hues.length
  const avgSaturation = saturations.reduce((a, b) => a + b, 0) / saturations.length
  const avgLightness = lightnesses.reduce((a, b) => a + b, 0) / lightnesses.length

  const maxL = Math.max(...lightnesses)
  const minL = Math.min(...lightnesses)
  const contrast = maxL - minL

  const warmHues = hues.filter(h => (h >= 0 && h <= 60) || (h >= 300 && h <= 360))
  const isWarm = warmHues.length >= hues.length / 2

  const hueRange = Math.max(...hues) - Math.min(...hues.filter(h => h > 0))
  const isMono = saturations.every(s => s < 15) || (hueRange < 30 && saturations.every(s => s < 25))

  return {
    avgHue,
    avgSaturation,
    avgLightness,
    contrast,
    isWarm,
    isHighContrast: contrast >= 40,
    isVibrant: avgSaturation >= 60,
    isPastel: avgSaturation < 50 && avgLightness >= 70,
    isMono,
    dominantHues: hues,
  }
}

const PATTERN_PREFERENCES: Record<PatternType, Partial<Record<keyof ThemeFeatures, number>>> = {
  spiral: {
    isHighContrast: 1.3,
    isVibrant: 1.2,
    avgSaturation: 1.15,
  },
  fractal: {
    isWarm: 0.9,
    avgLightness: 0.85,
    contrast: 1.25,
  },
  wave: {
    isWarm: 0.7,
    avgSaturation: 1.1,
    avgLightness: 1.15,
    contrast: 0.9,
  },
  circles: {
    isHighContrast: 1.35,
    isVibrant: 1.2,
    isMono: 1.1,
  },
  voronoi: {
    isHighContrast: 1.2,
    avgSaturation: 1.15,
  },
  noise: {
    isVibrant: 1.4,
    isHighContrast: 1.3,
    isMono: 0.7,
  },
}

function hueDistance(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2)
  return Math.min(diff, 360 - diff)
}

export function scoreTheme(
  theme: ColorTheme,
  params: Pick<DesignParams, 'pattern' | 'iterations' | 'scale' | 'rotation' | 'strokeWidth' | 'opacity'>
): number {
  const features = extractThemeFeatures(theme)
  const prefs = PATTERN_PREFERENCES[params.pattern]
  let score = 1.0

  for (const [key, weight] of Object.entries(prefs || {})) {
    const w = weight as number
    const k = key as keyof ThemeFeatures
    const v = features[k]
    if (typeof v === 'boolean') {
      score *= v ? Math.max(w, 1 / w) : Math.min(w, 1 / w)
    } else if (typeof v === 'number') {
      if (k === 'avgSaturation') {
        const norm = v / 100
        score *= 1 + (norm - 0.5) * (w - 1) * 2
      } else if (k === 'avgLightness') {
        const norm = v / 100
        score *= 1 + (norm - 0.5) * (w - 1) * 2
      } else if (k === 'contrast') {
        const norm = Math.min(v / 60, 1)
        score *= 1 + (norm - 0.5) * (w - 1) * 2
      } else if (k === 'avgHue') {
        score *= w
      }
    }
  }

  const iterationFactor = params.iterations / 200
  if (iterationFactor > 1.5) {
    score *= features.isHighContrast ? 1.25 : 0.85
    score *= features.contrast >= 30 ? 1.1 : 0.9
  } else if (iterationFactor < 0.5) {
    score *= features.isPastel ? 1.1 : 1.0
  }

  if (params.strokeWidth >= 3) {
    score *= features.isVibrant ? 1.2 : 0.9
  } else if (params.strokeWidth <= 1) {
    score *= features.isHighContrast ? 1.15 : 0.95
  }

  if (params.opacity <= 0.4) {
    score *= features.isHighContrast ? 1.2 : 0.85
    score *= features.avgSaturation >= 50 ? 1.1 : 0.9
  }

  if (params.rotation >= 90 || params.rotation <= -90) {
    score *= features.isVibrant ? 1.15 : 0.95
  }

  if (params.scale >= 2) {
    score *= features.isPastel ? 1.05 : 1.0
  } else if (params.scale <= 0.5) {
    score *= features.isHighContrast ? 1.15 : 0.9
  }

  return score
}

export function sortThemesByMatch(
  themes: ColorTheme[],
  params: Pick<DesignParams, 'pattern' | 'iterations' | 'scale' | 'rotation' | 'strokeWidth' | 'opacity'>
): ColorTheme[] {
  const scored = themes.map(t => ({ theme: t, score: scoreTheme(t, params) }))
  scored.sort((a, b) => b.score - a.score)
  return scored.map(s => s.theme)
}
