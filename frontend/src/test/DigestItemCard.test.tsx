import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DigestItemCard } from '../features/digest/DigestItemCard'
import { mockDigest } from './mocks/handlers'

describe('DigestItemCard Component', () => {
  const sampleItem = mockDigest.items[1]! // Urgent action item (PR #42)

  it('renders item details, urgent badge, and source link', () => {
    render(<DigestItemCard item={sampleItem} />)

    expect(screen.getByText('PR #42: Security patch ready for review')).toBeInTheDocument()
    expect(screen.getByText(/fixes authentication session/i)).toBeInTheDocument()
    expect(screen.getByText('Urgent')).toBeInTheDocument()
    expect(screen.getByText('GitHub Notifications')).toBeInTheDocument()

    const sourceLink = screen.getByRole('link', { name: /source/i })
    expect(sourceLink).toHaveAttribute('href', 'https://github.com/repo/pull/42')
  })

  it('optimistically updates feedback state on upvote and downvote', async () => {
    const onFeedbackMock = vi.fn()
    render(<DigestItemCard item={sampleItem} onFeedback={onFeedbackMock} />)

    const upButton = screen.getByTestId('feedback-up')
    const downButton = screen.getByTestId('feedback-down')

    // 1. Click Upvote
    fireEvent.click(upButton)

    // Optimistic update should immediately apply active indigo styling
    expect(upButton).toHaveClass('text-indigo-600')
    expect(onFeedbackMock).toHaveBeenCalledWith(sampleItem.id, 'helpful')

    // Wait for submission to complete so isSubmitting resets
    await waitFor(() => {
      expect(upButton).not.toBeDisabled()
    })

    // 2. Click Downvote
    fireEvent.click(downButton)

    // Optimistic update should switch to active rose styling
    expect(downButton).toHaveClass('text-rose-600')
    expect(onFeedbackMock).toHaveBeenCalledWith(sampleItem.id, 'unhelpful')
  })
})
