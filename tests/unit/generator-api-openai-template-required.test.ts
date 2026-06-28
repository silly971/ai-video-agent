import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolveModelSelectionMock = vi.hoisted(() =>
  vi.fn(async () => ({
    provider: 'openai-compatible:oa-1',
    modelId: 'gpt-image-1',
    modelKey: 'openai-compatible:oa-1::gpt-image-1',
    mediaType: 'image',
    compatMediaTemplate: undefined,
  })),
)
const getProviderConfigMock = vi.hoisted(() =>
  vi.fn(async () => ({
    id: 'openai-compatible:oa-1',
    name: 'OpenAI Compat',
    apiKey: 'oa-key',
    gatewayRoute: 'openai-compat' as const,
  })),
)
const resolveModelGatewayRouteMock = vi.hoisted(() => vi.fn(() => 'openai-compat'))
const generateImageViaOpenAICompatMock = vi.hoisted(() => vi.fn(async () => ({ success: true, imageUrl: 'image' })))
const generateVideoViaOpenAICompatMock = vi.hoisted(() => vi.fn(async () => ({ success: true, videoUrl: 'video' })))
const generateImageViaOpenAICompatTemplateMock = vi.hoisted(() => vi.fn(async () => ({ success: true, imageUrl: 'image' })))
const generateVideoViaOpenAICompatTemplateMock = vi.hoisted(() => vi.fn(async () => ({ success: true, videoUrl: 'video' })))

vi.mock('@/lib/api-config', () => ({
  resolveModelSelection: resolveModelSelectionMock,
  getProviderConfig: getProviderConfigMock,
  getProviderKey: (providerId: string) => providerId.split(':')[0] || providerId,
}))

vi.mock('@/lib/model-gateway', () => ({
  resolveModelGatewayRoute: resolveModelGatewayRouteMock,
  generateImageViaOpenAICompat: generateImageViaOpenAICompatMock,
  generateVideoViaOpenAICompat: generateVideoViaOpenAICompatMock,
  generateImageViaOpenAICompatTemplate: generateImageViaOpenAICompatTemplateMock,
  generateVideoViaOpenAICompatTemplate: generateVideoViaOpenAICompatTemplateMock,
}))

vi.mock('@/lib/generators/factory', () => ({
  createImageGenerator: vi.fn(() => ({ generate: vi.fn() })),
  createVideoGenerator: vi.fn(() => ({ generate: vi.fn() })),
  createAudioGenerator: vi.fn(() => ({ generate: vi.fn() })),
}))

vi.mock('@/lib/providers/bailian', () => ({
  generateBailianImage: vi.fn(),
  generateBailianVideo: vi.fn(),
  generateBailianAudio: vi.fn(),
}))

vi.mock('@/lib/providers/siliconflow', () => ({
  generateSiliconFlowImage: vi.fn(),
  generateSiliconFlowVideo: vi.fn(),
  generateSiliconFlowAudio: vi.fn(),
}))

import { generateImage, generateVideo } from '@/lib/generator-api'

describe('generator-api falls back to direct openai-compatible media calls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveModelGatewayRouteMock.mockReturnValue('openai-compat')
    getProviderConfigMock.mockResolvedValue({
      id: 'openai-compatible:oa-1',
      name: 'OpenAI Compat',
      apiKey: 'oa-key',
      gatewayRoute: 'openai-compat',
    })
  })

  it('uses direct image generation when compatMediaTemplate is missing', async () => {
    resolveModelSelectionMock.mockResolvedValueOnce({
      provider: 'openai-compatible:oa-1',
      modelId: 'gpt-image-1',
      modelKey: 'openai-compatible:oa-1::gpt-image-1',
      mediaType: 'image',
      compatMediaTemplate: undefined,
    })

    await expect(
      generateImage('user-1', 'openai-compatible:oa-1::gpt-image-1', 'draw cat'),
    ).resolves.toEqual({ success: true, imageUrl: 'image' })

    expect(generateImageViaOpenAICompatMock).toHaveBeenCalledTimes(1)
    expect(generateImageViaOpenAICompatMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      providerId: 'openai-compatible:oa-1',
      modelId: 'gpt-image-1',
      prompt: 'draw cat',
      profile: 'openai-compatible',
    }))
    expect(generateImageViaOpenAICompatTemplateMock).not.toHaveBeenCalled()
  })

  it('uses direct video generation when compatMediaTemplate is missing', async () => {
    resolveModelSelectionMock.mockResolvedValueOnce({
      provider: 'openai-compatible:oa-1',
      modelId: 'veo3.1',
      modelKey: 'openai-compatible:oa-1::veo3.1',
      mediaType: 'video',
      compatMediaTemplate: undefined,
    })

    await expect(
      generateVideo('user-1', 'openai-compatible:oa-1::veo3.1', 'https://example.com/a.png', { prompt: 'animate' }),
    ).resolves.toEqual({ success: true, videoUrl: 'video' })

    expect(generateVideoViaOpenAICompatMock).toHaveBeenCalledTimes(1)
    expect(generateVideoViaOpenAICompatMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      providerId: 'openai-compatible:oa-1',
      modelId: 'veo3.1',
      imageUrl: 'https://example.com/a.png',
      prompt: 'animate',
      profile: 'openai-compatible',
    }))
    expect(generateVideoViaOpenAICompatTemplateMock).not.toHaveBeenCalled()
  })
})
