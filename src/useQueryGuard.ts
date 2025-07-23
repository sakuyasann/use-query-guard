import { useCallback, useMemo, useReducer, useSyncExternalStore } from 'react'
import z, { ZodNumber, ZodObject, type ZodRawShape } from 'zod'

/* ------------------------------------------------------------------ */
/* 追加ユーティリティ：URL に載せられる値型へマッピング              */
/* ------------------------------------------------------------------ */
type Paramifiable<T> =
  | (T extends string ? string : never)
  | (T extends number ? number : never)
  | (T extends boolean ? boolean : never)
  | string // fallback (未知の型 → 文字列扱い)
  | null // ← 削除フラグ

/* ------------------------------------------------------------------ */
/* updateParams に渡せる引数型                                        */
/* ------------------------------------------------------------------ */
type UpdateArgs<Schema> =
  Schema extends ZodObject<ZodRawShape>
    ? Partial<{
        [K in keyof z.infer<Schema>]: Paramifiable<z.infer<Schema>[K]>
      }>
    : Record<string, string | number | boolean | null>

/* ------------------------------------------------------------------ */
/* 1. URL 操作を差し替えられる “アダプタ” を定義                      */
/* ------------------------------------------------------------------ */

export interface QueryGuardAdapter {
  /** 現在の search 部分 (`?foo=1&bar=2`) を返す */
  getSearch(): string
  /** search を pushState/replaceState 相当で更新する */
  setSearch(next: string): void
  /** `popstate` 等を購読し、変化時にコールバックを呼ぶ */
  subscribe(cb: () => void): () => void
}

/* --- デフォルト実装（window + History API 直接） --- */
const browserAdapter: QueryGuardAdapter = {
  getSearch: () =>
    typeof window === 'undefined' ? '' : window.location.search,
  setSearch: (next) => {
    if (typeof window === 'undefined') return
    const url =
      window.location.pathname +
      (next.startsWith('?') || next === '' ? next : `?${next}`) +
      window.location.hash
    window.history.pushState(null, '', url)
    /* pushState では popstate が発火しないので自前で */
    window.dispatchEvent(new Event('popstate'))
  },
  subscribe: (cb) => {
    if (typeof window === 'undefined') return () => {}
    window.addEventListener('popstate', cb)
    return () => window.removeEventListener('popstate', cb)
  },
}

/* ------------------------------------------------------------------ */
/* 2. ユーティリティ型                                                  */
/* ------------------------------------------------------------------ */

type Optionalise<T> = { [K in keyof T]: T[K] | undefined }

/**
 * SearchParamsOptions
 * -------------------
 * resolver:  z.object() スキーマ（無ければゆるい string 辞書）
 * preprocess: 読み込み時に key/value を加工
 * adapter:   URL 操作をフレームワークに合わせて差し替え
 */
export type QueryGuardOptions<
  Schema extends ZodObject<ZodRawShape> | undefined = undefined,
> = {
  resolver?: Schema
  preprocess?: Schema extends ZodObject<ZodRawShape>
    ? (key: keyof z.infer<Schema> & string, value: string) => string
    : (key: string, value: string) => string
  adapter?: QueryGuardAdapter
  mode?: 'strict' | 'pick'
}

/* ------------------------------------------------------------------ */
/* 3. メインフック                                                      */
/* ------------------------------------------------------------------ */

export function useQueryGuard<
  Schema extends ZodObject<ZodRawShape> | undefined = undefined,
>(options?: QueryGuardOptions<Schema>) {
  const {
    resolver,
    preprocess,
    adapter = browserAdapter,
    mode = 'pick',
  } = options ?? {}

  /* -- URL 変化購読 (`useSyncExternalStore` で安定) -- */
  const search = useSyncExternalStore(
    adapter.subscribe,
    adapter.getSearch,
    () => ''
  )

  /* --- ready 判定 (初回読込後 true) --- */
  const [isReady, setReadyTrue] = useReducer(() => true, false)

  /* ----------------------------------------------------------------
   * URLSearchParams → オブジェクト化＆前処理＆Zod 検証
   * ---------------------------------------------------------------- */
  const { data, isError } = useMemo(() => {
    /* 1) URLSearchParams を取得し文字列辞書へ ---------- */
    const usp = new URLSearchParams(search)
    const raw: Record<string, string> = {}
    usp.forEach((value, key) => {
      raw[key] = preprocess ? preprocess(key as never, value) : value
    })

    setReadyTrue()

    /* 2) resolver 無しなら丸ごと返す -------------------- */
    if (!resolver) {
      return { data: raw as Record<string, string | undefined>, isError: false }
    }

    /* 3) 文字列 → number など事前変換 ------------------- */
    const converted: Record<string, unknown> = {}
    for (const key of Object.keys(resolver.shape) as Array<
      keyof typeof resolver.shape
    >) {
      const schema = resolver.shape[key]
      const v = raw[key as string]
      if (v === undefined) continue
      converted[key as string] = schema instanceof ZodNumber ? Number(v) : v
    }

    /* 4) バリデーションモードごとに処理 ------------------ */
    const base = Object.fromEntries(
      Object.keys(resolver.shape).map((k) => [k, undefined])
    ) as Optionalise<z.infer<typeof resolver>>

    if (mode === 'pick') {
      /* ---- 部分一致モード ---- */
      let anyError = false
      const picked: Record<string, unknown> = {}

      for (const [key, schema] of Object.entries(resolver.shape)) {
        const val = converted[key]
        if (val === undefined) continue

        const r = (schema as z.ZodTypeAny).safeParse(val)
        if (r.success) picked[key] = r.data
        else anyError = true
      }

      return {
        data: { ...base, ...picked },
        isError: anyError,
      }
    } else {
      /* ---- 完全一致モード ---- */
      const parsed = resolver.safeParse(converted)
      return {
        data: parsed.success ? { ...base, ...parsed.data } : base,
        isError: !parsed.success,
      }
    }
  }, [search, resolver, preprocess, mode])

  /* ----------------------------------------------------------------
   * 更新ヘルパ（差分チェック付き）
   * ---------------------------------------------------------------- */
  const updateParams = useCallback(
    (params: UpdateArgs<Schema>) => {
      /* 1) 現在のクエリを取得し、URLSearchParams へ ---------------- */
      const usp = new URLSearchParams(adapter.getSearch())

      /* 2) 渡された params を反映 ----------------------------------- */
      Object.entries(params).forEach(([k, v]) => {
        if (v === null || v === '') {
          usp.delete(k) // null / 空文字 → 削除
        } else if (v !== undefined) {
          usp.set(k, String(v)) // それ以外 → 文字列でセット
        }
      })

      /* 3) 変更後のクエリ文字列を生成（? を付けずに比較） ------------ */
      // ① URLSearchParams#sort() でキー順を安定化（ES2021~ 対応）
      usp.sort()
      const next = usp.toString()

      // ② adapter.getSearch() から先頭の ? を除いて比較
      const current = adapter.getSearch().replace(/^\?/, '')
      if (next === current) return // 差分無しなら何もしない

      /* 4) 差分があれば更新 ----------------------------------------- */
      adapter.setSearch(next)
    },
    [adapter]
  )
  /* ---------------------------------------------------------------- */
  /* 型条件付きで戻す                                                  */
  /* ---------------------------------------------------------------- */
  return {
    data: data as Schema extends ZodObject<ZodRawShape>
      ? Optionalise<z.infer<Schema>>
      : Record<string, string | undefined>,
    isReady,
    isError,
    updateParams,
  }
}
