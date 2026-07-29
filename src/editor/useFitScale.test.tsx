// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { useFitScale } from './useFitScale'

describe('useFitScale', () => {
  it('does not expose a placeholder scale before a viewport can be measured', () => {
    const ref = createRef<HTMLElement>()
    const { result } = renderHook(() => useFitScale(ref, 1280, 720, 112))
    expect(result.current).toBe(0)
  })
})
