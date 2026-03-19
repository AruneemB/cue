import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { NotificationPrefs } from "@/components/settings/NotificationPrefs";
import { RoadmapImport } from "@/components/settings/RoadmapImport";
import { PushNotificationSetup } from "@/components/settings/PushNotificationSetup";

import type { NotifyPrefs, RoadmapData } from "@/types/database";

// ── NotificationPrefs ──────────────────────────────────────────

describe("NotificationPrefs", () => {
  function makePrefs(overrides: Partial<NotifyPrefs> = {}): NotifyPrefs {
    return {
      enabled: true,
      deliveryMethods: ["push"],
      enabledModules: ["github", "kaggle"],
      ...overrides,
    };
  }

  it("renders the section heading", () => {
    render(<NotificationPrefs initial={makePrefs()} onSave={vi.fn()} />);
    expect(screen.getByText("Notification Preferences")).toBeInTheDocument();
  });

  it("renders master enabled checkbox checked when enabled=true", () => {
    render(<NotificationPrefs initial={makePrefs({ enabled: true })} onSave={vi.fn()} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("renders master enabled checkbox unchecked when enabled=false", () => {
    render(<NotificationPrefs initial={makePrefs({ enabled: false })} onSave={vi.fn()} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
  });

  it("renders all delivery method options", () => {
    render(<NotificationPrefs initial={makePrefs()} onSave={vi.fn()} />);
    expect(screen.getByText("Push Notifications")).toBeInTheDocument();
    expect(screen.getByText("Email Digest")).toBeInTheDocument();
    expect(screen.getByText("In-App")).toBeInTheDocument();
  });

  it("renders all module channel options", () => {
    render(<NotificationPrefs initial={makePrefs()} onSave={vi.fn()} />);
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("Kaggle")).toBeInTheDocument();
    expect(screen.getByText("Roadmap")).toBeInTheDocument();
    expect(screen.getByText("LeetCode")).toBeInTheDocument();
  });

  it("renders Quiet Hours section", () => {
    render(<NotificationPrefs initial={makePrefs()} onSave={vi.fn()} />);
    expect(screen.getByText("Quiet Hours")).toBeInTheDocument();
  });

  it("renders Save Preferences button", () => {
    render(<NotificationPrefs initial={makePrefs()} onSave={vi.fn()} />);
    expect(screen.getByText("Save Preferences")).toBeInTheDocument();
  });

  it("calls onSave with current prefs when Save clicked", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const prefs = makePrefs();
    render(<NotificationPrefs initial={prefs} onSave={onSave} />);

    fireEvent.click(screen.getByText("Save Preferences"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(prefs);
    });
  });

  it("shows Saved text after successful save", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<NotificationPrefs initial={makePrefs()} onSave={onSave} />);

    fireEvent.click(screen.getByText("Save Preferences"));

    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  it("toggles delivery method on click", () => {
    render(
      <NotificationPrefs
        initial={makePrefs({ deliveryMethods: ["push"] })}
        onSave={vi.fn()}
      />
    );

    // Click "Email Digest" to add it
    fireEvent.click(screen.getByText("Email Digest"));

    // Click "Push Notifications" to remove it
    fireEvent.click(screen.getByText("Push Notifications"));

    // These are just UI state toggles; verify no crash
    expect(screen.getByText("Email Digest")).toBeInTheDocument();
  });

  it("toggles module channel on click", () => {
    render(
      <NotificationPrefs
        initial={makePrefs({ enabledModules: ["github"] })}
        onSave={vi.fn()}
      />
    );

    // Click "Roadmap" to add it
    fireEvent.click(screen.getByText("Roadmap"));

    // Click "GitHub" to remove it
    fireEvent.click(screen.getByText("GitHub"));

    expect(screen.getByText("Roadmap")).toBeInTheDocument();
  });

  it("renders quiet hours time inputs", () => {
    render(
      <NotificationPrefs
        initial={makePrefs({ quietHoursStart: "22:00", quietHoursEnd: "08:00" })}
        onSave={vi.fn()}
      />
    );
    const timeInputs = screen.getAllByDisplayValue(/\d{2}:\d{2}/);
    expect(timeInputs.length).toBe(2);
  });

  it("renders empty time inputs when no quiet hours set", () => {
    render(<NotificationPrefs initial={makePrefs()} onSave={vi.fn()} />);
    expect(screen.getByText("to")).toBeInTheDocument();
  });
});

// ── RoadmapImport ──────────────────────────────────────────────

describe("RoadmapImport", () => {
  const validJson = JSON.stringify({
    goals: [
      { id: "1", title: "Learn TypeScript", completed: false, completion_pct: 40 },
      { id: "2", title: "Learn React", completed: true },
    ],
    currentPhase: "Frontend Mastery",
  });

  it("renders the section heading", () => {
    render(<RoadmapImport current={null} onImport={vi.fn()} />);
    expect(screen.getByText("Roadmap Import")).toBeInTheDocument();
  });

  it("shows 'No roadmap imported yet' when current is null", () => {
    render(<RoadmapImport current={null} onImport={vi.fn()} />);
    expect(screen.getByText(/No roadmap imported yet/)).toBeInTheDocument();
  });

  it("shows current roadmap status when data exists", () => {
    const current: RoadmapData = {
      goals: [
        { id: "1", title: "Learn TS", completed: false },
        { id: "2", title: "Learn React", completed: true },
      ],
      currentPhase: "Frontend Mastery",
    };
    render(<RoadmapImport current={current} onImport={vi.fn()} />);
    expect(screen.getByText("Frontend Mastery")).toBeInTheDocument();
    expect(screen.getByText(/2 goals/)).toBeInTheDocument();
  });

  it("shows singular 'goal' for single goal", () => {
    const current: RoadmapData = {
      goals: [{ id: "1", title: "Learn TS", completed: false }],
    };
    render(<RoadmapImport current={current} onImport={vi.fn()} />);
    expect(screen.getByText(/1 goal\b/)).toBeInTheDocument();
  });

  it("renders Import JSON button", () => {
    render(<RoadmapImport current={null} onImport={vi.fn()} />);
    expect(screen.getByText("Import JSON")).toBeInTheDocument();
  });

  it("renders Upload File button", () => {
    render(<RoadmapImport current={null} onImport={vi.fn()} />);
    expect(screen.getByText("Upload File")).toBeInTheDocument();
  });

  it("disables Import button when textarea is empty", () => {
    render(<RoadmapImport current={null} onImport={vi.fn()} />);
    const btn = screen.getByText("Import JSON");
    expect(btn).toBeDisabled();
  });

  it("enables Import button when textarea has content", () => {
    render(<RoadmapImport current={null} onImport={vi.fn()} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: validJson } });
    expect(screen.getByText("Import JSON")).not.toBeDisabled();
  });

  it("shows parse error for invalid JSON", () => {
    render(<RoadmapImport current={null} onImport={vi.fn()} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "{bad json" } });
    fireEvent.click(screen.getByText("Import JSON"));
    expect(screen.getByText("Invalid JSON. Please check your input.")).toBeInTheDocument();
  });

  it("shows validation error when goals array is missing", () => {
    render(<RoadmapImport current={null} onImport={vi.fn()} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: '{"name": "test"}' } });
    fireEvent.click(screen.getByText("Import JSON"));
    expect(screen.getByText("JSON must contain a 'goals' array.")).toBeInTheDocument();
  });

  it("shows validation error for empty goals array", () => {
    render(<RoadmapImport current={null} onImport={vi.fn()} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: '{"goals": []}' } });
    fireEvent.click(screen.getByText("Import JSON"));
    expect(screen.getByText("Goals array must not be empty.")).toBeInTheDocument();
  });

  it("shows validation error when goal missing id/title", () => {
    render(<RoadmapImport current={null} onImport={vi.fn()} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, {
      target: { value: '{"goals": [{"name": "test"}]}' },
    });
    fireEvent.click(screen.getByText("Import JSON"));
    expect(screen.getByText(/Goal at index 0 must have 'id' and 'title'/)).toBeInTheDocument();
  });

  it("shows validation error when goal.completed is not boolean", () => {
    render(<RoadmapImport current={null} onImport={vi.fn()} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, {
      target: { value: '{"goals": [{"id": "1", "title": "Test", "completed": "yes"}]}' },
    });
    fireEvent.click(screen.getByText("Import JSON"));
    expect(screen.getByText(/must have a boolean 'completed' field/)).toBeInTheDocument();
  });

  it("calls onImport with parsed data on valid JSON", async () => {
    const onImport = vi.fn().mockResolvedValue(true);
    render(<RoadmapImport current={null} onImport={onImport} />);

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: validJson } });
    fireEvent.click(screen.getByText("Import JSON"));

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledTimes(1);
      const arg = onImport.mock.calls[0][0];
      expect(arg.goals).toHaveLength(2);
      expect(arg.currentPhase).toBe("Frontend Mastery");
    });
  });

  it("shows success message after successful import", async () => {
    const onImport = vi.fn().mockResolvedValue(true);
    render(<RoadmapImport current={null} onImport={onImport} />);

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: validJson } });
    fireEvent.click(screen.getByText("Import JSON"));

    await waitFor(() => {
      expect(screen.getByText("Roadmap imported successfully!")).toBeInTheDocument();
    });
  });

  it("shows error message when import fails", async () => {
    const onImport = vi.fn().mockResolvedValue(false);
    render(<RoadmapImport current={null} onImport={onImport} />);

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: validJson } });
    fireEvent.click(screen.getByText("Import JSON"));

    await waitFor(() => {
      expect(screen.getByText("Failed to save roadmap. Please try again.")).toBeInTheDocument();
    });
  });

  it("uses 'My Roadmap' as fallback when currentPhase is undefined", () => {
    const current: RoadmapData = {
      goals: [{ id: "1", title: "Test", completed: false }],
    };
    render(<RoadmapImport current={current} onImport={vi.fn()} />);
    expect(screen.getByText("My Roadmap")).toBeInTheDocument();
  });

  it("renders file upload input with .json accept", () => {
    render(<RoadmapImport current={null} onImport={vi.fn()} />);
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute("accept", ".json");
  });
});

// ── PushNotificationSetup ──────────────────────────────────────

describe("PushNotificationSetup", () => {
  it("renders the section heading", () => {
    render(
      <PushNotificationSetup
        pushEnabled={false}
        vapidPublicKey="test-key"
        onSubscribed={vi.fn()}
      />
    );
    expect(screen.getByText("Push Notifications")).toBeInTheDocument();
  });

  it("shows enabled state when pushEnabled is true", () => {
    render(
      <PushNotificationSetup
        pushEnabled={true}
        vapidPublicKey="test-key"
        onSubscribed={vi.fn()}
      />
    );
    expect(
      screen.getByText(/Push notifications are enabled/)
    ).toBeInTheDocument();
  });

  it("shows Enable button when pushEnabled is false", () => {
    render(
      <PushNotificationSetup
        pushEnabled={false}
        vapidPublicKey="test-key"
        onSubscribed={vi.fn()}
      />
    );
    expect(screen.getByText("Enable Push Notifications")).toBeInTheDocument();
  });

  it("does not show Enable button when already enabled", () => {
    render(
      <PushNotificationSetup
        pushEnabled={true}
        vapidPublicKey="test-key"
        onSubscribed={vi.fn()}
      />
    );
    expect(screen.queryByText("Enable Push Notifications")).not.toBeInTheDocument();
  });

  it("shows iOS PWA hint when not enabled", () => {
    render(
      <PushNotificationSetup
        pushEnabled={false}
        vapidPublicKey="test-key"
        onSubscribed={vi.fn()}
      />
    );
    expect(
      screen.getByText(/you must first add Cue to your Home Screen/)
    ).toBeInTheDocument();
  });

  it("does not show iOS hint when already enabled", () => {
    render(
      <PushNotificationSetup
        pushEnabled={true}
        vapidPublicKey="test-key"
        onSubscribed={vi.fn()}
      />
    );
    expect(
      screen.queryByText(/you must first add Cue to your Home Screen/)
    ).not.toBeInTheDocument();
  });

  it("shows hourly nudges description when enabled", () => {
    render(
      <PushNotificationSetup
        pushEnabled={true}
        vapidPublicKey="test-key"
        onSubscribed={vi.fn()}
      />
    );
    expect(
      screen.getByText(/hourly nudges in this browser/)
    ).toBeInTheDocument();
  });

  it("shows error when browser does not support push", async () => {
    // Temporarily remove serviceWorker from navigator
    const originalSW = navigator.serviceWorker;
    Object.defineProperty(navigator, "serviceWorker", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    render(
      <PushNotificationSetup
        pushEnabled={false}
        vapidPublicKey="test-key"
        onSubscribed={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Enable Push Notifications"));

    await waitFor(() => {
      expect(
        screen.getByText("Push notifications are not supported in this browser.")
      ).toBeInTheDocument();
    });

    // Restore
    Object.defineProperty(navigator, "serviceWorker", {
      value: originalSW,
      writable: true,
      configurable: true,
    });
  });
});
