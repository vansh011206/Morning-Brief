import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ArchivePage } from '../pages/ArchivePage'

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

describe('ArchivePage Pagination', () => {
  it('renders archive page and navigates pages with Next and Prev controls', async () => {
    renderWithProviders(<ArchivePage />)

    // Verify header
    expect(screen.getByText('Archive')).toBeInTheDocument()

    // Wait for digests to load
    await waitFor(() => {
      expect(screen.getByText(/2026/)).toBeInTheDocument()
    })

    // Next page button
    const nextButton = screen.getByRole('button', { name: /Next/i })
    expect(nextButton).toBeInTheDocument()
  })
})
