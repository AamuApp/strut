// Fit-to-container scale: observe a container and return the largest scale (capped at 0.1 min) that
// fits a `w`×`h` slide inside it, minus `pad`. Zero means "not measured yet", keeping SSR from painting
// a misleading placeholder-sized slide before hydration can read the viewport.

import { useLayoutEffect, useState } from 'react'

export function useFitScale(
  ref: React.RefObject<HTMLElement | null>,
  w: number,
  h: number,
  pad = 56,
): number {
  const [scale, setScale] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (r.width <= pad || r.height <= pad) {
        setScale(0)
        return
      }
      setScale(
        Math.max(0.1, Math.min((r.width - pad) / w, (r.height - pad) / h)),
      )
    }
    // Measure synchronously during hydration before React's first client paint. The server markup uses
    // scale 0 because there is no viewport to measure; the observer handles later container resizes.
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, w, h, pad])
  return scale
}
