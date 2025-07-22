
# useQueryGuard

A **router‑agnostic query‑string management hook** for React.
Read, validate, and update URL parameters in **React‑Router, Next.js, Remix, or any vanilla SPA** with one shared API.

---

## Features

- **Router‑free core**
  Uses `window.history` by default. Inject a custom *adapter* to integrate any router.
- **Type‑safe validation with Zod**
  Pass a `z.object()` schema and `data` is returned with that exact type. Automatic coercion (`"42"` → `42`, etc.) included.
- **Safe updates**
  `updateParams()` only accepts keys declared in the schema (if provided) and values of type `string | number | boolean | null`.
- **`null` to delete keys**
  `undefined` means "leave unchanged"; `null` removes the key from the URL.
- **SSR friendly**
  All browser APIs wrapped in `typeof window` checks.

---

## Installation

```bash
npm install use-query-guard zod
# or
pnpm add use-query-guard zod
# or
yarn add use-query-guard zod
```

**Alternative**: Copy the hook code directly to your project:
```bash
# Copy the hook code to src/hooks/useSearchParams.ts
```

Dependencies: **React 18+** and **Zod 3+** only.

---

## Quick start

```tsx
import { useQueryGuard } from 'use-query-guard'
import { z } from 'zod'

const schema = z.object({
  page: z.number(),
  q:    z.string().optional(),
  vip:  z.boolean(),
})

export default function Products() {
  const { data, isReady, isError, updateParams } =
    useQueryGuard({ resolver: schema })

  if (!isReady) return null
  if (isError)  return <p>Invalid query string</p>

  return (
    <>
      <pre>{JSON.stringify(data, null, 2)}</pre>

      <button onClick={() => updateParams({ page: (data.page ?? 1) + 1 })}>
        Next page
      </button>

      <button onClick={() => updateParams({ q: null })}>
        Clear search
      </button>
    </>
  )
}
```

### Returned object

| key | type | description |
| --- | --- | --- |
| `data` | **without resolver**: `Record<string, string \| undefined>`<br>**with resolver**: `{ [K in keyof Schema]?: Type }` | Parsed & coerced data. All schema keys exist but values may be `undefined`. |
| `isReady` | `boolean` | `true` after the first read of the URL. |
| `isError` | `boolean` | `true` if `safeParse` failed. |
| `updateParams` | `(params) => void` | Add / update / delete query keys. |

#### `updateParams()` value rules

| value | effect |
| --- | --- |
| `string` / `number` / `boolean` | Converted with `String()` and set in URL |
| `null` or `''` | Deletes the key |
| omit key | Leaves that key unchanged |

---

## Adapter example (Next.js)

```ts
import { useRouter, useSearchParams as nextSP } from 'next/navigation'
import type { QueryGuardAdapter } from 'use-query-guard'

export const nextAdapter = (): QueryGuardAdapter => {
  const router = useRouter()
  const current = nextSP()

  return {
    getSearch: () => '?' + current.toString(),
    setSearch: qs => router.push(qs ? '?' + qs : '?'),
    subscribe: cb => {
      window.addEventListener('popstate', cb)
      return () => window.removeEventListener('popstate', cb)
    },
  }
}

// Usage
const { data } = useQueryGuard({
  resolver: schema,
  adapter: nextAdapter(),
})
```

---

## API (excerpt)

```ts
function useQueryGuard<
  S extends z.ZodObject<z.ZodRawShape> | undefined = undefined
>(options?: {
  resolver?: S
  preprocess?: (
    key: S extends z.ZodObject<any> ? keyof z.infer<S> & string : string,
    value: string
  ) => string
  adapter?: QueryGuardAdapter
}): {
  data: S extends z.ZodObject<any>
    ? { [K in keyof z.infer<S>]?: z.infer<S>[K] }
    : Record<string, string | undefined>
  isReady: boolean
  isError: boolean
  updateParams: (p: UpdateArgs<S>) => void
}
```

---

## License

MIT
