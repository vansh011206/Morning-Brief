import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
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

describe('ConnectionsPage Flows', () => {
  it('renders active connections and status badges from API', async () => {
    renderWithProviders(<ConnectionsPage />)

    // Verify page header
    expect(screen.getByText('Data Ingestion Channels')).toBeInTheDocument()

    // Verify connections from mock handler appear
    await waitFor(() => {
      expect(screen.getByText('Hacker News')).toBeInTheDocument()
    })

    expect(screen.getByText(/https:\/\/hnrss.org\/frontpage/i)).toBeInTheDocument()
    expect(screen.getByText(/7-Day Ingestion/i)).toBeInTheDocument()
    expect(screen.getByText('42 items')).toBeInTheDocument()

    // Verify buttons
    expect(screen.getByRole('button', { name: /Add Custom Feed/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sync Now/i })).toBeInTheDocument()
  })
})
