import { vi } from "vitest";
import type { GitHubRepo, ScoredRepo } from "@/types/github";
import type { DailyChallenge } from "@/types/leetcode";
import type {
  User,
  NotifyPrefs,
  PushSubscription,
  RoadmapData,
  ModuleChannel,
} from "@/types/database";
import type { QuantIdea, MicroTask } from "@/types/ai";

export function createMockRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    id: 1,
    name: "my-repo",
    full_name: "user/my-repo",
    html_url: "https://github.com/user/my-repo",
    description: "A test repo",
    fork: false,
    archived: false,
    language: "TypeScript",
    stargazers_count: 10,
    open_issues_count: 2,
    pushed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockScoredRepo(
  overrides: Partial<ScoredRepo> = {}
): ScoredRepo {
  return {
    repo: createMockRepo(),
    score: 10,
    daysSinceLastPush: 5,
    ...overrides,
  };
}

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-uuid-1",
    github_id: "12345",
    email: "test@example.com",
    github_token: "ghp_testtoken123",
    push_subscription: createMockPushSubscription(),
    notify_prefs: createMockNotifyPrefs(),
    roadmap_data: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
    ...overrides,
  };
}

export function createMockNotifyPrefs(
  overrides: Partial<NotifyPrefs> = {}
): NotifyPrefs {
  return {
    enabled: true,
    deliveryMethods: ["push"],
    enabledModules: ["github", "kaggle", "roadmap", "leetcode"],
    ...overrides,
  };
}

export function createMockPushSubscription(
  overrides: Partial<PushSubscription> = {}
): PushSubscription {
  return {
    endpoint: "https://fcm.googleapis.com/fcm/send/test-subscription-id",
    keys: {
      p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfWLU",
      auth: "tBHItJI5svbpC7cvI2ax8Q",
    },
    ...overrides,
  };
}

export function createMockRoadmapData(
  overrides: Partial<RoadmapData> = {}
): RoadmapData {
  return {
    goals: [
      {
        id: "goal-1",
        title: "Learn TypeScript",
        targetDate: "2025-06-01",
        completed: false,
        completion_pct: 40,
      },
      {
        id: "goal-2",
        title: "Learn React",
        completed: true,
        completion_pct: 100,
      },
      {
        id: "goal-3",
        title: "Learn Next.js",
        completed: false,
      },
    ],
    currentPhase: "Frontend Mastery",
    ...overrides,
  };
}

export function createMockChallenge(
  overrides: Partial<DailyChallenge> = {}
): DailyChallenge {
  return {
    date: "2025-01-15",
    link: "/problems/two-sum",
    question: {
      title: "Two Sum",
      difficulty: "Easy",
      acRate: 49.5,
      topicTags: [{ name: "Array" }, { name: "Hash Table" }],
    },
    ...overrides,
  };
}

export function createMockQuantIdea(
  overrides: Partial<QuantIdea> = {}
): QuantIdea {
  return {
    title: "Momentum Factor Timing",
    hypothesis: "ML models can predict momentum regime changes",
    dataset: "CRSP daily returns 2000-2024",
    methodology: "Random forest on rolling momentum features",
    eval_metric: "Sharpe ratio improvement",
    difficulty: "intermediate",
    ...overrides,
  };
}

export function createMockMicroTask(
  overrides: Partial<MicroTask> = {}
): MicroTask {
  return {
    task_description: "Build a simple REST API with Express",
    resource_link: "https://expressjs.com/en/starter/hello-world.html",
    hands_on_exercise: "Create GET/POST endpoints for a todo list",
    ...overrides,
  };
}

/** Create a mock NextRequest-like object */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
): Request {
  const { method = "GET", headers = {}, body } = options;
  return new Request(url, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** Build a chainable mock for Supabase query builder */
export function createMockSupabaseChain(result: {
  data?: unknown;
  error?: { message: string } | null;
}) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "not",
    "order",
    "limit",
    "single",
    "is",
  ];

  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  // Terminal methods resolve to the result
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((resolve: (val: unknown) => void) => resolve(result));

  // Make the chain itself thenable
  const handler = {
    get(target: Record<string, unknown>, prop: string) {
      if (prop === "then") {
        return (resolve: (val: unknown) => void) =>
          resolve({ data: result.data, error: result.error ?? null });
      }
      if (prop in target) return target[prop];
      return vi.fn().mockReturnValue(new Proxy(target, handler));
    },
  };

  return new Proxy(chain, handler);
}

/** Create a mock fetch Response */
export function createMockFetchResponse(
  body: unknown,
  options: { status?: number; ok?: boolean } = {}
) {
  const { status = 200, ok = true } = options;
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

/** Set up common test environment variables */
export function setupTestEnv(
  vars: Record<string, string> = {}
): () => void {
  const defaults: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    UPSTASH_REDIS_REST_URL: "https://test.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "test-redis-token",
    OPENROUTER_API_KEY: "test-openrouter-key",
    VAPID_PUBLIC_KEY: "test-vapid-public-key",
    VAPID_PRIVATE_KEY: "test-vapid-private-key",
    CRON_SECRET: "test-cron-secret",
    GITHUB_CLIENT_ID: "test-github-client-id",
    GITHUB_CLIENT_SECRET: "test-github-client-secret",
  };

  const merged = { ...defaults, ...vars };
  const original: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(merged)) {
    original[key] = process.env[key];
    process.env[key] = value;
  }

  return () => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}
