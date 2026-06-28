import { describe, expect, it } from 'vitest'
import {
  AUTHENTICATED_HOME_PATHNAME,
  buildAuthenticatedHomeTarget,
} from '@/lib/home/default-route'

describe('authenticated home default route', () => {
  it('uses /agent as the desktop Agent workbench pathname', () => {
    expect(AUTHENTICATED_HOME_PATHNAME).toBe('/agent')
    expect(buildAuthenticatedHomeTarget()).toEqual({
      pathname: '/agent',
    })
  })
})
