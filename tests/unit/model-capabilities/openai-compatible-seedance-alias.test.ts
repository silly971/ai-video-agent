import { describe, expect, it } from 'vitest'
import { findBuiltinCapabilities } from '@/lib/model-capabilities/catalog'

describe('openai-compatible Seedance capability aliases', () => {
  it('maps gateway short ids to the canonical Seedance 2 fast capability set', () => {
    const capabilities = findBuiltinCapabilities(
      'video',
      'openai-compatible:provider-1',
      'seedance-2-fast',
    )

    expect(capabilities?.video?.generationModeOptions).toContain('reference_image')
    expect(capabilities?.video?.durationOptions).toContain(15)
    expect(capabilities?.video?.resolutionOptions).toEqual(['480p', '720p'])
  })
})
