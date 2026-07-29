// The primary deck editor: a resident slide well, focused canvas, and selection inspector. Slide
// location stays in the route's `?slide=` state while object selection remains ephemeral.

import { useCallback, useState } from 'react'
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
}

export function PrecisionWorkspace({
  slides,
  activeSlide,
  deck,
}: PrecisionWorkspaceProps) {
  const editor = useEditor()
  const addSlideAt = useAddSlide(slides)
  const [inspectorHost, setInspectorHost] = useState<HTMLElement | null>(null)
  const inspectorHostRef = useCallback(
    (node: HTMLElement | null) => setInspectorHost(node),
    [],
  )

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
              {editor.canEdit ? (
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
