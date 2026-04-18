# Plan 4 — Frontend (Detailed)

## A. Context

Implements the full React 18 + TypeScript + Vite SPA for the Mini Campaign Manager. Builds on the scaffold from Plan 1 (config files, package.json, Vite proxy). Key decisions:
- **Recipients on create form:** Email tag input — user types email tags; each is auto-created via `POST /recipient` on submit (409 → fetch existing by email)
- **Pagination:** Infinite scroll using `useInfiniteQuery` + `IntersectionObserver`
- **UI library:** shadcn/ui (Radix UI primitives + Tailwind)
- **Sending badge:** Yellow/amber

**API base URL:** All API calls use `/api/*` (Vite dev proxy strips `/api` → `http://localhost:3000`; nginx does the same in production)

---

## B. File Execution Order

Execute in this order to avoid missing imports:
1. `package.json` (add shadcn deps)
2. `components.json`, `tailwind.config.ts`, `src/index.css`
3. `src/lib/utils.ts`
4. `src/components/ui/*` (8 files)
5. `src/types/index.ts`
6. `src/store/authStore.ts`
7. `src/api/client.ts`
8. `src/api/auth.ts`, `campaigns.ts`, `recipients.ts`
9. `src/components/StatusBadge.tsx`, `StatsBar.tsx`, `SkeletonCard.tsx`, `EmailTagInput.tsx`
10. `src/pages/LoginPage.tsx`, `CampaignListPage.tsx`, `CampaignNewPage.tsx`, `CampaignDetailPage.tsx`
11. `src/App.tsx`
12. `src/main.tsx` (replace stub)
13. `docs/frontend.md`, `docs/index.md`

---

## C. File-by-File Changes

---

### File 1 — `packages/client/package.json` (MODIFY)

Replace with the complete file adding shadcn/ui peer deps:

```json
{
  "name": "@campaign/client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "echo 'No client tests' && exit 0"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-slot": "^1.0.2",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.344.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "tailwind-merge": "^2.2.0",
    "tailwindcss-animate": "^1.0.7",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

---

### File 2 — `packages/client/components.json` (CREATE)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

---

### File 3 — `packages/client/tailwind.config.ts` (MODIFY)

Replace with shadcn-compatible config adding `darkMode`, CSS variable color tokens, and `tailwindcss-animate` plugin:

```typescript
import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [animate],
}

export default config
```

---

### File 4 — `packages/client/src/index.css` (MODIFY)

Replace with Tailwind directives + shadcn CSS variables:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

---

### File 5 — `packages/client/src/lib/utils.ts` (CREATE)

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

### File 6 — `packages/client/src/components/ui/badge.tsx` (CREATE)

```tsx
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
```

---

### File 7 — `packages/client/src/components/ui/button.tsx` (CREATE)

```tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

---

### File 8 — `packages/client/src/components/ui/dialog.tsx` (CREATE)

```tsx
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger,
  DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
}
```

---

### File 9 — `packages/client/src/components/ui/input.tsx` (CREATE)

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
```

---

### File 10 — `packages/client/src/components/ui/label.tsx` (CREATE)

```tsx
import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const labelVariants = cva('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70')

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
```

---

### File 11 — `packages/client/src/components/ui/textarea.tsx` (CREATE)

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }
```

---

### File 12 — `packages/client/src/components/ui/skeleton.tsx` (CREATE)

```tsx
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}

export { Skeleton }
```

---

### File 13 — `packages/client/src/components/ui/progress.tsx` (CREATE)

```tsx
import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
```

---

### File 14 — `packages/client/src/types/index.ts` (CREATE)

```typescript
export interface AuthUser {
  id: string
  email: string
  name: string
}

export interface AuthResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  name: string
  password: string
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent'

export interface Recipient {
  id: string
  email: string
  name: string
  created_at: string
  CampaignRecipient?: {
    status: 'pending' | 'sent' | 'failed'
    sent_at: string | null
    opened_at: string | null
  }
}

export interface Campaign {
  id: string
  name: string
  subject: string
  body: string
  status: CampaignStatus
  scheduled_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  Recipients?: Recipient[]
}

export interface CreateCampaignPayload {
  name: string
  subject: string
  body: string
  recipientIds?: string[]
}

export interface UpdateCampaignPayload {
  name?: string
  subject?: string
  body?: string
}

export interface ScheduleCampaignPayload {
  scheduled_at: string
}

export interface CampaignStats {
  total: number
  sent: number
  failed: number
  opened: number
  open_rate: number
  send_rate: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}

export interface CreateRecipientPayload {
  email: string
  name: string
}

export interface RecipientTag {
  email: string
  name: string
}

export interface ApiError {
  error: string
  details?: Record<string, unknown>
}
```

---

### File 15 — `packages/client/src/store/authStore.ts` (CREATE)

In-memory only — no localStorage. Stores both tokens and user object.

```typescript
import { create } from 'zustand'
import type { AuthUser } from '@/types'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  setAuth: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
  setAccessToken: (token) => set({ accessToken: token }),
  clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
}))
```

---

### File 16 — `packages/client/src/api/client.ts` (CREATE)

On 401: attempt token refresh with the stored `refreshToken`. If refresh succeeds, update `accessToken` in store and retry the original request once (guarded by `_retry` flag). If refresh fails, call `clearAuth()` and redirect to `/login` via `window.location.replace`.

```typescript
import axios, { type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

interface RetryConfig extends AxiosRequestConfig {
  _retry?: boolean
}

export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers = config.headers ?? {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryConfig

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = useAuthStore.getState().refreshToken

      if (refreshToken) {
        try {
          const { data } = await axios.post<{ accessToken: string }>(
            '/api/auth/refresh',
            { refreshToken },
          )
          useAuthStore.getState().setAccessToken(data.accessToken)
          originalRequest.headers = originalRequest.headers ?? {}
          originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`
          return apiClient(originalRequest)
        } catch {
          // Refresh failed — fall through to logout
        }
      }

      useAuthStore.getState().clearAuth()
      window.location.replace('/login')
    }

    return Promise.reject(error)
  },
)
```

---

### File 17 — `packages/client/src/api/auth.ts` (CREATE)

```typescript
import { apiClient } from './client'
import type { AuthResponse, LoginPayload, RegisterPayload } from '@/types'

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', payload)
  return data
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', payload)
  return data
}
```

---

### File 18 — `packages/client/src/api/campaigns.ts` (CREATE)

```typescript
import { apiClient } from './client'
import type {
  Campaign,
  CampaignStats,
  CreateCampaignPayload,
  PaginatedResponse,
  ScheduleCampaignPayload,
  UpdateCampaignPayload,
} from '@/types'

export async function listCampaigns(page: number): Promise<PaginatedResponse<Campaign>> {
  const { data } = await apiClient.get<PaginatedResponse<Campaign>>('/campaigns', { params: { page } })
  return data
}

export async function getCampaign(id: string): Promise<Campaign> {
  const { data } = await apiClient.get<Campaign>(`/campaigns/${id}`)
  return data
}

export async function createCampaign(payload: CreateCampaignPayload): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>('/campaigns', payload)
  return data
}

export async function updateCampaign(id: string, payload: UpdateCampaignPayload): Promise<Campaign> {
  const { data } = await apiClient.patch<Campaign>(`/campaigns/${id}`, payload)
  return data
}

export async function deleteCampaign(id: string): Promise<void> {
  await apiClient.delete(`/campaigns/${id}`)
}

export async function scheduleCampaign(id: string, payload: ScheduleCampaignPayload): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>(`/campaigns/${id}/schedule`, payload)
  return data
}

export async function sendCampaign(id: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(`/campaigns/${id}/send`)
  return data
}

export async function getCampaignStats(id: string): Promise<CampaignStats> {
  const { data } = await apiClient.get<CampaignStats>(`/campaigns/${id}/stats`)
  return data
}
```

---

### File 19 — `packages/client/src/api/recipients.ts` (CREATE)

`getOrCreateRecipient`: tries `POST /recipient`; on 409 fetches all recipients and returns the match by email.

```typescript
import { apiClient } from './client'
import type { CreateRecipientPayload, Recipient } from '@/types'

export async function listRecipients(): Promise<Recipient[]> {
  const { data } = await apiClient.get<{ data: Recipient[] }>('/recipients')
  return data.data
}

export async function createRecipient(payload: CreateRecipientPayload): Promise<Recipient> {
  const { data } = await apiClient.post<Recipient>('/recipient', payload)
  return data
}

export async function getOrCreateRecipient(payload: CreateRecipientPayload): Promise<Recipient> {
  try {
    return await createRecipient(payload)
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 409) {
      const all = await listRecipients()
      const existing = all.find((r) => r.email.toLowerCase() === payload.email.toLowerCase())
      if (existing) return existing
    }
    throw err
  }
}
```

---

### File 20 — `packages/client/src/components/StatusBadge.tsx` (CREATE)

Uses Badge `className` override for status-specific colors (not shadcn variants).

```tsx
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CampaignStatus } from '@/types'

const STATUS_CONFIG: Record<CampaignStatus, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'border-transparent bg-slate-200 text-slate-700 hover:bg-slate-200' },
  scheduled: { label: 'Scheduled', className: 'border-transparent bg-blue-100 text-blue-700 hover:bg-blue-100' },
  sending:   { label: 'Sending',   className: 'border-transparent bg-amber-100 text-amber-700 hover:bg-amber-100' },
  sent:      { label: 'Sent',      className: 'border-transparent bg-green-100 text-green-700 hover:bg-green-100' },
}

interface StatusBadgeProps {
  status: CampaignStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  return <Badge className={cn(config.className, className)}>{config.label}</Badge>
}
```

---

### File 21 — `packages/client/src/components/StatsBar.tsx` (CREATE)

`ratio` is a 0–1 decimal (API returns `open_rate: 0.72`, etc.).

```tsx
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface StatsBarProps {
  label: string
  ratio: number
  className?: string
}

export function StatsBar({ label, ratio, className }: StatsBarProps) {
  const pct = Math.round(ratio * 100)
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  )
}
```

---

### File 22 — `packages/client/src/components/SkeletonCard.tsx` (CREATE)

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-72" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  )
}
```

---

### File 23 — `packages/client/src/components/EmailTagInput.tsx` (CREATE)

Key behaviors:
- Enter or comma adds tag; email validated with regex; name derived from email prefix
- Backspace on empty input removes last tag
- Duplicate emails rejected with inline error
- Parent reads `value: RecipientTag[]` and calls `getOrCreateRecipient` for each on submit

```tsx
import { useState, useRef, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecipientTag } from '@/types'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface EmailTagInputProps {
  value: RecipientTag[]
  onChange: (tags: RecipientTag[]) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function EmailTagInput({
  value,
  onChange,
  className,
  placeholder = 'Type email and press Enter',
  disabled = false,
}: EmailTagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (raw: string) => {
    const email = raw.trim().replace(/,$/, '').trim().toLowerCase()
    if (!email) return
    if (!EMAIL_REGEX.test(email)) {
      setError(`"${email}" is not a valid email address`)
      return
    }
    if (value.some((t) => t.email === email)) {
      setError(`"${email}" is already added`)
      return
    }
    const name = email.split('@')[0]
    setError(null)
    onChange([...value, { email, name }])
    setInputValue('')
  }

  const removeTag = (email: string) => onChange(value.filter((t) => t.email !== email))

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const handleBlur = () => {
    if (inputValue.trim()) addTag(inputValue)
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        className={cn(
          'flex min-h-[42px] w-full flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag.email}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
          >
            {tag.email}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(tag.email) }}
                className="ml-0.5 rounded-full hover:text-destructive focus:outline-none"
                aria-label={`Remove ${tag.email}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setError(null) }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[160px] bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
```

---

### File 24 — `packages/client/src/pages/LoginPage.tsx` (CREATE)

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import type { ApiError } from '@/types'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await login({ email, password })
      setAuth(result.user, result.accessToken, result.refreshToken)
      navigate('/campaigns', { replace: true })
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: ApiError } })?.response?.data
      setError(apiErr?.error ?? 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Campaign Manager</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

---

### File 25 — `packages/client/src/pages/CampaignListPage.tsx` (CREATE)

Infinite scroll via `useInfiniteQuery` + `IntersectionObserver` on a sentinel `<div>` at the bottom.

```tsx
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { SkeletonCard } from '@/components/SkeletonCard'
import { listCampaigns } from '@/api/campaigns'
import type { Campaign } from '@/types'

export default function CampaignListPage() {
  const sentinelRef = useRef<HTMLDivElement>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['campaigns'],
    queryFn: ({ pageParam }) => listCampaigns(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination
      return page < totalPages ? page + 1 : undefined
    },
  })

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const campaigns: Campaign[] = data?.pages.flatMap((page) => page.data) ?? []

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Button asChild size="sm">
          <Link to="/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      {isError && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load campaigns: {(error as { message?: string })?.message ?? 'Unknown error'}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No campaigns yet.</p>
          <Button asChild variant="link" className="mt-2">
            <Link to="/campaigns/new">Create your first campaign</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              to={`/campaigns/${campaign.id}`}
              className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <p className="font-medium truncate">{campaign.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{campaign.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(campaign.created_at).toLocaleDateString()} ·{' '}
                    {campaign.Recipients?.length ?? 0} recipient
                    {campaign.Recipients?.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <StatusBadge status={campaign.status} className="shrink-0" />
              </div>
            </Link>
          ))}

          <div ref={sentinelRef} className="h-4" />

          {isFetchingNextPage && (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!hasNextPage && campaigns.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-2">All campaigns loaded</p>
          )}
        </div>
      )}
    </div>
  )
}
```

---

### File 26 — `packages/client/src/pages/CampaignNewPage.tsx` (CREATE)

Resolves recipient tags in parallel via `getOrCreateRecipient` before calling `createCampaign`.

```tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EmailTagInput } from '@/components/EmailTagInput'
import { createCampaign } from '@/api/campaigns'
import { getOrCreateRecipient } from '@/api/recipients'
import type { RecipientTag, ApiError } from '@/types'

export default function CampaignNewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<RecipientTag[]>([])
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)

  const mutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: (campaign) => {
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      navigate(`/campaigns/${campaign.id}`)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    let recipientIds: string[] = []

    if (tags.length > 0) {
      setResolving(true)
      try {
        const results = await Promise.all(tags.map(getOrCreateRecipient))
        recipientIds = results.map((r) => r.id)
      } catch (err: unknown) {
        const apiErr = (err as { response?: { data?: ApiError } })?.response?.data
        setError(apiErr?.error ?? 'Failed to resolve recipients. Please try again.')
        setResolving(false)
        return
      } finally {
        setResolving(false)
      }
    }

    mutation.mutate(
      { name, subject, body, recipientIds },
      {
        onError: (err: unknown) => {
          const apiErr = (err as { response?: { data?: ApiError } })?.response?.data
          setError(apiErr?.error ?? 'Failed to create campaign.')
        },
      },
    )
  }

  const isSubmitting = resolving || mutation.isPending

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/campaigns"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">New Campaign</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Campaign name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} placeholder="Summer Sale Announcement" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="subject">Email subject</Label>
          <Input id="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} disabled={isSubmitting} placeholder="Don't miss our biggest sale of the year" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="body">Email body</Label>
          <Textarea id="body" required value={body} onChange={(e) => setBody(e.target.value)} disabled={isSubmitting} placeholder="Write your email content here…" className="min-h-[160px]" />
        </div>

        <div className="space-y-1.5">
          <Label>
            Recipients{' '}
            <span className="text-muted-foreground font-normal">(optional — add emails, press Enter)</span>
          </Label>
          <EmailTagInput value={tags} onChange={setTags} disabled={isSubmitting} />
          {tags.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {tags.length} recipient{tags.length !== 1 ? 's' : ''} added
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/campaigns')} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create Campaign'}</Button>
        </div>
      </form>
    </div>
  )
}
```

---

### File 27 — `packages/client/src/pages/CampaignDetailPage.tsx` (CREATE)

Key details:
- `refetchInterval` on both campaign and stats queries returns `3000` when `status === 'sending'`, `false` otherwise
- Schedule modal: `datetime-local` input with `min` set to now+1min; client-side validates future date before API call
- Action buttons: Schedule (draft only), Send (draft or scheduled), Delete (draft only)
- After delete: navigate to `/campaigns`

```tsx
import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Calendar, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/StatusBadge'
import { StatsBar } from '@/components/StatsBar'
import {
  getCampaign, deleteCampaign, scheduleCampaign, sendCampaign, getCampaignStats,
} from '@/api/campaigns'
import type { ApiError } from '@/types'

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: campaign, isLoading, isError } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => getCampaign(id!),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === 'sending' ? 3000 : false,
  })

  const { data: stats } = useQuery({
    queryKey: ['campaign-stats', id],
    queryFn: () => getCampaignStats(id!),
    enabled: !!id,
    refetchInterval: () => {
      const cam = queryClient.getQueryData<typeof campaign>(['campaign', id])
      return cam?.status === 'sending' ? 3000 : false
    },
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['campaign', id] })
    void queryClient.invalidateQueries({ queryKey: ['campaign-stats', id] })
    void queryClient.invalidateQueries({ queryKey: ['campaigns'] })
  }

  const deleteMutation = useMutation({
    mutationFn: () => deleteCampaign(id!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      navigate('/campaigns', { replace: true })
    },
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: ApiError } })?.response?.data
      setActionError(apiErr?.error ?? 'Failed to delete campaign.')
    },
  })

  const scheduleMutation = useMutation({
    mutationFn: (scheduled_at: string) => scheduleCampaign(id!, { scheduled_at }),
    onSuccess: () => {
      setScheduleOpen(false)
      setScheduledAt('')
      setScheduleError(null)
      invalidate()
    },
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: ApiError } })?.response?.data
      setScheduleError(apiErr?.error ?? 'Failed to schedule campaign.')
    },
  })

  const sendMutation = useMutation({
    mutationFn: () => sendCampaign(id!),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: ApiError } })?.response?.data
      setActionError(apiErr?.error ?? 'Failed to initiate send.')
    },
  })

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setScheduleError(null)
    const selected = new Date(scheduledAt)
    if (isNaN(selected.getTime()) || selected <= new Date()) {
      setScheduleError('Scheduled time must be in the future.')
      return
    }
    scheduleMutation.mutate(selected.toISOString())
  }

  const isDraft = campaign?.status === 'draft'
  const isScheduled = campaign?.status === 'scheduled'
  const isSending = campaign?.status === 'sending'

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isError || !campaign) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-destructive">Campaign not found or failed to load.</p>
        <Button variant="link" asChild>
          <Link to="/campaigns">Back to campaigns</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/campaigns"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-sm text-muted-foreground">{campaign.subject}</p>
          </div>
        </div>
        <StatusBadge status={campaign.status} className="mt-1 shrink-0" />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {isDraft && (
          <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)} disabled={scheduleMutation.isPending}>
            <Calendar className="mr-2 h-4 w-4" />Schedule
          </Button>
        )}
        {(isDraft || isScheduled) && (
          <Button size="sm" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || isSending}>
            <Send className="mr-2 h-4 w-4" />
            {sendMutation.isPending ? 'Sending…' : 'Send Now'}
          </Button>
        )}
        {isDraft && (
          <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        )}
      </div>

      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>
      )}

      {/* Scheduled time */}
      {campaign.scheduled_at && (
        <div className="rounded-md border px-4 py-3 text-sm">
          <span className="text-muted-foreground">Scheduled for: </span>
          <span className="font-medium">{new Date(campaign.scheduled_at).toLocaleString()}</span>
        </div>
      )}

      {/* Body */}
      <div className="rounded-md border bg-muted/30 px-4 py-4">
        <p className="text-sm font-medium mb-2 text-muted-foreground">Email Body</p>
        <p className="text-sm whitespace-pre-wrap">{campaign.body}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="rounded-lg border p-4 space-y-4">
          <h2 className="font-semibold text-sm">Statistics</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div><span className="text-muted-foreground">Total: </span><span className="font-medium">{stats.total}</span></div>
            <div><span className="text-muted-foreground">Sent: </span><span className="font-medium">{stats.sent}</span></div>
            <div><span className="text-muted-foreground">Failed: </span><span className="font-medium">{stats.failed}</span></div>
            <div><span className="text-muted-foreground">Opened: </span><span className="font-medium">{stats.opened}</span></div>
          </div>
          <StatsBar label="Send Rate" ratio={stats.send_rate} />
          <StatsBar label="Open Rate" ratio={stats.open_rate} />
        </div>
      )}

      {/* Recipient table */}
      {campaign.Recipients && campaign.Recipients.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-sm">Recipients ({campaign.Recipients.length})</h2>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {campaign.Recipients.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2">{r.email}</td>
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2">
                      <span className={
                        r.CampaignRecipient?.status === 'sent' ? 'text-green-600' :
                        r.CampaignRecipient?.status === 'failed' ? 'text-destructive' :
                        'text-muted-foreground'
                      }>
                        {r.CampaignRecipient?.status ?? 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {r.CampaignRecipient?.sent_at
                        ? new Date(r.CampaignRecipient.sent_at).toLocaleString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule Campaign</DialogTitle>
            <DialogDescription>Choose a future date and time to send this campaign.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="scheduled_at">Date &amp; Time</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => { setScheduledAt(e.target.value); setScheduleError(null) }}
                min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
              />
            </div>
            {scheduleError && <p className="text-xs text-destructive">{scheduleError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setScheduleOpen(false); setScheduleError(null) }} disabled={scheduleMutation.isPending}>Cancel</Button>
              <Button type="submit" disabled={scheduleMutation.isPending}>
                {scheduleMutation.isPending ? 'Scheduling…' : 'Schedule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

---

### File 28 — `packages/client/src/App.tsx` (CREATE)

```tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import LoginPage from '@/pages/LoginPage'
import CampaignListPage from '@/pages/CampaignListPage'
import CampaignNewPage from '@/pages/CampaignNewPage'
import CampaignDetailPage from '@/pages/CampaignDetailPage'

function PrivateRoute() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const location = useLocation()

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<PrivateRoute />}>
        <Route path="/campaigns" element={<CampaignListPage />} />
        <Route path="/campaigns/new" element={<CampaignNewPage />} />
        <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/campaigns" replace />} />
      <Route path="*" element={<Navigate to="/campaigns" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
```

---

### File 29 — `packages/client/src/main.tsx` (MODIFY)

Replace stub with full provider tree:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
```

---

### File 30 — `docs/frontend.md` (CREATE)

Document component tree, routing table, auth flow, infinite scroll strategy, polling behavior, email tag input flow, and the status state machine with action availability table.

Key sections:
- **Tech Stack** table (React 18, Vite 5, Tailwind+shadcn, Zustand, TanStack Query v5, Axios, React Router v6)
- **Component Tree** (ASCII diagram showing QueryClientProvider → App → PrivateRoute → pages → components)
- **Routing Table** (path, component, auth guard)
- **Auth Flow** (numbered steps: login → setAuth → interceptor → 401 refresh → clearAuth redirect)
- **Infinite Scroll** (useInfiniteQuery + IntersectionObserver sentinel pattern)
- **Polling** (refetchInterval on status=sending)
- **EmailTagInput** (Enter/comma adds tag, name from email prefix, getOrCreateRecipient on submit)
- **Status State Machine** (draft→scheduled→sending→sent) with action availability table

---

### File 31 — `docs/index.md` (MODIFY)

Add to Task Routing table:

```
| Frontend tasks | `docs/frontend.md` | `packages/client/src/` |
```

Add Feature Documentation section:

```
## Feature Documentation

| File | Covers |
|------|--------|
| `docs/frontend.md` | React SPA architecture, routing, auth flow, component tree, polling, infinite scroll |
```

---

## D. Verification Steps

1. `docker compose up` — all containers start
2. Open `http://localhost` → redirected to `/login`
3. Login with seed credentials → redirected to `/campaigns`
4. Campaign list shows cards with color-coded status badges; scroll to bottom triggers loading next page
5. Click draft campaign → detail page shows Schedule, Send Now, Delete buttons
6. Click Schedule → modal opens with datetime-local input; past date shows validation error; future date schedules campaign (badge → blue)
7. Click Send Now → badge transitions to yellow (sending), then auto-refreshes to green (sent); stats bars update
8. Navigate to `/campaigns/new` → fill form, add emails via tag input, submit → redirected to new campaign detail
9. Delete a draft campaign → redirected to list, campaign gone
10. Manually clear Zustand store (devtools) → navigating to `/campaigns` redirects to `/login`
