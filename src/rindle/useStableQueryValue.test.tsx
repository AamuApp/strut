// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useStableQueryValue } from './useStableQueryValue'
import type { ResultType } from '@rindle/client'

describe('useStableQueryValue', () => {
  it('keeps the SSR value across an unknown live-store handoff', () => {
    const { result, rerender } = renderHook(
      ({ value, status }: { value: string | null; status: ResultType }) =>
        useStableQueryValue(value, status),
      { initialProps: { value: 'seeded deck', status: 'complete' } },
    )

    rerender({ value: null, status: 'unknown' })
    expect(result.current).toBe('seeded deck')

    rerender({ value: 'live deck', status: 'complete' })
    expect(result.current).toBe('live deck')
  })

  it('does not invent a value when the first query is still unknown', () => {
    const { result } = renderHook(
      () => useStableQueryValue(null, 'unknown'),
      {},
    )
    expect(result.current).toBeNull()
  })
})
