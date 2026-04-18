# Frontend — React SPA

## Tech stack

| Layer | Choice |
|--------|--------|
| Runtime | React 18 |
| Build | Vite 5, TypeScript 5 |
| Styling | Tailwind CSS 3, shadcn/ui (Radix primitives + CVA) |
| Server state | TanStack Query v5 |
| Client state | Zustand (auth tokens + user, in-memory only) |
| HTTP | Axios (`/api` base URL; Vite proxy strips prefix in dev) |
| Routing | React Router v6 |

## Component tree

```
QueryClientProvider (main.tsx)
└── App (BrowserRouter)
    └── Routes
        ├── /login → LoginPage
        └── PrivateRoute (Outlet)
            ├── /campaigns → CampaignListPage
            ├── /campaigns/new → CampaignNewPage
            └── /campaigns/:id → CampaignDetailPage
```

Shared UI: `components/ui/*` (shadcn). Feature components: `StatusBadge`, `StatsBar`, `SkeletonCard`, `EmailTagInput`.

## Routing

| Path | Component | Auth |
|------|-------------|------|
| `/login` | `LoginPage` | Public |
| `/campaigns` | `CampaignListPage` | Required |
| `/campaigns/new` | `CampaignNewPage` | Required |
| `/campaigns/:id` | `CampaignDetailPage` | Required |
| `/`, unknown | Redirect to `/campaigns` (then guard sends to `/login` if unauthenticated) | — |

## Auth flow

1. User submits credentials on `LoginPage`; `login()` posts to `/api/auth/login`.
2. On success, `useAuthStore.setAuth(user, accessToken, refreshToken)` runs; user is sent to `/campaigns`.
3. `apiClient` request interceptor attaches `Authorization: Bearer <accessToken>`.
4. On `401`, the response interceptor posts `/api/auth/refresh` with the stored refresh token (plain `axios`, not `apiClient`, to avoid recursion).
5. If refresh succeeds, `setTokens(accessToken, refreshToken)` updates both tokens (rotation) and the original request is retried once (`_retry` flag).
6. If refresh fails or no refresh token exists, `clearAuth()` runs and `window.location.replace('/login')` runs.

## Infinite scroll (campaign list)

`CampaignListPage` uses `useInfiniteQuery` with `pageParam` starting at `1` and `getNextPageParam` derived from `pagination.totalPages`. A sentinel `div` at the bottom is observed with `IntersectionObserver` (`threshold: 0.1`); when visible and `hasNextPage` and not `isFetchingNextPage`, it calls `fetchNextPage()`.

## Polling while sending

`CampaignDetailPage` uses `useQuery` for the campaign with `refetchInterval: (q) => (q.state.data?.status === 'sending' ? 3000 : false)`. The stats query uses the same three-second interval when the cached campaign’s status is `sending`, via `queryClient.getQueryData(['campaign', id])`.

## Email tag input and recipients

`EmailTagInput` keeps local tags (`RecipientTag`: email + name from local-part). On create submit, `getOrCreateRecipient` runs in parallel for each tag: `POST /api/recipients`; on `409`, the client lists recipients and picks the row matching email (case-insensitive), then passes `recipientIds` into `POST /api/campaigns`.

## Campaign status and actions

```
draft ──schedule──▶ scheduled ──send──▶ sending ──(async)──▶ sent
```

| Status | Schedule | Send | Delete |
|--------|----------|------|--------|
| draft | Yes | Yes | Yes |
| scheduled | No | Yes | No |
| sending | No | No | No |
| sent | No | No | No |

The **Sending** badge uses amber styling (`StatusBadge`).

## API shapes

- Paginated campaigns include `recipient_count` from the server for list cards.
- `GET /campaigns/:id` returns `recipients` (Sequelize alias) with optional `CampaignRecipient` join attributes for per-recipient send state.
