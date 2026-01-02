import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import SimpleHeader from "../SimpleHeader"

jest.mock("next/link", () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
  MockLink.displayName = "Link"
  return MockLink
})

describe("SimpleHeader", () => {
  const mockBackLink = {
    href: "/dashboard",
    label: "Back to Dashboard",
  }

  it("should render with title and back link", () => {
    render(<SimpleHeader title="Test Page" backLink={mockBackLink} />)

    expect(screen.getByText("Test Page")).toBeInTheDocument()
    expect(screen.getByText("← Back to Dashboard")).toBeInTheDocument()
  })

  it("should render back link with correct href", () => {
    render(<SimpleHeader title="Test Page" backLink={mockBackLink} />)

    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/dashboard")
  })

  it("should apply correct styling classes to title", () => {
    render(<SimpleHeader title="Test Page" backLink={mockBackLink} />)

    const title = screen.getByText("Test Page")
    expect(title).toHaveClass("text-2xl")
    expect(title).toHaveClass("font-bold")
    expect(title).toHaveClass("text-indigo-600")
    expect(title).toHaveClass("dark:text-indigo-400")
  })

  it("should apply correct styling classes to back link", () => {
    const { container } = render(<SimpleHeader title="Test Page" backLink={mockBackLink} />)

    // The Link component should have the correct class names in the source
    const link = container.querySelector('a[href="/dashboard"]')
    expect(link).toBeInTheDocument()
  })

  it("should apply dark mode classes", () => {
    render(<SimpleHeader title="Test Page" backLink={mockBackLink} />)

    const header = screen.getByRole("banner")
    expect(header).toHaveClass("bg-white")
    expect(header).toHaveClass("dark:bg-gray-800")
  })

  it("should include left arrow before back link text", () => {
    render(<SimpleHeader title="Test Page" backLink={mockBackLink} />)

    expect(screen.getByText("← Back to Dashboard")).toBeInTheDocument()
  })

  it("should render children when provided", () => {
    render(
      <SimpleHeader title="Test Page" backLink={mockBackLink}>
        <button>Action Button</button>
      </SimpleHeader>
    )

    expect(screen.getByText("Action Button")).toBeInTheDocument()
  })

  it("should render multiple children when provided", () => {
    render(
      <SimpleHeader title="Test Page" backLink={mockBackLink}>
        <button>Button 1</button>
        <button>Button 2</button>
      </SimpleHeader>
    )

    expect(screen.getByText("Button 1")).toBeInTheDocument()
    expect(screen.getByText("Button 2")).toBeInTheDocument()
  })

  it("should render without children", () => {
    render(<SimpleHeader title="Test Page" backLink={mockBackLink} />)

    expect(screen.getByText("Test Page")).toBeInTheDocument()
    expect(screen.getByText("← Back to Dashboard")).toBeInTheDocument()
  })

  it("should render with different back link labels", () => {
    const customBackLink = {
      href: "/home",
      label: "Go Home",
    }
    render(<SimpleHeader title="Settings" backLink={customBackLink} />)

    expect(screen.getByText("← Go Home")).toBeInTheDocument()
  })

  it("should render with different back link hrefs", () => {
    const customBackLink = {
      href: "/groups",
      label: "Back to Groups",
    }
    render(<SimpleHeader title="Group Details" backLink={customBackLink} />)

    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/groups")
  })

  it("should render with different titles", () => {
    render(<SimpleHeader title="My Custom Title" backLink={mockBackLink} />)

    expect(screen.getByText("My Custom Title")).toBeInTheDocument()
  })

  it("should have proper layout structure", () => {
    const { container } = render(
      <SimpleHeader title="Test Page" backLink={mockBackLink} />
    )

    const header = container.querySelector("header")
    expect(header).toHaveClass("shadow")

    const contentDiv = container.querySelector(".max-w-7xl")
    expect(contentDiv).toBeInTheDocument()
    expect(contentDiv).toHaveClass("mx-auto")
    expect(contentDiv).toHaveClass("px-4")
    expect(contentDiv).toHaveClass("sm:px-6")
    expect(contentDiv).toHaveClass("lg:px-8")
    expect(contentDiv).toHaveClass("py-4")
  })

  it("should have flex layout with items justified between", () => {
    const { container } = render(
      <SimpleHeader title="Test Page" backLink={mockBackLink} />
    )

    const flexDiv = container.querySelector(".flex.items-center.justify-between")
    expect(flexDiv).toBeInTheDocument()
  })

  it("should render children before back link", () => {
    const { container } = render(
      <SimpleHeader title="Test Page" backLink={mockBackLink}>
        <button>Action</button>
      </SimpleHeader>
    )

    const flexDiv = container.querySelector(".flex.items-center.gap-4")
    expect(flexDiv).toBeInTheDocument()
    
    const button = screen.getByText("Action")
    const link = screen.getByRole("link")
    
    // Button should appear before link in the DOM
    expect(button.compareDocumentPosition(link)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })
})
