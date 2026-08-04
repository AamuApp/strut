// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ComponentDataReader } from './componentFragments'
import type { ComponentRef } from './componentFragments'
import type { ComponentRow } from './types'
import type { ResultType } from '@rindle/client'

const mocks = vi.hoisted(
  (): { data: ComponentRow | null; status: ResultType } => ({
    data: null,
    status: 'unknown',
  }),
)

vi.mock('@rindle/react', () => ({
  fragmentKey: vi.fn(() => 'component-1'),
  useFragment: () => mocks.data,
  useQueryStatus: () => mocks.status,
}))

const row: ComponentRow = {
  id: 'component-1',
  slide_id: 'slide-1',
  type: 'text',
  z_order: 1,
  x: 10,
  y: 20,
  scale_x: 1,
  scale_y: 1,
  scale_w: 400,
  scale_h: 200,
  rotate: 0,
  skew_x: 0,
  skew_y: 0,
  custom_classes: '',
  fill: '',
  content: 'seeded text',
  props: {},
}

const component = {
  ref: {
    coverage: { query: {} },
  },
} as unknown as ComponentRef

describe('ComponentDataReader', () => {
  afterEach(cleanup)

  beforeEach(() => {
    mocks.data = row
    mocks.status = 'complete'
  })

  it('keeps component content mounted across the live-store unknown handoff', () => {
    const onRemove = vi.fn()
    const view = () => (
      <ComponentDataReader component={component} onRemove={onRemove}>
        {(data) => <span>{data.doc}</span>}
      </ComponentDataReader>
    )
    const { rerender } = render(view())
    expect(screen.getByText('seeded text')).toBeTruthy()

    mocks.data = null
    mocks.status = 'unknown'
    rerender(view())

    expect(screen.getByText('seeded text')).toBeTruthy()
    expect(onRemove).not.toHaveBeenCalled()
  })

  it('removes cached content after an authoritative deletion', async () => {
    const onRemove = vi.fn()
    const view = () => (
      <ComponentDataReader component={component} onRemove={onRemove}>
        {(data) => <span>{data.doc}</span>}
      </ComponentDataReader>
    )
    const { rerender } = render(view())

    mocks.data = null
    mocks.status = 'complete'
    rerender(view())

    expect(screen.queryByText('seeded text')).toBeNull()
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith('component-1'))
  })
})
