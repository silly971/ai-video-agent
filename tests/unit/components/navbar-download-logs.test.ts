import * as React from 'react'
import { createElement } from 'react'
import type { ComponentProps, ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import type { AbstractIntlMessages } from 'next-intl'
import Navbar from '@/components/Navbar'

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: { alt: string } & Record<string, unknown>) => createElement('img', { alt, ...props }),
}))

vi.mock('@/components/LanguageSwitcher', () => ({
  default: () => createElement('div', null, 'LanguageSwitcher'),
}))

vi.mock('@/hooks/common/useGithubReleaseUpdate', () => ({
  useGithubReleaseUpdate: () => ({
    currentVersion: '0.3.0',
    update: null,
    shouldPulse: false,
    showModal: false,
    openModal: () => undefined,
    dismissCurrentUpdate: () => undefined,
    checkNow: async () => undefined,
  }),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string | { pathname: string }
    children: React.ReactNode
  } & Record<string, unknown>) => {
    const resolvedHref = typeof href === 'string' ? href : href.pathname
    return createElement('a', { href: resolvedHref, ...props }, children)
  },
}))

const messages = {
  nav: {
    workspace: '工作区',
    assetHub: '资产中心',
    profile: '设置中心',
    downloadLogs: '下载日志',
  },
  common: {
    appName: 'waoowaoo',
    betaVersion: 'Beta v{version}',
    updateNotice: {
      openDialog: '打开更新弹窗',
      updateTag: '更新',
      checkUpdate: '检查更新',
      upToDate: '已是最新版本',
    },
  },
} as const

const renderWithIntl = (node: ReactElement) => {
  const providerProps: ComponentProps<typeof NextIntlClientProvider> = {
    locale: 'zh',
    messages: messages as unknown as AbstractIntlMessages,
    timeZone: 'Asia/Shanghai',
    children: node,
  }

  return renderToStaticMarkup(
    createElement(NextIntlClientProvider, providerProps),
  )
}

describe('Navbar desktop actions', () => {
  it('renders Agent navigation and log download without a login session', () => {
    Reflect.set(globalThis, 'React', React)

    const html = renderWithIntl(createElement(Navbar))

    expect(html).toContain('下载日志')
    expect(html).toContain('href="/agent"')
    expect(html).toContain('Agent')
    expect(html).toContain('href="/api/admin/download-logs"')
    expect(html).toContain('download=""')
  })
})
