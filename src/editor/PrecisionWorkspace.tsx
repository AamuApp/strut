// The primary deck editor: a resident slide well, focused canvas, and selection inspector. Slide
// location stays in the route's `?slide=` state while object selection remains ephemeral.

import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useEditor } from './EditorState'
import { PrecisionSlidePanel } from './PrecisionSlidePanel'
import { SlideWell } from './SlideWell'
import { Stage } from './Stage'
import { useAddSlide } from './useAddSlide'
import type { DeckRoot, SlideDetail } from './deckDetail'

export interface PrecisionWorkspaceProps {
  slides: SlideDetail[]
  activeSlide: SlideDetail | null
  deck: DeckRoot | null
  loading?: boolean
}

export function PrecisionWorkspace({
  slides,
  activeSlide,
  deck,
  loading = false,
}: PrecisionWorkspaceProps) {
  const editor = useEditor()
  const addSlideAt = useAddSlide(slides)
  const [inspectorHost, setInspectorHost] = useState<HTMLElement | null>(null)
  const inspectorHostRef = useCallback(
    (node: HTMLElement | null) => setInspectorHost(node),
    [],
  )

  // Ctrl + arrow keys move the precision editor's viewport between slides. Capture the event before
  // Stage's arrow-key handler so Ctrl + arrow never nudges a selected component.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey) return
      if (
        event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight' &&
        event.key !== 'ArrowUp' &&
        event.key !== 'ArrowDown'
      )
        return

      const target = event.target as HTMLElement | null
      if (
        target?.isContentEditable ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT'
      )
        return

      const currentIndex = slides.findIndex(
        (slide) => slide.id === (editor.activeSlideId ?? activeSlide?.id),
      )
      if (currentIndex < 0) return

      const direction =
        event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
      const nextIndex = currentIndex + direction
      if (nextIndex < 0 || nextIndex >= slides.length) return
      const nextSlide = slides[nextIndex]

      event.preventDefault()
      editor.setActiveSlide(nextSlide.id)
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [activeSlide?.id, editor.activeSlideId, editor.setActiveSlide, slides])

  return (
    <div className="precision-workspace">
      <aside className="precision-workspace__well" aria-label="Slides">
        <SlideWell slides={slides} deck={deck} />
      </aside>

      <div className="precision-workspace__stage">
        {activeSlide ? (
          <Stage
            slide={activeSlide}
            deck={deck}
            inspectorHost={inspectorHost}
          />
        ) : (
          <div className="stage">
            <div className="precision-workspace__empty">
              {loading ? (
                'Loading deck…'
              ) : editor.canEdit ? (
                <button className="btn" onClick={() => addSlideAt(0)}>
                  <Plus size={15} /> Add the first slide
                </button>
              ) : (
                'No slides yet.'
              )}
            </div>
          </div>
        )}
      </div>

      <aside
        ref={inspectorHostRef}
        className="precision-workspace__inspector"
        aria-label="Properties"
      >
        {activeSlide && <PrecisionSlidePanel slide={activeSlide} deck={deck} />}
      </aside>

      {activeSlide && editor.selected.size === 0 && (
        <p className="precision-workspace__hint">
          Select an object to refine it · drag to move · Shift locks axis
        </p>
      )}
    </div>
  )
}
