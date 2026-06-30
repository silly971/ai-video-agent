import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const VIDEO_DOWNLOAD_ROUTES = [
  'src/app/api/novel-promotion/[projectId]/download-videos/route.ts',
  'src/app/api/novel-promotion/[projectId]/video-urls/route.ts',
]

describe('api contract - video download preference', () => {
  it('defaults to original panel videos instead of lip-sync videos', () => {
    for (const routeFile of VIDEO_DOWNLOAD_ROUTES) {
      const source = readFileSync(routeFile, 'utf8')
      expect(source).toContain('const preferLipSync = panelPreferences?.[panelKey] ?? false')
      expect(source).not.toContain('const preferLipSync = panelPreferences?.[panelKey] ?? true')
    }
  })
})
