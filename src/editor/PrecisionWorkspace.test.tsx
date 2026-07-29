// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PrecisionWorkspace } from './PrecisionWorkspace'
import type { SlideDetail } from './deckDetail'

const mocks = vi.hoisted(() => ({
  editor: {
    canEdit: true,
    selected: new Set<string>(),
  },
  addSlideAt: vi.fn(() => 'new-slide'),
}))

vi.mock('./EditorState', () => ({
  useEditor: () => mocks.editor,
}))

vi.mock('./useAddSlide', () => ({
  useAddSlide: () => mocks.addSlideAt,
}))

vi.mock('./SlideWell', () => ({
  SlideWell: () => <div data-testid="slide-well" />,
}))

vi.mock('./Stage', () => ({
  Stage: ({ slide }: { slide: SlideDetail }) => (
    <div data-testid="stage">{slide.id}</div>
  ),
}))

vi.mock('./PrecisionSlidePanel', () => ({
  PrecisionSlidePanel: ({ slide }: { slide: SlideDetail }) => (
    <div data-testid="slide-panel">{slide.id}</div>
  ),
}))

const slide = { id: 'slide-1' } as SlideDetail

describe('PrecisionWorkspace', () => {
  afterEach(cleanup)

  beforeEach(() => {
    mocks.editor.canEdit = true
    mocks.editor.selected = new Set()
    mocks.addSlideAt.mockClear()
  })

  it('offers to create the first slide when the deck is empty', () => {
    render(<PrecisionWorkspace slides={[]} activeSlide={null} deck={null} />)

    expect(screen.getByTestId('slide-well')).toBeTruthy()
    expect(screen.queryByTestId('stage')).toBeNull()
    expect(screen.queryByTestId('slide-panel')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Add the first slide' }))
    expect(mocks.addSlideAt).toHaveBeenCalledWith(0)
  })

  it('shows a loading state instead of claiming a still-hydrating deck is empty', () => {
    render(
      <PrecisionWorkspace slides={[]} activeSlide={null} deck={null} loading />,
    )

    expect(screen.getByText('Loading deck…')).toBeTruthy()
    expect(screen.queryByText('No slides yet.')).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Add the first slide' }),
    ).toBeNull()
  })

  it('renders the active slide directly in the precision stage and panel', () => {
    render(
      <PrecisionWorkspace slides={[slide]} activeSlide={slide} deck={null} />,
    )

    expect(screen.getByTestId('stage').textContent).toBe('slide-1')
    expect(screen.getByTestId('slide-panel').textContent).toBe('slide-1')
  })
})
