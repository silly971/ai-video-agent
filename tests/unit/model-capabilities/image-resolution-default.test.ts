import { describe, expect, it } from 'vitest'
import {
  type CapabilitySelections,
  type ModelCapabilities,
  type UnifiedModelType,
} from '@/lib/model-config-contract'
import { resolveGenerationOptionsForModel } from '@/lib/model-capabilities/lookup'

describe('model-capabilities/lookup - image option defaulting', () => {
  const modelType: UnifiedModelType = 'image'
  const modelKey = 'google::test-image-model'

  const capabilities: ModelCapabilities = {
    image: {
      resolutionOptions: ['0.5K', '1K', '2K'],
      qualityOptions: ['auto', 'high'],
    },
  }

  it('auto-fills image option fields with first option when missing and required', () => {
    const capabilityDefaults: CapabilitySelections = {}

    const result = resolveGenerationOptionsForModel({
      modelType,
      modelKey,
      capabilities,
      capabilityDefaults,
      requireAllFields: true,
    })

    expect(result.issues).toEqual([])
    expect(result.options).toEqual({
      resolution: '0.5K',
      quality: 'auto',
    })
  })

  it('does not override user-provided image options', () => {
    const capabilityDefaults: CapabilitySelections = {
      [modelKey]: {
        resolution: '2K',
        quality: 'high',
      },
    }

    const result = resolveGenerationOptionsForModel({
      modelType,
      modelKey,
      capabilities,
      capabilityDefaults,
      requireAllFields: true,
    })

    expect(result.issues).toEqual([])
    expect(result.options).toEqual({
      resolution: '2K',
      quality: 'high',
    })
  })
})
