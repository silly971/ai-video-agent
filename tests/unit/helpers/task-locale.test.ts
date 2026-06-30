import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import {
  resolveRequiredTaskLocale,
  resolveTaskLocaleFromBodyOrDefault,
  resolveTaskLocaleOrDefault,
} from '@/lib/task/resolve-locale'

function buildRequest(headers?: Record<string, string>) {
  return new NextRequest(new URL('/api/tasks', 'http://localhost:3000'), {
    method: 'POST',
    headers: headers || {},
  })
}

describe('task locale resolution', () => {
  it('prefers payload meta locale over headers', () => {
    const locale = resolveTaskLocaleOrDefault(
      buildRequest({ 'accept-language': 'en-US,en;q=0.9' }),
      { meta: { locale: 'zh-CN' } },
    )

    expect(locale).toBe('zh')
  })

  it('normalizes Accept-Language region tags', () => {
    const locale = resolveTaskLocaleOrDefault(
      buildRequest({ 'accept-language': 'en-US,en;q=0.9' }),
      {},
    )

    expect(locale).toBe('en')
  })

  it('defaults missing body locale to zh for queue recovery', () => {
    expect(resolveTaskLocaleFromBodyOrDefault({ content: 'story text' })).toBe('zh')
  })

  it('keeps required locale checks strict for direct submit routes', () => {
    expect(() => resolveRequiredTaskLocale(buildRequest(), {})).toThrow()
  })
})
