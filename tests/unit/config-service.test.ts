import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getProjectModelConfig } from '@/lib/config-service'

const prismaMock = vi.hoisted(() => ({
  novelPromotionProject: {
    findUnique: vi.fn(),
  },
  userPreference: {
    findUnique: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

describe('config-service project model config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('falls back to user default models when project model fields are empty', async () => {
    prismaMock.novelPromotionProject.findUnique.mockResolvedValue({
      analysisModel: null,
      characterModel: null,
      locationModel: null,
      storyboardModel: null,
      editModel: null,
      videoModel: null,
      audioModel: null,
      videoRatio: '16:9',
      artStyle: 'realistic',
      capabilityOverrides: null,
    })
    prismaMock.userPreference.findUnique.mockResolvedValue({
      analysisModel: 'llm::analysis-user',
      characterModel: 'img::character-user',
      locationModel: 'img::location-user',
      storyboardModel: 'img::storyboard-user',
      editModel: 'img::edit-user',
      videoModel: 'video::video-user',
      audioModel: 'audio::audio-user',
      capabilityDefaults: null,
    })

    const config = await getProjectModelConfig('project-1', 'user-1')

    expect(config).toMatchObject({
      analysisModel: 'llm::analysis-user',
      characterModel: 'img::character-user',
      locationModel: 'img::location-user',
      storyboardModel: 'img::storyboard-user',
      editModel: 'img::edit-user',
      videoModel: 'video::video-user',
      audioModel: 'audio::audio-user',
    })
  })

  it('keeps project-level model overrides ahead of user defaults', async () => {
    prismaMock.novelPromotionProject.findUnique.mockResolvedValue({
      analysisModel: 'llm::analysis-project',
      characterModel: 'img::character-project',
      locationModel: null,
      storyboardModel: null,
      editModel: null,
      videoModel: null,
      audioModel: null,
      videoRatio: '16:9',
      artStyle: 'realistic',
      capabilityOverrides: null,
    })
    prismaMock.userPreference.findUnique.mockResolvedValue({
      analysisModel: 'llm::analysis-user',
      characterModel: 'img::character-user',
      locationModel: 'img::location-user',
      storyboardModel: 'img::storyboard-user',
      editModel: 'img::edit-user',
      videoModel: 'video::video-user',
      audioModel: 'audio::audio-user',
      capabilityDefaults: null,
    })

    const config = await getProjectModelConfig('project-1', 'user-1')

    expect(config.analysisModel).toBe('llm::analysis-project')
    expect(config.characterModel).toBe('img::character-project')
    expect(config.locationModel).toBe('img::location-user')
  })
})
