import { describe, expect, it } from 'vitest'
import type { ChatActRequest } from '../../shared/chatAction.ts'
import {
  hasExplicitDeckBuildIntent,
  normalizeChatActResult,
} from '../../server/chatAct.ts'

function request(content: string): ChatActRequest {
  return {
    deckId: 'deck-1',
    messages: [{ role: 'user', content }],
    deckContext: '',
    slideIds: [],
  }
}

describe('Slides chat image intent', () => {
  it('recognizes an explicit Finnish deck creation request', () => {
    expect(
      hasExplicitDeckBuildIntent(
        request('Teetkö liitetystä tekstistä deckin? Myös kuvaa voi käyttää.'),
      ),
    ).toBe(true)
  })

  it('keeps a visual-reference-only request style-only', () => {
    expect(hasExplicitDeckBuildIntent(request('Tee tästä kuvasta vaalea ja selkeä tyyli.'))).toBe(false)
  })

  it('does not discard deck actions from a mixed text-and-image request', () => {
    const raw = {
      say: 'I created the deck.',
      actions: [
        { kind: 'generate', description: 'Aamu.app overview', count: 4 },
        { kind: 'set_theme', background: '#ffffff' },
      ],
    }
    const result = normalizeChatActResult(raw, {
      slideIds: [],
      fonts: [],
      styleOnly: false,
    })
    expect(result.actions.map((action) => action.kind)).toEqual([
      'generate',
      'set_theme',
    ])
  })
})
