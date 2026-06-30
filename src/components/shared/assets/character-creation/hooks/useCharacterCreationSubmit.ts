'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { shouldShowError } from '@/lib/error-utils'
import {
  useAiCreateProjectCharacter,
  useAiDesignCharacter,
  useCreateAssetHubCharacter,
  useCreateProjectCharacter,
  useGenerateCharacterImage,
  useGenerateProjectCharacterImage,
  useCreateProjectCharacterAppearance,
  useDesignAssetHubVoice,
  useDesignProjectVoice,
  useExtractAssetHubReferenceCharacterDescription,
  useExtractProjectReferenceCharacterDescription,
  useSaveDesignedAssetHubVoice,
  useSaveProjectDesignedVoice,
  useUpdateAssetHubCharacterVoiceSettings,
  useUploadAssetHubTempMedia,
  useUploadProjectTempMedia,
} from '@/lib/query/hooks'
import { useImageGenerationCount } from '@/lib/image-generation/use-image-generation-count'

type Mode = 'asset-hub' | 'project'

interface UseCharacterCreationSubmitParams {
  mode: Mode
  folderId?: string | null
  projectId?: string
  name: string
  description: string
  voicePrompt: string
  voicePreviewText: string
  aiInstruction: string
  artStyle: string
  referenceImagesBase64: string[]
  referenceSubMode: 'direct' | 'extract'
  isSubAppearance: boolean
  selectedCharacterId: string
  changeReason: string
  setDescription: (value: string) => void
  setVoicePrompt: (value: string) => void
  setVoicePreviewText: (value: string) => void
  setAiInstruction: (value: string) => void
  onSuccess: () => void
  onClose: () => void
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function useCharacterCreationSubmit({
  mode,
  folderId,
  projectId,
  name,
  description,
  voicePrompt,
  voicePreviewText,
  aiInstruction,
  artStyle,
  referenceImagesBase64,
  referenceSubMode,
  isSubAppearance,
  selectedCharacterId,
  changeReason,
  setDescription,
  setVoicePrompt,
  setVoicePreviewText,
  setAiInstruction,
  onSuccess,
  onClose,
}: UseCharacterCreationSubmitParams) {
  const t = useTranslations('assetModal')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAiDesigning, setIsAiDesigning] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)

  const uploadAssetHubTemp = useUploadAssetHubTempMedia()
  const uploadProjectTemp = useUploadProjectTempMedia()
  const aiDesignAssetHubCharacter = useAiDesignCharacter()
  const aiCreateProjectCharacter = useAiCreateProjectCharacter(projectId ?? '')
  const extractAssetHubDescription = useExtractAssetHubReferenceCharacterDescription()
  const extractProjectDescription = useExtractProjectReferenceCharacterDescription(projectId ?? '')
  const createAssetHubCharacter = useCreateAssetHubCharacter()
  const createProjectCharacter = useCreateProjectCharacter(projectId ?? '')
  const generateAssetHubCharacterImage = useGenerateCharacterImage()
  const generateProjectCharacterImage = useGenerateProjectCharacterImage(projectId ?? '')
  const createProjectAppearance = useCreateProjectCharacterAppearance(projectId ?? '')
  const designAssetHubVoice = useDesignAssetHubVoice()
  const saveDesignedAssetHubVoice = useSaveDesignedAssetHubVoice()
  const updateAssetHubCharacterVoiceSettings = useUpdateAssetHubCharacterVoiceSettings()
  const designProjectVoice = useDesignProjectVoice(projectId ?? '')
  const saveProjectDesignedVoice = useSaveProjectDesignedVoice(projectId ?? '')
  const {
    count: characterGenerationCount,
    setCount: setCharacterGenerationCount,
  } = useImageGenerationCount('character')
  const {
    count: referenceCharacterGenerationCount,
    setCount: setReferenceCharacterGenerationCount,
  } = useImageGenerationCount('reference-to-character')

  type CreatedCharacterResponse = {
    character?: {
      id: string
      appearances?: Array<{
        id: string
        appearanceIndex: number
      }>
    }
  }

  type SavedAssetHubVoiceResponse = {
    voice?: {
      id?: string
      voiceId?: string | null
      customVoiceUrl?: string | null
    }
  }

  const buildVoiceDesignPayload = useCallback(() => {
    const trimmedVoicePrompt = voicePrompt.trim()
    if (!trimmedVoicePrompt) return null

    const trimmedName = name.trim() || t('character.defaultVoiceName')
    const trimmedPreviewText = voicePreviewText.trim()
    return {
      voicePrompt: trimmedVoicePrompt,
      previewText: trimmedPreviewText || t('character.defaultVoicePreviewText', { name: trimmedName }),
      preferredName: trimmedName,
      language: 'zh' as const,
    }
  }, [name, t, voicePreviewText, voicePrompt])

  const tryAutoDesignCharacterVoice = useCallback(async (characterId: string) => {
    const payload = buildVoiceDesignPayload()
    if (!payload) return

    try {
      if (mode === 'asset-hub') {
        const designedVoice = await designAssetHubVoice.mutateAsync(payload)
        if (!designedVoice.voiceId || !designedVoice.audioBase64) {
          throw new Error(t('errors.voiceDesignFailed'))
        }
        const savedVoice = await saveDesignedAssetHubVoice.mutateAsync({
          voiceId: designedVoice.voiceId,
          voiceBase64: designedVoice.audioBase64,
          voiceName: `${payload.preferredName}${t('character.voiceNameSuffix')}`,
          folderId: folderId ?? null,
          voicePrompt: payload.voicePrompt,
        }) as SavedAssetHubVoiceResponse
        const globalVoice = savedVoice.voice
        await updateAssetHubCharacterVoiceSettings.mutateAsync({
          characterId,
          voiceType: 'qwen-designed',
          voiceId: designedVoice.voiceId,
          customVoiceUrl: globalVoice?.customVoiceUrl ?? null,
          globalVoiceId: globalVoice?.id ?? null,
        })
        return
      }

      if (!projectId) return
      const designedVoice = await designProjectVoice.mutateAsync(payload)
      if (!designedVoice.voiceId || !designedVoice.audioBase64) {
        throw new Error(t('errors.voiceDesignFailed'))
      }
      await saveProjectDesignedVoice.mutateAsync({
        characterId,
        voiceId: designedVoice.voiceId,
        audioBase64: designedVoice.audioBase64,
      })
    } catch (error: unknown) {
      if (shouldShowError(error)) {
        alert(getErrorMessage(error, t('errors.voiceDesignFailed')))
      }
    }
  }, [
    buildVoiceDesignPayload,
    designAssetHubVoice,
    designProjectVoice,
    folderId,
    mode,
    projectId,
    saveDesignedAssetHubVoice,
    saveProjectDesignedVoice,
    t,
    updateAssetHubCharacterVoiceSettings,
  ])

  const uploadReferenceImages = useCallback(async () => {
    const uploadMutation = mode === 'asset-hub' ? uploadAssetHubTemp : uploadProjectTemp
    return Promise.all(
      referenceImagesBase64.map(async (base64) => {
        const data = await uploadMutation.mutateAsync({ imageBase64: base64 })
        if (!data.url) throw new Error(t('errors.uploadFailed'))
        return data.url
      }),
    )
  }, [mode, referenceImagesBase64, t, uploadAssetHubTemp, uploadProjectTemp])

  const handleExtractDescription = useCallback(async () => {
    if (referenceImagesBase64.length === 0) return

    try {
      setIsExtracting(true)
      const referenceImageUrls = await uploadReferenceImages()
      const result = mode === 'asset-hub'
        ? await extractAssetHubDescription.mutateAsync(referenceImageUrls)
        : await extractProjectDescription.mutateAsync(referenceImageUrls)
      if (result?.description) {
        setDescription(result.description)
      }
    } catch (error: unknown) {
      if (shouldShowError(error)) {
        alert(getErrorMessage(error, t('errors.extractDescriptionFailed')))
      }
    } finally {
      setIsExtracting(false)
    }
  }, [
    extractAssetHubDescription,
    extractProjectDescription,
    mode,
    referenceImagesBase64.length,
    setDescription,
    t,
    uploadReferenceImages,
  ])

  const handleCreateWithReference = useCallback(async () => {
    if (!name.trim() || referenceImagesBase64.length === 0) return

    try {
      setIsSubmitting(true)
      const referenceImageUrls = await uploadReferenceImages()

      let finalDescription = description.trim()
      if (referenceSubMode === 'extract') {
        const result = mode === 'asset-hub'
          ? await extractAssetHubDescription.mutateAsync(referenceImageUrls)
          : await extractProjectDescription.mutateAsync(referenceImageUrls)
        finalDescription = result?.description || finalDescription
      }

      if (mode === 'asset-hub') {
        const result = await createAssetHubCharacter.mutateAsync({
          name: name.trim(),
          description: finalDescription || t('character.defaultDescription', { name: name.trim() }),
          folderId: folderId ?? null,
          artStyle,
          voicePrompt: voicePrompt.trim() || undefined,
          voicePreviewText: voicePreviewText.trim() || undefined,
          generateFromReference: true,
          referenceImageUrls,
          customDescription: referenceSubMode === 'extract' ? finalDescription : undefined,
          count: referenceCharacterGenerationCount,
        }) as CreatedCharacterResponse
        if (result.character?.id) {
          await tryAutoDesignCharacterVoice(result.character.id)
        }
      } else {
        const result = await createProjectCharacter.mutateAsync({
          name: name.trim(),
          description: finalDescription || t('character.defaultDescription', { name: name.trim() }),
          voicePrompt: voicePrompt.trim() || undefined,
          voicePreviewText: voicePreviewText.trim() || undefined,
          generateFromReference: true,
          referenceImageUrls,
          customDescription: referenceSubMode === 'extract' ? finalDescription : undefined,
          count: referenceCharacterGenerationCount,
        }) as CreatedCharacterResponse
        if (result.character?.id) {
          await tryAutoDesignCharacterVoice(result.character.id)
        }
      }

      onSuccess()
      onClose()
    } catch (error: unknown) {
      if (shouldShowError(error)) {
        alert(getErrorMessage(error, t('errors.createFailed')))
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [
    artStyle,
    createAssetHubCharacter,
    createProjectCharacter,
    description,
    extractAssetHubDescription,
    extractProjectDescription,
    folderId,
    mode,
    name,
    onClose,
    onSuccess,
    referenceImagesBase64.length,
    referenceCharacterGenerationCount,
    referenceSubMode,
    t,
    tryAutoDesignCharacterVoice,
    uploadReferenceImages,
    voicePreviewText,
    voicePrompt,
  ])

  const handleAiDesign = useCallback(async () => {
    if (!aiInstruction.trim()) return

    try {
      setIsAiDesigning(true)
      const result = mode === 'asset-hub'
        ? await aiDesignAssetHubCharacter.mutateAsync(aiInstruction)
        : await aiCreateProjectCharacter.mutateAsync({ userInstruction: aiInstruction })

      if (result?.prompt) {
        setDescription(result.prompt)
        setAiInstruction('')
      }
      if (result?.voicePrompt) {
        setVoicePrompt(result.voicePrompt)
      }
      if (result?.voicePreviewText) {
        setVoicePreviewText(result.voicePreviewText)
      }
    } catch (error: unknown) {
      if (shouldShowError(error)) {
        alert(getErrorMessage(error, t('errors.aiDesignFailed')))
      }
    } finally {
      setIsAiDesigning(false)
    }
  }, [aiCreateProjectCharacter, aiDesignAssetHubCharacter, aiInstruction, mode, setAiInstruction, setDescription, setVoicePreviewText, setVoicePrompt, t])

  const handleSubmit = useCallback(async () => {
    if (isSubAppearance) {
      if (!selectedCharacterId.trim() || !changeReason.trim() || !description.trim()) return
      try {
        setIsSubmitting(true)
        await createProjectAppearance.mutateAsync({
          characterId: selectedCharacterId,
          changeReason: changeReason.trim(),
          description: description.trim(),
        })
        onSuccess()
        onClose()
      } catch (error: unknown) {
        if (shouldShowError(error)) {
          alert(getErrorMessage(error, t('errors.addSubAppearanceFailed')))
        }
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    if (!name.trim() || !description.trim()) return
    try {
      setIsSubmitting(true)
      if (mode === 'asset-hub') {
        const result = await createAssetHubCharacter.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          folderId: folderId ?? null,
          artStyle,
          voicePrompt: voicePrompt.trim() || undefined,
          voicePreviewText: voicePreviewText.trim() || undefined,
        }) as CreatedCharacterResponse
        if (result.character?.id) {
          await tryAutoDesignCharacterVoice(result.character.id)
        }
      } else {
        const result = await createProjectCharacter.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          voicePrompt: voicePrompt.trim() || undefined,
          voicePreviewText: voicePreviewText.trim() || undefined,
        }) as CreatedCharacterResponse
        if (result.character?.id) {
          await tryAutoDesignCharacterVoice(result.character.id)
        }
      }
      onSuccess()
      onClose()
    } catch (error: unknown) {
      if (shouldShowError(error)) {
        alert(getErrorMessage(error, t('errors.createFailed')))
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [
    artStyle,
    changeReason,
    createAssetHubCharacter,
    createProjectAppearance,
    createProjectCharacter,
    description,
    folderId,
    isSubAppearance,
    mode,
    name,
    onClose,
    onSuccess,
    selectedCharacterId,
    t,
    tryAutoDesignCharacterVoice,
    voicePreviewText,
    voicePrompt,
  ])

  const handleSubmitAndGenerate = useCallback(async () => {
    if (isSubAppearance) {
      await handleSubmit()
      return
    }

    if (!name.trim() || !description.trim()) return

    try {
      setIsSubmitting(true)

      if (mode === 'asset-hub') {
        const result = await createAssetHubCharacter.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          folderId: folderId ?? null,
          artStyle,
          voicePrompt: voicePrompt.trim() || undefined,
          voicePreviewText: voicePreviewText.trim() || undefined,
        }) as CreatedCharacterResponse
        const createdCharacterId = result.character?.id
        const createdAppearanceIndex = result.character?.appearances?.[0]?.appearanceIndex
        if (!createdCharacterId || createdAppearanceIndex === undefined) {
          throw new Error(t('errors.createFailed'))
        }
        await Promise.all([
          generateAssetHubCharacterImage.mutateAsync({
            characterId: createdCharacterId,
            appearanceIndex: createdAppearanceIndex,
            artStyle,
            count: characterGenerationCount,
          }),
          tryAutoDesignCharacterVoice(createdCharacterId),
        ])
      } else {
        const result = await createProjectCharacter.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          voicePrompt: voicePrompt.trim() || undefined,
          voicePreviewText: voicePreviewText.trim() || undefined,
        }) as CreatedCharacterResponse
        const createdCharacterId = result.character?.id
        const createdAppearanceId = result.character?.appearances?.[0]?.id
        if (!createdCharacterId || !createdAppearanceId) {
          throw new Error(t('errors.createFailed'))
        }
        await Promise.all([
          generateProjectCharacterImage.mutateAsync({
            characterId: createdCharacterId,
            appearanceId: createdAppearanceId,
            count: characterGenerationCount,
          }),
          tryAutoDesignCharacterVoice(createdCharacterId),
        ])
      }

      onSuccess()
      onClose()
    } catch (error: unknown) {
      if (shouldShowError(error)) {
        alert(getErrorMessage(error, t('errors.createFailed')))
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [
    artStyle,
    characterGenerationCount,
    createAssetHubCharacter,
    createProjectCharacter,
    description,
    folderId,
    generateAssetHubCharacterImage,
    generateProjectCharacterImage,
    handleSubmit,
    isSubAppearance,
    mode,
    name,
    onClose,
    onSuccess,
    t,
    tryAutoDesignCharacterVoice,
    voicePreviewText,
    voicePrompt,
  ])

  return {
    isSubmitting,
    isAiDesigning,
    isExtracting,
    characterGenerationCount,
    setCharacterGenerationCount,
    referenceCharacterGenerationCount,
    setReferenceCharacterGenerationCount,
    handleExtractDescription,
    handleCreateWithReference,
    handleAiDesign,
    handleSubmit,
    handleSubmitAndGenerate,
  }
}
