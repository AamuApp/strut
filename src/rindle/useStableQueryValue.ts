// Keep an SSR/preloaded query result visible while Rindle swaps from its seed store to the live store.
// The live view is briefly `unknown` during that handoff; rendering its empty placeholder would flash
// real content away even though no authoritative empty result has arrived.

import { useRef } from 'react'
import type { ResultType } from '@rindle/client'

export function useStableQueryValue<T>(value: T, status: ResultType): T {
  const stable = useRef(value)
  if (status === 'complete') stable.current = value
  return status === 'complete' ? value : stable.current
}
