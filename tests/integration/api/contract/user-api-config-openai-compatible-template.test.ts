import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMockRequest } from '../../../helpers/request'
import {
  installAuthMocks,
  mockAuthenticated,
  resetAuthMockState,
} from '../../../helpers/auth'

type UserPreferenceSnapshot = {
  customProviders: string | null
  customModels: string | null
}

const prismaMock = vi.hoisted(() => ({
  userPreference: {
    findUnique: vi.fn<(...args: unknown[]) => Promise<UserPreferenceSnapshot | null>>(),
    upsert: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  },
}))

const encryptApiKeyMock = vi.hoisted(() => vi.fn((value: string) => `enc:${value}`))
const decryptApiKeyMock = vi.hoisted(() => vi.fn((value: string) => value.replace(/^enc:/, '')))
const getBillingModeMock = vi.hoisted(() => vi.fn(async () => 'OFF'))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/crypto-utils', () => ({
  encryptApiKey: encryptApiKeyMock,
  decryptApiKey: decryptApiKeyMock,
}))

vi.mock('@/lib/billing/mode', () => ({
  getBillingMode: getBillingModeMock,
}))

const routeContext = { params: Promise.resolve({}) }

function readSavedModelsFromUpsert(): Array<Record<string, unknown>> {
  const firstCall = prismaMock.userPreference.upsert.mock.calls[0]
  if (!firstCall) throw new Error('expected prisma.userPreference.upsert to be called')

  const payload = firstCall[0] as { update?: { customModels?: unknown } }
  const rawModels = payload.update?.customModels
  if (typeof rawModels !== 'string') throw new Error('expected update.customModels JSON')

  const parsed = JSON.parse(rawModels) as unknown
  if (!Array.isArray(parsed)) throw new Error('expected customModels array')
  return parsed as Array<Record<string, unknown>>
}

describe('api contract - user api-config openai-compatible media templates', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    resetAuthMockState()

    prismaMock.userPreference.findUnique.mockResolvedValue({
      customProviders: null,
      customModels: null,
    })
    prismaMock.userPreference.upsert.mockResolvedValue({ id: 'pref-1' })
    getBillingModeMock.mockResolvedValue('OFF')
  })

  it('backfills New API image and Seedance video request templates', async () => {
    installAuthMocks()
    mockAuthenticated('user-1')
    const route = await import('@/app/api/user/api-config/route')

    const req = buildMockRequest({
      path: '/api/user/api-config',
      method: 'PUT',
      body: {
        providers: [
          { id: 'openai-compatible:oa-1', name: 'New API', baseUrl: 'https://newapi.test/v1', apiKey: 'sk-test' },
        ],
        models: [
          {
            modelId: 'gpt-image-1',
            modelKey: 'openai-compatible:oa-1::gpt-image-1',
            name: 'Image',
            type: 'image',
            provider: 'openai-compatible:oa-1',
          },
          {
            modelId: 'doubao-seedance-2-0-260128',
            modelKey: 'openai-compatible:oa-1::doubao-seedance-2-0-260128',
            name: 'Seedance',
            type: 'video',
            provider: 'openai-compatible:oa-1',
          },
        ],
      },
    })

    const res = await route.PUT(req, routeContext)
    expect(res.status).toBe(200)

    const savedModels = readSavedModelsFromUpsert()
    const imageModel = savedModels.find((item) => item.modelKey === 'openai-compatible:oa-1::gpt-image-1')
    const videoModel = savedModels.find((item) => item.modelKey === 'openai-compatible:oa-1::doubao-seedance-2-0-260128')

    expect(imageModel?.compatMediaTemplate).toMatchObject({
      mediaType: 'image',
      mode: 'sync',
      create: {
        path: '/images/generations',
        contentType: 'application/json',
        bodyTemplate: {
          model: '{{model}}',
          prompt: '{{prompt}}',
          size: '{{size}}',
          quality: '{{quality}}',
        },
      },
      response: {
        outputUrlPath: '$.data[0].url',
      },
    })

    expect(videoModel?.compatMediaTemplate).toMatchObject({
      mediaType: 'video',
      mode: 'async',
      create: {
        path: '/videos',
        contentType: 'application/json',
        bodyTemplate: {
          model: '{{model}}',
          prompt: '{{prompt}}',
          resolution: '{{resolution}}',
          ratio: '{{ratio}}',
          duration: '{{duration}}',
          generate_audio: '{{generate_audio}}',
          watermark: '{{watermark}}',
          content: '{{content}}',
        },
      },
      status: {
        path: '/videos/{{task_id}}',
      },
      response: {
        taskIdPath: '$.id',
        statusPath: '$.status',
        outputUrlPath: '$.metadata.url',
      },
    })
  })

  it('allows OpenAI-compatible media custom pricing to use provider-native template fields', async () => {
    installAuthMocks()
    mockAuthenticated('user-1')
    const route = await import('@/app/api/user/api-config/route')

    const req = buildMockRequest({
      path: '/api/user/api-config',
      method: 'PUT',
      body: {
        providers: [
          { id: 'openai-compatible:oa-1', name: 'New API', baseUrl: 'https://newapi.test/v1', apiKey: 'sk-test' },
        ],
        models: [
          {
            modelId: 'gpt-image-1',
            modelKey: 'openai-compatible:oa-1::gpt-image-1',
            name: 'Image',
            type: 'image',
            provider: 'openai-compatible:oa-1',
            customPricing: {
              image: {
                optionPrices: {
                  size: {
                    '1024x1024': 0.04,
                    '1536x1024': 0.08,
                  },
                },
              },
            },
          },
        ],
      },
    })

    const res = await route.PUT(req, routeContext)
    expect(res.status).toBe(200)

    const savedModels = readSavedModelsFromUpsert()
    expect(savedModels[0]?.customPricing).toMatchObject({
      image: {
        optionPrices: {
          size: {
            '1024x1024': 0.04,
            '1536x1024': 0.08,
          },
        },
      },
    })
  })
})
