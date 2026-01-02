import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import '@testing-library/jest-dom'
import GroupDetailClient from '../group-detail-client'

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ComponentProps<'img'>) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...props} />
  },
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/components/SimpleHeader', () => {
  const MockSimpleHeader = ({ title, backLink, children }: { title: string; backLink: { href: string; label: string }; children?: React.ReactNode }) => {
    return (
      <header>
        <h1>{title}</h1>
        <a href={backLink.href}>{backLink.label}</a>
        {children}
      </header>
    )
  }
  MockSimpleHeader.displayName = 'SimpleHeader'
  return MockSimpleHeader
})

describe('GroupDetailClient', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  }

  const mockGroup = {
    id: 'group-1',
    name: 'Family',
    description: 'Family chores',
    memberships: [
      {
        id: 'membership-1',
        userId: 'user-1',
        groupId: 'group-1',
        role: 'ADMIN' as const,
        joinedAt: new Date('2024-01-01'),
        user: {
          id: 'user-1',
          name: 'Alice',
          email: 'alice@example.com',
          image: 'https://example.com/alice.jpg',
        },
      },
      {
        id: 'membership-2',
        userId: 'user-2',
        groupId: 'group-1',
        role: 'MEMBER' as const,
        joinedAt: new Date('2024-01-02'),
        user: {
          id: 'user-2',
          name: 'Bob',
          email: 'bob@example.com',
          image: null,
        },
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    global.fetch = jest.fn()
  })

  describe('Rendering', () => {
    it('should render group name and description', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      expect(screen.getByText('Family')).toBeInTheDocument()
      expect(screen.getByText('Family chores')).toBeInTheDocument()
    })

    it('should render group without description', () => {
      const groupNoDesc = { ...mockGroup, description: null }
      render(
        <GroupDetailClient
          group={groupNoDesc}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      expect(screen.getByText('Family')).toBeInTheDocument()
      expect(screen.queryByText('Family chores')).not.toBeInTheDocument()
    })

    it('should render back to groups link', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const link = screen.getByRole('link', { name: /back to groups/i })
      expect(link).toHaveAttribute('href', '/dashboard/groups')
    })
  })

  describe('Members List', () => {
    it('should display all members with their details', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      expect(screen.getByText('Members (2)')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    })

    it('should display ADMIN badge for admin users', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const adminBadges = screen.getAllByText('ADMIN')
      expect(adminBadges).toHaveLength(1)
    })

    it('should mark current user with "(You)" label', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      expect(screen.getByText('(You)')).toBeInTheDocument()
    })

    it('should display member email when name is null', () => {
      const groupWithNoName = {
        ...mockGroup,
        memberships: [
          {
            ...mockGroup.memberships[0],
            user: { ...mockGroup.memberships[0].user, name: null },
          },
        ],
      }

      render(
        <GroupDetailClient
          group={groupWithNoName}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      // Email should appear both as display name and in details
      const emailElements = screen.getAllByText('alice@example.com')
      expect(emailElements.length).toBeGreaterThan(0)
    })

    it('should display profile image for users with images', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const aliceImage = screen.getByAltText('Alice')
      expect(aliceImage).toBeInTheDocument()
      expect(aliceImage).toHaveAttribute('src', 'https://example.com/alice.jpg')
      expect(aliceImage).toHaveAttribute('width', '48')
      expect(aliceImage).toHaveAttribute('height', '48')
    })

    it('should display default avatar when user has no profile image', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const bobImage = screen.getByAltText('Bob')
      expect(bobImage).toBeInTheDocument()
      expect(bobImage).toHaveAttribute('src', '/logo.png')
    })

    it('should apply circular styling to profile images', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const aliceImage = screen.getByAltText('Alice')
      expect(aliceImage).toHaveClass('rounded-full')
      expect(aliceImage).toHaveClass('object-cover')
    })

    it('should display all member profile images', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const aliceImage = screen.getByAltText('Alice')
      const bobImage = screen.getByAltText('Bob')

      expect(aliceImage).toBeInTheDocument()
      expect(bobImage).toBeInTheDocument()
    })

    it('should use email as alt text when name is null', () => {
      const groupWithNoName = {
        ...mockGroup,
        memberships: [
          {
            ...mockGroup.memberships[0],
            user: { ...mockGroup.memberships[0].user, name: null },
          },
        ],
      }

      render(
        <GroupDetailClient
          group={groupWithNoName}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const image = screen.getByAltText('alice@example.com')
      expect(image).toBeInTheDocument()
    })

    it('should handle image loading errors by falling back to default avatar', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const aliceImage = screen.getByAltText('Alice') as HTMLImageElement
      
      // Simulate image load error
      fireEvent.error(aliceImage)

      expect(aliceImage.src).toContain('/logo.png')
    })
  })

  describe('Profile Images', () => {
    it('should display profile image for user with image set', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const aliceImage = screen.getByAltText('Alice')
      expect(aliceImage).toBeInTheDocument()
      expect(aliceImage).toHaveAttribute('src', 'https://example.com/alice.jpg')
      expect(aliceImage).toHaveAttribute('width', '48')
      expect(aliceImage).toHaveAttribute('height', '48')
    })

    it('should display default avatar for user without image', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const bobImage = screen.getByAltText('Bob')
      expect(bobImage).toBeInTheDocument()
      expect(bobImage).toHaveAttribute('src', '/logo.png')
    })

    it('should display email as alt text when name is null', () => {
      const groupWithNoName = {
        ...mockGroup,
        memberships: [
          {
            ...mockGroup.memberships[0],
            user: { ...mockGroup.memberships[0].user, name: null },
          },
        ],
      }

      render(
        <GroupDetailClient
          group={groupWithNoName}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const image = screen.getByAltText('alice@example.com')
      expect(image).toBeInTheDocument()
    })

    it('should apply rounded-full class for circular images', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const aliceImage = screen.getByAltText('Alice')
      expect(aliceImage).toHaveClass('rounded-full')
    })

    it('should apply object-cover class for consistent image display', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const aliceImage = screen.getByAltText('Alice')
      expect(aliceImage).toHaveClass('object-cover')
    })

    it('should handle image loading errors by falling back to default avatar', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const aliceImage = screen.getByAltText('Alice') as HTMLImageElement
      
      // Simulate image load error
      fireEvent.error(aliceImage)
      
      // The src will be an absolute URL, so we check if it ends with /logo.png
      expect(aliceImage.src).toMatch(/\/logo\.png$/)
    })

    it('should display profile images for all members', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const images = screen.getAllByRole('img')
      // Should have one image per member
      expect(images.length).toBe(mockGroup.memberships.length)
    })

    it('should position images to the left of user information', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const membershipElements = screen.getByText('Alice').closest('div.flex.items-center.gap-3')
      expect(membershipElements).toBeInTheDocument()
      
      // The image container should have flex-shrink-0 class
      const imageContainer = membershipElements?.querySelector('.flex-shrink-0')
      expect(imageContainer).toBeInTheDocument()
    })
  })

  describe('Add Member Section - Admin View', () => {
    it('should display add member form for admin users', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      expect(screen.getByRole('heading', { name: 'Add Member' })).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument()
    })

    it('should NOT display add member form for non-admin users', () => {
      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-2"
          isAdmin={false}
          pendingInvitations={[]}
        />
      )

      expect(screen.queryByRole('heading', { name: 'Add Member' })).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument()
    })
  })

  describe('Add Member Functionality', () => {
    it('should successfully add a member', async () => {
      const mockResponse = {
        user: {
          id: 'user-3',
          name: 'Charlie',
          email: 'charlie@example.com',
        },
        role: 'MEMBER',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /add member/i })

      fireEvent.change(emailInput, { target: { value: 'charlie@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/groups/group-1/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'charlie@example.com' }),
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Invitation sent to charlie@example.com')).toBeInTheDocument()
      })

      expect(mockRouter.refresh).toHaveBeenCalled()
      expect(emailInput).toHaveValue('')
    })

    it('should display success message with email when name is null', async () => {
      const mockResponse = {
        user: {
          id: 'user-3',
          name: null,
          email: 'charlie@example.com',
        },
        role: 'MEMBER',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /add member/i })

      fireEvent.change(emailInput, { target: { value: 'charlie@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invitation sent to charlie@example.com')).toBeInTheDocument()
      })
    })

    it('should display "User not found" error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'User not found' }),
      })

      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /add member/i })

      fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('User not found')).toBeInTheDocument()
      })

      expect(mockRouter.refresh).not.toHaveBeenCalled()
    })

    it('should display "User is already a member" error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'User is already a member' }),
      })

      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /add member/i })

      fireEvent.change(emailInput, { target: { value: 'bob@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('User is already a member')).toBeInTheDocument()
      })
    })

    it('should display generic error for network failures', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /add member/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      })
    })

    it('should display fallback error message when error field is missing', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })

      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /add member/i })

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to add member')).toBeInTheDocument()
      })
    })

    it('should disable button and show loading state during submission', async () => {
      ;(global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            user: { id: 'user-3', name: 'Charlie', email: 'charlie@example.com' },
          }),
        }), 100))
      )

      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /add member/i })

      fireEvent.change(emailInput, { target: { value: 'charlie@example.com' } })
      fireEvent.click(submitButton)

      expect(screen.getByRole('button', { name: /adding.../i })).toBeDisabled()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add member/i })).not.toBeDisabled()
      })
    })

    it('should clear error message when submitting new request', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'User not found' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            user: { id: 'user-3', name: 'Charlie', email: 'charlie@example.com' },
          }),
        })

      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /add member/i })

      // First submission - error
      fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('User not found')).toBeInTheDocument()
      })

      // Second submission - success
      fireEvent.change(emailInput, { target: { value: 'charlie@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText('User not found')).not.toBeInTheDocument()
        expect(screen.getByText('Invitation sent to charlie@example.com')).toBeInTheDocument()
      })
    })

    it('should clear success message when submitting new request', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            user: { id: 'user-3', name: 'Charlie', email: 'charlie@example.com' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            user: { id: 'user-4', name: 'David', email: 'david@example.com' },
          }),
        })

      render(
        <GroupDetailClient
          group={mockGroup}
          currentUserId="user-1"
          isAdmin={true}
          pendingInvitations={[]}
        />
      )

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /add member/i })

      // First submission
      fireEvent.change(emailInput, { target: { value: 'charlie@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invitation sent to charlie@example.com')).toBeInTheDocument()
      })

      // Second submission
      fireEvent.change(emailInput, { target: { value: 'david@example.com' } })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText('Invitation sent to charlie@example.com')).not.toBeInTheDocument()
        expect(screen.getByText('Invitation sent to david@example.com')).toBeInTheDocument()
      })
    })
  })
})
