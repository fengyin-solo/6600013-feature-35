import { useMemo } from 'react'
import { shallow } from 'zustand/shallow'
import { useDesignStore } from '../store/design'
import { THEMES } from '../themes/palettes'
import { sortThemesByMatch } from '../themes/themeMatcher'
import type { PatternType } from '../types'

const PATTERNS: { value: PatternType; label: string }[] = [
  { value: 'spiral',  label: '🌀 螺旋' },
  { value: 'fractal', label: '🌳 分形树' },
  { value: 'wave',    label: '🌊 波浪' },
  { value: 'circles', label: '⭕ 圆环' },
  { value: 'noise',   label: '🎲 噪声场' },
]

export default function Sidebar() {
  const {
    pattern, iterations, scale, rotation, strokeWidth, opacity,
    seed, bgColor, setParam, setPattern, setTheme, randomSeed,
    exportSvg, exportPng,
  } = useDesignStore(state => ({
    pattern: state.pattern,
    iterations: state.iterations,
    scale: state.scale,
    rotation: state.rotation,
    strokeWidth: state.strokeWidth,
    opacity: state.opacity,
    seed: state.seed,
    bgColor: state.bgColor,
    setParam: state.setParam,
    setPattern: state.setPattern,
    setTheme: state.setTheme,
    randomSeed: state.randomSeed,
    exportSvg: state.exportSvg,
    exportPng: state.exportPng,
  }), shallow)

  const sortedThemes = useMemo(() => {
    return sortThemesByMatch(THEMES, {
      pattern,
      iterations,
      scale,
      rotation,
      strokeWidth,
      opacity,
    })
  }, [pattern, iterations, scale, rotation, strokeWidth, opacity])

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-700 p-4 overflow-y-auto flex flex-col gap-4">
      <h2 className="text-lg font-bold">🎨 SVG 海报设计器</h2>

      {/* Pattern */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">图案类型</label>
        <div className="grid grid-cols-2 gap-2">
          {PATTERNS.map(p => (
            <button key={p.value} onClick={() => setPattern(p.value)}
              className={`px-2 py-1.5 rounded text-xs font-medium ${pattern===p.value?'bg-indigo-600':'bg-gray-700 hover:bg-gray-600'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">颜色主题 <span className="text-gray-500">(智能排序)</span></label>
        <div className="grid grid-cols-2 gap-2">
          {sortedThemes.map((t, idx) => (
            <button key={t.id} onClick={() => setTheme(t.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600 ${idx < 2 ? 'ring-1 ring-indigo-500/50' : ''}`}>
              <div className="flex">{t.colors.map((c,i) => (
                <div key={i} style={{background:c}} className="w-3 h-3 rounded-full" />
              ))}</div>
              <span>{t.name}</span>
              {idx < 2 && <span className="text-[10px] text-indigo-400 ml-auto">★</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Seed */}
      <div>
        <label className="text-xs text-gray-400">种子: {seed}</label>
        <div className="flex gap-2 mt-1">
          <input type="range" min={0} max={99999} value={seed}
            onChange={e => setParam('seed', Number(e.target.value))} className="flex-1 accent-indigo-500" />
          <button onClick={() => randomSeed()} className="px-2 bg-indigo-600 rounded text-xs">🎲</button>
        </div>
      </div>

      {/* Iterations */}
      <div>
        <label className="text-xs text-gray-400">迭代数: {iterations}</label>
        <input type="range" min={10} max={500} step={10} value={iterations}
          onChange={e => setParam('iterations', Number(e.target.value))} className="w-full accent-purple-500" />
      </div>

      {/* Scale */}
      <div>
        <label className="text-xs text-gray-400">缩放: {scale.toFixed(2)}</label>
        <input type="range" min={0.1} max={3} step={0.1} value={scale}
          onChange={e => setParam('scale', Number(e.target.value))} className="w-full accent-green-500" />
      </div>

      {/* Rotation */}
      <div>
        <label className="text-xs text-gray-400">旋转: {rotation}°</label>
        <input type="range" min={0} max={360} step={5} value={rotation}
          onChange={e => setParam('rotation', Number(e.target.value))} className="w-full accent-yellow-500" />
      </div>

      {/* Stroke */}
      <div>
        <label className="text-xs text-gray-400">描边: {strokeWidth.toFixed(1)}</label>
        <input type="range" min={0.5} max={5} step={0.5} value={strokeWidth}
          onChange={e => setParam('strokeWidth', Number(e.target.value))} className="w-full accent-orange-500" />
      </div>

      {/* Opacity */}
      <div>
        <label className="text-xs text-gray-400">透明度: {opacity.toFixed(2)}</label>
        <input type="range" min={0.1} max={1} step={0.05} value={opacity}
          onChange={e => setParam('opacity', Number(e.target.value))} className="w-full accent-pink-500" />
      </div>

      {/* Export */}
      <div className="flex gap-2 mt-2">
        <button onClick={() => exportSvg()} className="flex-1 py-2 bg-teal-600 rounded text-sm font-medium">⬇ SVG</button>
        <button onClick={() => exportPng()} className="flex-1 py-2 bg-rose-600 rounded text-sm font-medium">⬇ PNG</button>
      </div>
    </div>
  )
}
