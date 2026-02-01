/**
 * Tests for SetSelector component
 *
 * Tests the question set selection flow:
 * - Loading state
 * - Displaying sets
 * - Selection callback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetSelector } from '../SetSelector'

// Mock next/link to avoid router issues in tests
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('SetSelector', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('shows loading state initially', () => {
    // Never resolve the fetch
    mockFetch.mockImplementation(() => new Promise(() => {}))

    render(<SetSelector onSelect={vi.fn()} />)

    expect(screen.getByText('Loading question sets...')).toBeInTheDocument()
  })

  it('displays question sets after loading', async () => {
    const mockSets = [
      { id: 'set1', title: 'Geography Quiz', _count: { questions: 10 } },
      { id: 'set2', title: 'Science Quiz', _count: { questions: 5 } },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSets),
    })

    render(<SetSelector onSelect={vi.fn()} />)

    // Wait for sets to load
    await waitFor(() => {
      expect(screen.getByText('Geography Quiz')).toBeInTheDocument()
    })

    expect(screen.getByText('Science Quiz')).toBeInTheDocument()
    expect(screen.getByText('10 questions')).toBeInTheDocument()
    expect(screen.getByText('5 questions')).toBeInTheDocument()
  })

  it('calls onSelect with correct id and title when set is clicked', async () => {
    const mockSets = [
      { id: 'set1', title: 'Geography Quiz', _count: { questions: 10 } },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSets),
    })

    const onSelect = vi.fn()
    const user = userEvent.setup()

    render(<SetSelector onSelect={onSelect} />)

    // Wait for sets to load
    await waitFor(() => {
      expect(screen.getByText('Geography Quiz')).toBeInTheDocument()
    })

    // Click on the set
    await user.click(screen.getByText('Geography Quiz'))

    // Verify callback was called with correct values
    expect(onSelect).toHaveBeenCalledWith('set1', 'Geography Quiz')
  })

  it('highlights the selected set', async () => {
    const mockSets = [
      { id: 'set1', title: 'Geography Quiz', _count: { questions: 10 } },
      { id: 'set2', title: 'Science Quiz', _count: { questions: 5 } },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSets),
    })

    render(<SetSelector onSelect={vi.fn()} selectedId="set1" />)

    // Wait for sets to load
    await waitFor(() => {
      expect(screen.getByText('Geography Quiz')).toBeInTheDocument()
    })

    // The selected button should have the blue styling
    const selectedButton = screen.getByText('Geography Quiz').closest('button')
    expect(selectedButton).toHaveClass('border-blue-500')
  })

  it('shows empty state when no sets exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<SetSelector onSelect={vi.fn()} />)

    await waitFor(() => {
      expect(
        screen.getByText("You don't have any question sets yet. Create one first!")
      ).toBeInTheDocument()
    })

    expect(screen.getByText('Create Question Set')).toBeInTheDocument()
  })

  it('shows error state when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    })

    render(<SetSelector onSelect={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load question sets')).toBeInTheDocument()
    })
  })
})
