import { act, renderHook, waitFor } from '@testing-library/react'
import { z } from 'zod'
import { useQueryGuard, type QueryGuardAdapter } from './useQueryGuard'

/* ------------------------------------------------------------------ */
/* モックアダプタ：ブラウザ API を触らずにテスト出来るように           */
/* ------------------------------------------------------------------ */
function createMockAdapter(initial = '') {
  let search =
    initial.startsWith('?') || initial === '' ? initial : `?${initial}`
  const listeners = new Set<() => void>()

  const adapter: QueryGuardAdapter = {
    getSearch: () => search,
    setSearch: (next) => {
      search = next.startsWith('?') || next === '' ? next : `?${next}`
      listeners.forEach((cb) => cb())
    },
    subscribe: (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
  }

  return { adapter, getSearch: () => search }
}

/* ------------------------------------------------------------------ */
/* テスト本体                                                          */
/* ------------------------------------------------------------------ */
describe('useQueryGuard', () => {
  it('works without resolver and can update / delete keys', async () => {
    const { adapter, getSearch } = createMockAdapter('?foo=bar')

    const { result } = renderHook(() => useQueryGuard({ adapter }))

    // URL 取得が完了するまで待機
    await waitFor(() => expect(result.current.isReady).toBe(true))

    expect(result.current.isError).toBe(false)
    expect(result.current.data.foo).toBe('bar')

    // 追加・更新
    act(() => {
      result.current.updateParams({ baz: 'qux' })
    })
    expect(getSearch()).toContain('foo=bar')
    expect(getSearch()).toContain('baz=qux')

    // 削除 (null 指定)
    act(() => {
      result.current.updateParams({ foo: null })
    })
    expect(getSearch()).not.toContain('foo=')
  })

  it('parses & coerces with resolver', async () => {
    const schema = z.object({
      page: z.number(),
      q: z.string().optional(),
    })
    const { adapter, getSearch } = createMockAdapter('?page=3&q=hello')

    const { result } = renderHook(() =>
      useQueryGuard({ adapter, resolver: schema })
    )

    await waitFor(() => expect(result.current.isReady).toBe(true))

    expect(result.current.isError).toBe(false)
    expect(result.current.data.page).toBe(3) // string → number 変換
    expect(result.current.data.q).toBe('hello')

    // 削除
    act(() => {
      result.current.updateParams({ q: null })
    })
    expect(getSearch()).not.toContain('q=')
  })

  it('sets isError when validation fails', async () => {
    const schema = z.object({ page: z.number() })
    const { adapter } = createMockAdapter('?page=NaN')

    const { result } = renderHook(() =>
      useQueryGuard({ adapter, resolver: schema })
    )

    await waitFor(() => expect(result.current.isReady).toBe(true))

    expect(result.current.isError).toBe(true)
    expect(result.current.data.page).toBeUndefined()
  })
})
