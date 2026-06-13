import type { ColorTheme, PatternType, DesignParams } from '../types'

interface ThemeFeatures {
  avgHue: number
  avgSaturation: number
  avgLightness: number
  contrast: number
  isWarm: boolean
  isCool: boolean
  isHighContrast: boolean
  isMediumContrast: boolean
  isLowContrast: boolean
  isVibrant: boolean
  isMuted: boolean
  isPastel: boolean
  isDeep: boolean
  isMono: boolean
  isNeon: boolean
  isFire: boolean
  isOcean: boolean
  isForest: boolean
  isSunset: boolean
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

function hasColorInRange(colors: string[], hueStart: number, hueEnd: number, minSat = 40): boolean {
  return colors.some(hex => {
    const [h, s] = hexToHsl(hex)
    if (s < minSat) return false
    if (hueStart < hueEnd) return h >= hueStart && h <= hueEnd
    return h >= hueStart || h <= hueEnd
  })
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
  const coolHues = hues.filter(h => h >= 90 && h <= 270)
  const isWarm = warmHues.length > coolHues.length
  const isCool = coolHues.length > warmHues.length

  const hueRange = Math.max(...hues) - Math.min(...hues.filter(h => h > 0))
  const isMono = saturations.every(s => s < 15) || (hueRange < 30 && saturations.every(s => s < 25))

  return {
    avgHue,
    avgSaturation,
    avgLightness,
    contrast,
    isWarm,
    isCool,
    isHighContrast: contrast >= 50,
    isMediumContrast: contrast >= 30 && contrast < 50,
    isLowContrast: contrast < 30,
    isVibrant: avgSaturation >= 70,
    isMuted: avgSaturation >= 30 && avgSaturation < 70,
    isPastel: avgSaturation < 50 && avgLightness >= 70,
    isDeep: avgLightness < 50 && avgSaturation >= 50,
    isMono,
    isNeon: saturations.some(s => s >= 90) && avgSaturation >= 75,
    isFire: hasColorInRange(theme.colors, 0, 50),
    isOcean: hasColorInRange(theme.colors, 170, 220),
    isForest: hasColorInRange(theme.colors, 80, 150),
    isSunset: hasColorInRange(theme.colors, 15, 50) && hasColorInRange(theme.colors, 280, 330),
  }
}

const PATTERN_PREFERENCES: Record<PatternType, Partial<Record<keyof ThemeFeatures, number>>> = {
  spiral: {
    isHighContrast: 2.0,
    isVibrant: 1.8,
    isSunset: 1.5,
    isNeon: 1.4,
    isLowContrast: 0.4,
    isMuted: 0.6,
  },
  fractal: {
    isForest: 2.0,
    isHighContrast: 1.7,
    isDeep: 1.5,
    isWarm: 0.7,
    isPastel: 0.8,
  },
  wave: {
    isOcean: 2.2,
    isCool: 1.8,
    isPastel: 1.5,
    isMuted: 1.3,
    isWarm: 0.5,
    isFire: 0.6,
  },
  circles: {
    isHighContrast: 2.0,
    isNeon: 1.8,
    isVibrant: 1.6,
    isMono: 1.5,
    isLowContrast: 0.5,
  },
  voronoi: {
    isHighContrast: 1.8,
    isVibrant: 1.6,
    isNeon: 1.4,
    isPastel: 0.7,
  },
  noise: {
    isNeon: 2.5,
    isVibrant: 2.2,
    isHighContrast: 2.0,
    isSunset: 1.5,
    isMono: 0.4,
    isPastel: 0.5,
    isLowContrast: 0.4,
  },
}

function scoreByPattern(
  features: ThemeFeatures,
  pattern: PatternType
): number {
  let score = 1.0
  const prefs = PATTERN_PREFERENCES[pattern]

  for (const [key, weight] of Object.entries(prefs || {})) {
    const w = weight as number
    const k = key as keyof ThemeFeatures
    const v = features[k]
    if (typeof v === 'boolean') {
      if (v) {
        score *= Math.max(w, 1)
      } else {
        if (w < 1) score *= w
      }
    }
  }

  return score
}

function scoreByIterations(
  features: ThemeFeatures,
  iterations: number
): number {
  let score = 1.0
  const iterNorm = (iterations - 10) / (500 - 10)

  if (iterations >= 400) {
    score *= features.isHighContrast ? 3.0 : 0.3
    score *= features.isVibrant ? 2.5 : 0.5
    score *= features.isNeon ? 2.0 : 0.6
    score *= features.avgSaturation >= 60 ? 1.8 : 0.7
    score *= features.contrast >= 40 ? 2.0 : 0.5
  } else if (iterations >= 300) {
    score *= features.isHighContrast ? 2.5 : 0.4
    score *= features.isVibrant ? 2.0 : 0.6
    score *= features.contrast >= 35 ? 1.8 : 0.6
  } else if (iterations >= 200) {
    score *= features.isHighContrast ? 1.8 : 0.7
    score *= features.isVibrant ? 1.5 : 0.8
  } else if (iterations >= 100) {
    score *= features.isMediumContrast ? 1.6 : 0.8
    score *= features.isPastel ? 1.3 : 1.0
    score *= features.isHighContrast ? 0.8 : 1.0
  } else if (iterations >= 50) {
    score *= features.isPastel ? 2.0 : 0.9
    score *= features.isMuted ? 1.8 : 0.8
    score *= features.isLowContrast ? 1.5 : 0.7
    score *= features.isHighContrast ? 0.6 : 1.0
    score *= features.isVibrant ? 0.7 : 1.0
  } else {
    score *= features.isPastel ? 2.5 : 0.8
    score *= features.isLowContrast ? 2.0 : 0.6
    score *= features.isMuted ? 1.8 : 0.7
    score *= features.isHighContrast ? 0.4 : 1.0
    score *= features.isVibrant ? 0.5 : 1.0
    score *= features.isNeon ? 0.3 : 1.0
  }

  return score
}

function scoreByStrokeWidth(
  features: ThemeFeatures,
  strokeWidth: number
): number {
  let score = 1.0

  if (strokeWidth >= 4) {
    score *= features.isVibrant ? 2.8 : 0.4
    score *= features.isNeon ? 2.5 : 0.5
    score *= features.isFire ? 2.0 : 0.7
    score *= features.isSunset ? 1.8 : 0.8
    score *= features.avgSaturation >= 70 ? 2.0 : 0.6
    score *= features.isMono ? 0.7 : 1.0
  } else if (strokeWidth >= 3) {
    score *= features.isVibrant ? 2.2 : 0.6
    score *= features.isNeon ? 2.0 : 0.7
    score *= features.isFire ? 1.7 : 0.8
  } else if (strokeWidth >= 2) {
    score *= features.isHighContrast ? 1.5 : 0.9
    score *= features.isVibrant ? 1.3 : 0.95
  } else if (strokeWidth >= 1.5) {
    score *= features.isMediumContrast ? 1.4 : 0.9
    score *= features.isMuted ? 1.2 : 0.95
  } else if (strokeWidth >= 1) {
    score *= features.isHighContrast ? 2.0 : 0.6
    score *= features.contrast >= 45 ? 1.8 : 0.7
    score *= features.isMono ? 1.5 : 0.9
    score *= features.isLowContrast ? 0.5 : 1.0
  } else {
    score *= features.isHighContrast ? 3.0 : 0.3
    score *= features.contrast >= 50 ? 2.5 : 0.4
    score *= features.isNeon ? 2.0 : 0.6
    score *= features.isMono ? 2.0 : 0.7
    score *= features.isPastel ? 0.5 : 1.0
    score *= features.isLowContrast ? 0.3 : 1.0
  }

  return score
}

function scoreByOpacity(
  features: ThemeFeatures,
  opacity: number
): number {
  let score = 1.0

  if (opacity >= 0.9) {
    score *= features.isMediumContrast ? 1.5 : 0.9
    score *= features.isPastel ? 1.4 : 0.9
    score *= features.isHighContrast ? 0.8 : 1.0
  } else if (opacity >= 0.7) {
    score *= features.isMuted ? 1.3 : 0.95
    score *= features.isMediumContrast ? 1.2 : 0.95
  } else if (opacity >= 0.5) {
    score *= features.isHighContrast ? 1.5 : 0.8
    score *= features.isVibrant ? 1.3 : 0.9
  } else if (opacity >= 0.3) {
    score *= features.isHighContrast ? 2.5 : 0.4
    score *= features.isVibrant ? 2.0 : 0.5
    score *= features.avgSaturation >= 60 ? 1.8 : 0.6
    score *= features.contrast >= 40 ? 2.0 : 0.5
    score *= features.isNeon ? 1.8 : 0.7
    score *= features.isPastel ? 0.6 : 1.0
    score *= features.isLowContrast ? 0.4 : 1.0
  } else {
    score *= features.isHighContrast ? 3.5 : 0.2
    score *= features.isVibrant ? 3.0 : 0.3
    score *= features.isNeon ? 2.5 : 0.4
    score *= features.avgSaturation >= 70 ? 2.2 : 0.5
    score *= features.contrast >= 50 ? 2.8 : 0.3
    score *= features.isPastel ? 0.4 : 1.0
    score *= features.isLowContrast ? 0.2 : 1.0
    score *= features.isMuted ? 0.5 : 1.0
  }

  return score
}

function scoreByRotation(
  features: ThemeFeatures,
  rotation: number
): number {
  let score = 1.0
  const absRot = Math.abs(((rotation % 360) + 360) % 360)

  if (absRot >= 270) {
    score *= features.isNeon ? 3.0 : 0.4
    score *= features.isVibrant ? 2.5 : 0.5
    score *= features.isFire ? 2.0 : 0.7
    score *= features.isSunset ? 1.8 : 0.8
    score *= features.avgSaturation >= 75 ? 2.0 : 0.6
    score *= features.isMono ? 0.5 : 1.0
    score *= features.isPastel ? 0.6 : 1.0
  } else if (absRot >= 180) {
    score *= features.isNeon ? 2.5 : 0.5
    score *= features.isVibrant ? 2.0 : 0.6
    score *= features.isFire ? 1.7 : 0.8
  } else if (absRot >= 90) {
    score *= features.isVibrant ? 1.8 : 0.7
    score *= features.isNeon ? 1.6 : 0.8
    score *= features.isSunset ? 1.4 : 0.9
  } else if (absRot >= 45) {
    score *= features.isHighContrast ? 1.3 : 0.9
    score *= features.isVibrant ? 1.2 : 0.95
  } else {
    score *= features.isCool ? 1.3 : 0.95
    score *= features.isMuted ? 1.2 : 0.95
    score *= features.isNeon ? 0.9 : 1.0
  }

  return score
}

function scoreByScale(
  features: ThemeFeatures,
  scale: number
): number {
  let score = 1.0

  if (scale >= 2.5) {
    score *= features.isPastel ? 2.5 : 0.6
    score *= features.isLowContrast ? 2.0 : 0.5
    score *= features.isMuted ? 1.8 : 0.7
    score *= features.isVibrant ? 0.6 : 1.0
    score *= features.isHighContrast ? 0.5 : 1.0
    score *= features.isNeon ? 0.4 : 1.0
  } else if (scale >= 2) {
    score *= features.isPastel ? 2.0 : 0.7
    score *= features.isMuted ? 1.6 : 0.8
    score *= features.isLowContrast ? 1.5 : 0.7
  } else if (scale >= 1.5) {
    score *= features.isMuted ? 1.3 : 0.9
    score *= features.isMediumContrast ? 1.2 : 0.95
  } else if (scale >= 1) {
    score *= 1.0
  } else if (scale >= 0.7) {
    score *= features.isHighContrast ? 1.5 : 0.8
    score *= features.isVibrant ? 1.3 : 0.9
  } else if (scale >= 0.4) {
    score *= features.isHighContrast ? 2.5 : 0.4
    score *= features.contrast >= 45 ? 2.0 : 0.5
    score *= features.isVibrant ? 1.8 : 0.6
    score *= features.isNeon ? 1.6 : 0.7
    score *= features.isPastel ? 0.6 : 1.0
    score *= features.isLowContrast ? 0.5 : 1.0
  } else {
    score *= features.isHighContrast ? 3.5 : 0.3
    score *= features.contrast >= 55 ? 3.0 : 0.4
    score *= features.isVibrant ? 2.5 : 0.5
    score *= features.isNeon ? 2.2 : 0.5
    score *= features.isMono ? 1.8 : 0.7
    score *= features.isPastel ? 0.4 : 1.0
    score *= features.isLowContrast ? 0.3 : 1.0
  }

  return score
}

export function scoreTheme(
  theme: ColorTheme,
  params: Pick<DesignParams, 'pattern' | 'iterations' | 'scale' | 'rotation' | 'strokeWidth' | 'opacity'>
): number {
  const features = extractThemeFeatures(theme)

  const patternScore = scoreByPattern(features, params.pattern)
  const iterationsScore = scoreByIterations(features, params.iterations)
  const strokeScore = scoreByStrokeWidth(features, params.strokeWidth)
  const opacityScore = scoreByOpacity(features, params.opacity)
  const rotationScore = scoreByRotation(features, params.rotation)
  const scaleScore = scoreByScale(features, params.scale)

  let score = patternScore
  score *= Math.pow(iterationsScore, 1.5)
  score *= Math.pow(strokeScore, 1.3)
  score *= Math.pow(opacityScore, 1.4)
  score *= Math.pow(rotationScore, 1.2)
  score *= Math.pow(scaleScore, 1.3)

  return score
}

export function sortThemesByMatch(
  themes: ColorTheme[],
  params: Pick<DesignParams, 'pattern' | 'iterations' | 'scale' | 'rotation' | 'strokeWidth' | 'opacity'>
): ColorTheme[] {
  const scored = themes.map(t => ({
    theme: t,
    score: scoreTheme(t, params)
  }))

  const maxScore = Math.max(...scored.map(s => s.score))
  const normalized = scored.map(s => ({
    ...s,
    finalScore: Math.pow(s.score / maxScore, 0.5)
  }))

  normalized.sort((a, b) => b.finalScore - a.finalScore)
  return normalized.map(s => s.theme)
}
