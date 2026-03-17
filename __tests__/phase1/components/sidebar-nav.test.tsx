import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard"),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import { usePathname } from "next/navigation";
import SidebarNav from "@/components/SidebarNav";

const mockedUsePathname = vi.mocked(usePathname);

describe("SidebarNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUsePathname.mockReturnValue("/dashboard");
  });

  it("renders all 6 nav items", () => {
    render(<SidebarNav />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("Kaggle")).toBeInTheDocument();
    expect(screen.getByText("Roadmap")).toBeInTheDocument();
    expect(screen.getByText("LeetCode")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders brand link to /", () => {
    render(<SidebarNav />);
    const brand = screen.getByText("Cue");
    expect(brand.closest("a")).toHaveAttribute("href", "/");
  });

  it("highlights active link for exact pathname match", () => {
    mockedUsePathname.mockReturnValue("/dashboard");
    render(<SidebarNav />);
    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink?.className).toContain("bg-foreground/10");
  });

  it("highlights active link for nested paths", () => {
    mockedUsePathname.mockReturnValue("/github/repos");
    render(<SidebarNav />);
    const githubLink = screen.getByText("GitHub").closest("a");
    expect(githubLink?.className).toContain("bg-foreground/10");
    // Dashboard should NOT be active
    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink?.className).not.toContain("bg-foreground/10");
  });

  it("has correct href attributes for all nav items", () => {
    render(<SidebarNav />);
    const expectedHrefs = [
      ["/dashboard", "Dashboard"],
      ["/github", "GitHub"],
      ["/kaggle", "Kaggle"],
      ["/roadmap", "Roadmap"],
      ["/leetcode", "LeetCode"],
      ["/settings", "Settings"],
    ];
    for (const [href, label] of expectedHrefs) {
      const link = screen.getByText(label).closest("a");
      expect(link).toHaveAttribute("href", href);
    }
  });
});
