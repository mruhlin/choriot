import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import DashboardHeader from "../DashboardHeader"

const mockSignOut = jest.fn()

jest.mock("next-auth/react", () => ({
  signOut: (options: { callbackUrl: string }) => mockSignOut(options),
}))

jest.mock("next/link", () => {
  const MockLink = ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => {
    return <a href={href} className={className}>{children}</a>
  }
  MockLink.displayName = "Link"
  return MockLink
})

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

describe("DashboardHeader", () => {
  const mockUser = {
    id: "user-1",
    name: "Alice",
    email: "alice@example.com",
    image: "https://example.com/profile.jpg",
    timezone: "America/Los_Angeles",
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Basic Rendering", () => {
    it("should render logo and branding", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      expect(screen.getByAltText("Choriot Logo")).toBeInTheDocument()
      expect(screen.getByText("Choriot")).toBeInTheDocument()
    })

    it("should render user profile link with avatar", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const profileImage = screen.getByAltText("Alice")
      expect(profileImage).toBeInTheDocument()
      expect(profileImage).toHaveAttribute("src", "https://example.com/profile.jpg")
      expect(screen.getByText("Alice")).toBeInTheDocument()
    })

    it("should render user email when name is not provided", () => {
      const userWithoutName = { ...mockUser, name: null }
      render(
        <DashboardHeader
          user={userWithoutName}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      expect(screen.getByText("alice@example.com")).toBeInTheDocument()
    })

    it("should use default logo when user has no image", () => {
      const userWithoutImage = { ...mockUser, image: null, name: undefined }
      render(
        <DashboardHeader
          user={userWithoutImage}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const profileImage = screen.getByAltText("Profile")
      expect(profileImage).toHaveAttribute("src", "/logo.png")
    })

    it("should display total points", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={150}
          pendingInvitationsCount={0}
        />
      )

      expect(screen.getByText("150 pts")).toBeInTheDocument()
    })

    it("should display zero points", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={0}
          pendingInvitationsCount={0}
        />
      )

      expect(screen.getByText("0 pts")).toBeInTheDocument()
    })
  })

  describe("Navigation Links", () => {
    it("should render Groups link", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const groupsLink = screen.getByText("Groups")
      expect(groupsLink).toBeInTheDocument()
      expect(groupsLink).toHaveAttribute("href", "/dashboard/groups")
    })

    it("should render Profile link", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const profileLinks = screen.getAllByText("Profile")
      // One is the user name area link, one is the Profile nav link
      expect(profileLinks.length).toBeGreaterThan(0)
    })

    it("should render Invitations link", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const invitationsLink = screen.getByText("Invitations")
      expect(invitationsLink).toBeInTheDocument()
      expect(invitationsLink).toHaveAttribute("href", "/dashboard/invitations")
    })

    it("should render New Chore button", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const newChoreButton = screen.getByText("New Chore")
      expect(newChoreButton).toBeInTheDocument()
      expect(newChoreButton).toHaveAttribute("href", "/dashboard/chores/new")
    })
  })

  describe("Invitations Badge", () => {
    it("should not show badge when pending invitations count is 0", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const invitationsLink = screen.getByText("Invitations")
      const badge = invitationsLink.querySelector("span")
      expect(badge).not.toBeInTheDocument()
    })

    it("should show badge when pending invitations count is greater than 0", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={3}
        />
      )

      const badge = screen.getByText("3")
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass("bg-red-500")
      expect(badge).toHaveClass("text-white")
    })

    it("should show correct count in badge", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={5}
        />
      )

      expect(screen.getByText("5")).toBeInTheDocument()
    })
  })

  describe("Sign Out Functionality", () => {
    it("should render Sign Out button", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      expect(screen.getByText("Sign Out")).toBeInTheDocument()
    })

    it("should call signOut when Sign Out button is clicked", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const signOutButton = screen.getByText("Sign Out")
      fireEvent.click(signOutButton)

      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/login" })
    })
  })

  describe("Tab Navigation", () => {
    it("should not render tabs when activeTab is not provided", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      // Should only have nav links, not tab links
      const homeLinks = screen.queryAllByText("Home")
      expect(homeLinks.length).toBe(0)
    })

    it("should render tabs when activeTab is provided", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
          activeTab="home"
        />
      )

      expect(screen.getByText("Home")).toBeInTheDocument()
      expect(screen.getByText("Completed")).toBeInTheDocument()
    })

    it("should highlight Home tab when activeTab is home", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
          activeTab="home"
        />
      )

      const homeTab = screen.getByText("Home")
      expect(homeTab).toHaveClass("text-indigo-600")
      expect(homeTab).toHaveClass("dark:text-indigo-400")
      expect(homeTab).toHaveClass("border-b-2")
      expect(homeTab).toHaveClass("border-indigo-600")
    })

    it("should not highlight Completed tab when activeTab is home", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
          activeTab="home"
        />
      )

      const completedTab = screen.getByText("Completed")
      expect(completedTab).toHaveClass("text-gray-600")
      expect(completedTab).toHaveClass("dark:text-gray-400")
      expect(completedTab).not.toHaveClass("border-b-2")
    })

    it("should highlight Completed tab when activeTab is completed", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
          activeTab="completed"
        />
      )

      const completedTab = screen.getByText("Completed")
      expect(completedTab).toHaveClass("text-indigo-600")
      expect(completedTab).toHaveClass("dark:text-indigo-400")
      expect(completedTab).toHaveClass("border-b-2")
      expect(completedTab).toHaveClass("border-indigo-600")
    })

    it("should not highlight Home tab when activeTab is completed", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
          activeTab="completed"
        />
      )

      const homeTab = screen.getByText("Home")
      expect(homeTab).toHaveClass("text-gray-600")
      expect(homeTab).toHaveClass("dark:text-gray-400")
      expect(homeTab).not.toHaveClass("border-b-2")
    })

    it("should have correct href for Home tab", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
          activeTab="home"
        />
      )

      const homeTab = screen.getByText("Home")
      expect(homeTab).toHaveAttribute("href", "/dashboard")
    })

    it("should have correct href for Completed tab", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
          activeTab="home"
        />
      )

      const completedTab = screen.getByText("Completed")
      expect(completedTab).toHaveAttribute("href", "/dashboard/completed")
    })
  })

  describe("Dark Mode Styling", () => {
    it("should apply dark mode classes to header", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const header = screen.getByRole("banner")
      expect(header).toHaveClass("bg-white")
      expect(header).toHaveClass("dark:bg-gray-800")
    })

    it("should apply dark mode classes to branding", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const branding = screen.getByText("Choriot")
      expect(branding).toHaveClass("text-indigo-600")
      expect(branding).toHaveClass("dark:text-indigo-400")
    })

    it("should apply dark mode classes to points badge", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const pointsBadge = screen.getByText("100 pts")
      expect(pointsBadge).toHaveClass("bg-indigo-100")
      expect(pointsBadge).toHaveClass("dark:bg-indigo-900")
      expect(pointsBadge).toHaveClass("text-indigo-800")
      expect(pointsBadge).toHaveClass("dark:text-indigo-200")
    })

    it("should apply dark mode classes to navigation links", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const groupsLink = screen.getByText("Groups")
      expect(groupsLink).toHaveClass("text-indigo-600")
      expect(groupsLink).toHaveClass("dark:text-indigo-400")
    })

    it("should apply dark mode classes to New Chore button", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const newChoreButton = screen.getByText("New Chore")
      expect(newChoreButton).toHaveClass("dark:bg-indigo-500")
      expect(newChoreButton).toHaveClass("dark:hover:bg-indigo-600")
    })

    it("should apply dark mode classes to Sign Out button", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const signOutButton = screen.getByText("Sign Out")
      expect(signOutButton).toHaveClass("text-gray-600")
      expect(signOutButton).toHaveClass("dark:text-gray-300")
    })

    it("should apply dark mode classes to tab border", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
          activeTab="home"
        />
      )

      const homeTab = screen.getByText("Home")
      expect(homeTab).toHaveClass("dark:border-indigo-400")
    })
  })

  describe("Indigo Color Scheme", () => {
    it("should use indigo color for branding", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const branding = screen.getByText("Choriot")
      expect(branding).toHaveClass("text-indigo-600")
    })

    it("should use indigo color for navigation links", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const groupsLink = screen.getByText("Groups")
      expect(groupsLink).toHaveClass("text-indigo-600")
      expect(groupsLink).toHaveClass("hover:underline")
    })

    it("should use indigo color for New Chore button", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const newChoreButton = screen.getByText("New Chore")
      expect(newChoreButton).toHaveClass("bg-indigo-600")
    })

    it("should use indigo color for active tab", () => {
      render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
          activeTab="home"
        />
      )

      const homeTab = screen.getByText("Home")
      expect(homeTab).toHaveClass("text-indigo-600")
      expect(homeTab).toHaveClass("border-indigo-600")
    })
  })

  describe("Layout Structure", () => {
    it("should have proper responsive padding", () => {
      const { container } = render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const mainDiv = container.querySelector(".max-w-7xl")
      expect(mainDiv).toHaveClass("px-4")
      expect(mainDiv).toHaveClass("sm:px-6")
      expect(mainDiv).toHaveClass("lg:px-8")
      expect(mainDiv).toHaveClass("py-4")
    })

    it("should have flex layout for header content", () => {
      const { container } = render(
        <DashboardHeader
          user={mockUser}
          totalPoints={100}
          pendingInvitationsCount={0}
        />
      )

      const flexDiv = container.querySelector(".flex.justify-between.items-center")
      expect(flexDiv).toBeInTheDocument()
    })
  })
})
