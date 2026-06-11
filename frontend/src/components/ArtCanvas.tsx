import { useEffect, useRef } from 'react'
import { useDesignStore } from '../store/design'
import { createRng, generateSpiral, generateFractal, generateWave, generateCircles, generateNoise } from '../generators/patterns'

export default function ArtCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const store = useDesignStore()

  useEffect(() => {
    const rng = createRng(store.seed)
    const { width, height, pattern, iterations, scale, palette, strokeWidth, opacity, bgColor, rotation } = store
    let content = ''
    switch (pattern) {
      case 'spiral':  content = generateSpiral(width, height, iterations, scale, palette, rng, strokeWidth, opacity); break
      case 'fractal': content = generateFractal(width, height, iterations, scale, palette, rng, strokeWidth, opacity); break
      case 'wave':    content = generateWave(width, height, iterations, scale, palette, rng, strokeWidth, opacity); break
      case 'circles': content = generateCircles(width, height, iterations, scale, palette, rng, strokeWidth, opacity); break
      case 'noise':   content = generateNoise(width, height, iterations, scale, palette, rng, strokeWidth, opacity); break
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${bgColor}"/>
  <g transform="rotate(${rotation},${width/2},${height/2})">${content}</g>
</svg>`
    store.setSvgContent(svg)
    if (containerRef.current) {
      containerRef.current.innerHTML = svg
    }
  }, [store.pattern, store.seed, store.iterations, store.scale, store.rotation,
      store.strokeWidth, store.opacity, store.bgColor, store.palette, store.width, store.height])

  return (
    <div
      ref={containerRef}
      className="shadow-2xl rounded border border-gray-700"
      style={{ maxWidth: '100%', maxHeight: '100%', overflow: 'hidden' }}
    />
  )
}
