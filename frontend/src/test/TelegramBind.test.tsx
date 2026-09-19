import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ConnectionsPage } from '../pages/ConnectionsPage'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe('Telegram Bind Copy Step', () => {
  beforeEach(() => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('opens Telegram modal, displays deep link, and copies link to clipboard', async () => {
    renderWithProviders(<ConnectionsPage />)

    // Click "Connect Bot" on Telegram card
    const connectButton = screen.getByRole('button', { name: /Connect Bot/i })
    fireEvent.click(connectButton)

    // Verify modal title appears
    expect(screen.getByText('Link Telegram Bot')).toBeInTheDocument()

    // Wait for deep link to load from API
    await waitFor(() => {
      expect(screen.getByDisplayValue(/https:\/\/t\.me\/MorningBriefBot\?start=/i)).toBeInTheDocument()
    })

    // Click Copy button
    const copyButton = screen.getByTestId('copy-telegram-link')
    expect(copyButton).toBeInTheDocument()
    fireEvent.click(copyButton)

    // Assert clipboard.writeText was called with the deep link
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://t.me/MorningBriefBot?start=mock_tg_token_xyz'
    )

    // Assert button updates to "Copied"
    expect(screen.getByText('Copied')).toBeInTheDocument()
  })
})
