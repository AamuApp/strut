// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ChatPanel,
  isPastedSourceAttachment,
  PASTE_ATTACHMENT_THRESHOLD,
} from './ChatPanel'
import type { DeckChatContext } from './chatNarration'

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  useChat: vi.fn(),
  useModelStatus: vi.fn(),
}))

vi.mock('./aiChat', () => ({
  useChat: mocks.useChat,
}))

// The panel's access signal is the viewer's connected model.
vi.mock('../rindle/modelClient', () => ({
  useModelStatus: mocks.useModelStatus,
  getModelStatus: vi.fn(),
  connectModel: vi.fn(),
  disconnectModel: vi.fn(),
}))

const deckContext: DeckChatContext = {
  take: () => '',
  clear: () => {},
}

beforeEach(() => {
  mocks.send.mockReset()
  mocks.useChat.mockReset()
  mocks.useModelStatus.mockReset().mockReturnValue({
    status: {
      connected: true,
      provider: 'openrouter',
      model: null,
    },
    loading: false,
    refresh: vi.fn(),
  })
  mocks.useChat.mockReturnValue({
    messages: [],
    send: mocks.send,
    busy: false,
    clear: vi.fn(),
    undoTip: null,
    undoLast: vi.fn(),
  })
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn((file: File) => `blob:${file.name}`),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  })
})

afterEach(cleanup)

describe('ChatPanel permissions', () => {
  it('treats short pasted text as an instruction', () => {
    expect(isPastedSourceAttachment('Make a four-slide overview deck.')).toBe(
      false,
    )
  })

  it('treats long pasted text as source material', () => {
    expect(isPastedSourceAttachment('x'.repeat(PASTE_ATTACHMENT_THRESHOLD + 1))).toBe(
      true,
    )
  })

  it('readably disables chat for a read-only viewer', () => {
    render(
      <ChatPanel
        deckId="d1"
        slides={[]}
        deck={null}
        activeSlide={null}
        deckContext={deckContext}
        canEdit={false}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('status').getAttribute('aria-disabled')).toBe(
      'true',
    )
    expect(screen.getByRole('status').textContent).toMatch(/read-only/i)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(mocks.useChat).toHaveBeenCalledWith(
      'd1',
      [],
      expect.objectContaining({ canEdit: false }),
    )
  })

  it('offers the connect flow instead of the composer when there is no model to run on', () => {
    mocks.useModelStatus.mockReturnValue({
      status: {
        connected: false,
        provider: null,
        model: null,
      },
      loading: false,
      refresh: vi.fn(),
    })

    render(
      <ChatPanel
        deckId="d1"
        slides={[]}
        deck={null}
        activeSlide={null}
        deckContext={deckContext}
        canEdit
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByRole('button', { name: 'Connect a model' })).toBeTruthy()
  })

  it('lets an editable member compose and send', () => {
    render(
      <ChatPanel
        deckId="d1"
        slides={[]}
        deck={null}
        activeSlide={null}
        deckContext={deckContext}
        canEdit
        onClose={vi.fn()}
      />,
    )

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Make it clearer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(mocks.send).toHaveBeenCalledWith('Make it clearer')
  })

  it('inserts a short paste into the chat input', () => {
    render(
      <ChatPanel
        deckId="d1"
        slides={[]}
        deck={null}
        activeSlide={null}
        deckContext={deckContext}
        canEdit
        onClose={vi.fn()}
      />,
    )

    const input = screen.getByRole('textbox')
    fireEvent.paste(input, {
      clipboardData: {
        getData: () => 'Make a four-slide overview deck.',
        files: [],
      },
    })

    expect((input as HTMLTextAreaElement).value).toBe(
      'Make a four-slide overview deck.',
    )
    expect(screen.queryByText(/Pasted source material/)).toBeNull()
  })

  it('shows a long paste as source material and sends it separately', () => {
    render(
      <ChatPanel
        deckId="d1"
        slides={[]}
        deck={null}
        activeSlide={null}
        deckContext={deckContext}
        canEdit
        onClose={vi.fn()}
      />,
    )

    const source = 'x'.repeat(PASTE_ATTACHMENT_THRESHOLD + 1)
    const input = screen.getByRole('textbox')
    fireEvent.paste(input, {
      clipboardData: {
        getData: () => source,
        files: [],
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(mocks.send).toHaveBeenCalledWith(
      'Use the pasted source material to create or improve this deck.',
      [],
      source,
    )
  })

  it('sends selected photos as ephemeral style references', () => {
    const { container } = render(
      <ChatPanel
        deckId="d1"
        slides={[]}
        deck={null}
        activeSlide={null}
        deckContext={deckContext}
        canEdit
        styleIntent={1}
        onClose={vi.fn()}
      />,
    )
    const file = new File(['look'], 'look.png', { type: 'image/png' })
    const picker = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    fireEvent.change(picker, { target: { files: [file] } })

    expect(screen.getByRole('img', { name: 'look.png' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(mocks.send).toHaveBeenCalledWith(
      'Use these images as visual references for this deck.',
      [file],
      '',
    )
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    expect(screen.getByRole('img', { name: 'look.png' })).toBeTruthy()
  })

  it('keeps style references available when the AI turn fails', () => {
    const props = {
      deckId: 'd1',
      slides: [],
      deck: null,
      activeSlide: null,
      deckContext,
      canEdit: true,
      styleIntent: 1,
      onClose: vi.fn(),
    }
    const { container, rerender } = render(<ChatPanel {...props} />)
    const file = new File(['look'], 'look.png', { type: 'image/png' })
    const picker = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    fireEvent.change(picker, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    mocks.useChat.mockReturnValue({
      messages: [
        {
          id: 'a1',
          role: 'assistant',
          content: '',
          status: 'streaming',
        },
      ],
      send: mocks.send,
      busy: true,
      clear: vi.fn(),
      undoTip: null,
      undoLast: vi.fn(),
    })
    rerender(<ChatPanel {...props} />)

    mocks.useChat.mockReturnValue({
      messages: [
        {
          id: 'a1',
          role: 'assistant',
          content: 'Could not match that look.',
          status: 'error',
        },
      ],
      send: mocks.send,
      busy: false,
      clear: vi.fn(),
      undoTip: null,
      undoLast: vi.fn(),
    })
    rerender(<ChatPanel {...props} />)

    expect(screen.getByRole('img', { name: 'look.png' })).toBeTruthy()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })

  it('clears style references after a successful AI turn', () => {
    const props = {
      deckId: 'd1',
      slides: [],
      deck: null,
      activeSlide: null,
      deckContext,
      canEdit: true,
      styleIntent: 1,
      onClose: vi.fn(),
    }
    const { container, rerender } = render(<ChatPanel {...props} />)
    const file = new File(['look'], 'look.png', { type: 'image/png' })
    const picker = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    fireEvent.change(picker, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    mocks.useChat.mockReturnValue({
      messages: [
        {
          id: 'a1',
          role: 'assistant',
          content: 'Matched the look.',
          status: 'done',
        },
      ],
      send: mocks.send,
      busy: false,
      clear: vi.fn(),
      undoTip: { label: 'AI theme' },
      undoLast: vi.fn(),
    })
    rerender(<ChatPanel {...props} />)

    expect(screen.queryByRole('img', { name: 'look.png' })).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:look.png')
  })

  it('rejects unsupported reference files before sending', () => {
    const { container } = render(
      <ChatPanel
        deckId="d1"
        slides={[]}
        deck={null}
        activeSlide={null}
        deckContext={deckContext}
        canEdit
        onClose={vi.fn()}
      />,
    )
    const picker = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    fireEvent.change(picker, {
      target: {
        files: [new File(['svg'], 'look.svg', { type: 'image/svg+xml' })],
      },
    })

    expect(screen.getByRole('alert').textContent).toMatch(/jpeg, png, or webp/i)
    expect(
      screen.getByRole('button', { name: 'Send' }).hasAttribute('disabled'),
    ).toBe(true)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('infers a missing browser MIME type from a familiar image extension', () => {
    const { container } = render(
      <ChatPanel
        deckId="d1"
        slides={[]}
        deck={null}
        activeSlide={null}
        deckContext={deckContext}
        canEdit
        onClose={vi.fn()}
      />,
    )
    const picker = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    fireEvent.change(picker, {
      target: { files: [new File(['jpeg'], 'look.JPG')] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(mocks.send).toHaveBeenCalledWith(
      'Use these images as visual references for this deck.',
      [expect.objectContaining({ name: 'look.JPG', type: 'image/jpeg' })],
      '',
    )
  })
})
