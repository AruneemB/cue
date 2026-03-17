import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  ),
}));

import AuthSessionProvider from "@/components/providers/SessionProvider";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

describe("AuthSessionProvider", () => {
  it("renders children", () => {
    render(
      <AuthSessionProvider>
        <span>child content</span>
      </AuthSessionProvider>
    );
    expect(screen.getByText("child content")).toBeInTheDocument();
  });
});

describe("ServiceWorkerRegistration", () => {
  let originalNavigator: typeof navigator;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls navigator.serviceWorker.register on mount", async () => {
    const mockRegister = vi.fn().mockResolvedValue({ scope: "/" });
    Object.defineProperty(globalThis.navigator, "serviceWorker", {
      value: { register: mockRegister },
      configurable: true,
      writable: true,
    });

    render(<ServiceWorkerRegistration />);

    // useEffect runs asynchronously
    await vi.waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith("/sw.js");
    });
  });

  it("renders no DOM output", () => {
    const mockRegister = vi.fn().mockResolvedValue({ scope: "/" });
    Object.defineProperty(globalThis.navigator, "serviceWorker", {
      value: { register: mockRegister },
      configurable: true,
      writable: true,
    });

    const { container } = render(<ServiceWorkerRegistration />);
    expect(container.innerHTML).toBe("");
  });

  it("handles missing navigator.serviceWorker gracefully", () => {
    // Save and delete the property so "serviceWorker" in navigator is false
    const saved = Object.getOwnPropertyDescriptor(
      globalThis.navigator,
      "serviceWorker"
    );
    delete (globalThis.navigator as any).serviceWorker;

    // Should not throw
    expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();

    // Restore
    if (saved) {
      Object.defineProperty(globalThis.navigator, "serviceWorker", saved);
    }
  });
});
