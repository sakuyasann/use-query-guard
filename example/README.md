
# useSearchParams

ルータに依存しない **URL クエリ文字列管理フック**。
React‑Router、Next.js、Remix、純粋な SPA など、どこでも同じコードで **取得・検証（Zod）・更新** が行えます。

---

## 特長

- **ルータ非依存**
  デフォルトは `window.history` を直接操作。アダプタを差し替えれば任意のルータに対応。
- **Zod で型安全バリデーション**
  `z.object()` を渡せば `data` がその型で返却。`"42"` → `42` など自動型変換も内蔵。
- **型安全な更新 API**
  `updateParams()` はスキーマに定義したキーのみ受け付け、型も `string｜number｜boolean｜null` に制限。
- **`null` でキー削除**
  `undefined` は「変更なし」、`null` はキーを削除。
- **SSR セーフ**
  `typeof window` チェックで Node 実行時も安全。

---

## インストール

```bash
pnpm add zod             # または npm / yarn
# フック本体は src/hooks/useSearchParams.ts にコピペ
```

依存：**React 18+** と **Zod 3+** のみ。

---

## 使い方

```tsx
import { useSearchParams } from '@/hooks/useSearchParams'
import { z } from 'zod'

const schema = z.object({
  page: z.number(),
  q:    z.string().optional(),
  vip:  z.boolean(),
})

export default function Products() {
  const { data, isReady, isError, updateParams } =
    useSearchParams({ resolver: schema })

  if (!isReady) return null
  if (isError)  return <p>URL パラメータが不正です</p>

  return (
    <>
      <pre>{JSON.stringify(data, null, 2)}</pre>

      <button onClick={() => updateParams({ page: (data.page ?? 1) + 1 })}>
        次のページ
      </button>

      <button onClick={() => updateParams({ q: null })}>
        検索ワードをクリア
      </button>
    </>
  )
}
```

### 戻り値

| プロパティ | 型 | 説明 |
| ---------- | --- | --- |
| `data` | **resolver なし**: `Record<string, string \| undefined>`<br>**resolver あり**: `{ [K in keyof Schema]?: 型 }` | 解析結果。スキーマのキーは必ず存在するが値は `undefined` の可能性あり。 |
| `isReady` | `boolean` | URL 読み取りが 1 度でも完了すると `true`。 |
| `isError` | `boolean` | `safeParse` が失敗すると `true`。 |
| `updateParams` | `(params) => void` | クエリを追加・更新・削除。 |

#### `updateParams()` の値ルール

| 値 | 挙動 |
| --- | --- |
| `string` / `number` / `boolean` | `String()` 変換してセット |
| `null` または `''` | 該当キーを削除 |
| キー自体を渡さない | そのキーは変更しない |

---

## 任意ルータへのアダプタ例（Next.js）

```ts
import { useRouter, useSearchParams as nextSP } from 'next/navigation'
import type { SearchParamsAdapter } from '@/hooks/useSearchParams'

export const nextAdapter = (): SearchParamsAdapter => {
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

// 利用例
const { data } = useSearchParams({
  resolver: schema,
  adapter: nextAdapter(),
})
```

---

## API 型定義（抜粋）

```ts
function useSearchParams<
  S extends z.ZodObject<z.ZodRawShape> | undefined = undefined
>(options?: {
  resolver?: S
  preprocess?: (
    key: S extends z.ZodObject<any> ? keyof z.infer<S> & string : string,
    value: string
  ) => string
  adapter?: SearchParamsAdapter
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

## 実装ポイント

- `useSyncExternalStore` で `popstate` を購読し Concurrent Mode でも安定。
- 型変換は現在 **Number** のみ。`ZodBoolean` 等を追加したい場合は
  `instanceof ZodBoolean` 判定を加えるだけ。
- `null` 削除によりデフォルト `undefined` が誤って削除される事故を防止。

---

## ライセンス

MIT
