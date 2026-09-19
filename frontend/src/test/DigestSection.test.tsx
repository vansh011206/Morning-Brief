import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DigestSection } from '../features/digest/DigestSection'
import { mockDigest } from './mocks/handlers'

describe('DigestSection Component', () => {
  it('renders section title, item count badge, and items', () => {
    const newsSection = mockDigest.sections.news!

    render(
      <DigestSection
        sectionKey={newsSection.key}
        title={newsSection.title}
        items={newsSection.items}
      />
    )

    // Check title
    expect(screen.getByText('Technology & World News')).toBeInTheDocument()

    // Check badge count
    expect(screen.getByText('1 item')).toBeInTheDocument()

    // Check item title rendered
    expect(screen.getByText('Quantum Breakthrough at MIT')).toBeInTheDocument()
  })

  it('renders null when items array is empty', () => {
    const { container } = render(
      <DigestSection sectionKey="news" title="Empty Section" items={[]} />
    )
    expect(container.firstChild).toBeNull()
  })
})
