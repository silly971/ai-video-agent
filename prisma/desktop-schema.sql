-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "character_appearances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "appearanceIndex" INTEGER NOT NULL,
    "changeReason" TEXT NOT NULL,
    "description" TEXT,
    "descriptions" TEXT,
    "imageUrl" TEXT,
    "imageUrls" TEXT,
    "selectedIndex" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousImageUrl" TEXT,
    "previousImageUrls" TEXT,
    "previousDescription" TEXT,
    "previousDescriptions" TEXT,
    "imageMediaId" TEXT,
    CONSTRAINT "character_appearances_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "character_appearances_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "novel_promotion_characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "location_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "imageIndex" INTEGER NOT NULL,
    "description" TEXT,
    "availableSlots" TEXT,
    "imageUrl" TEXT,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousImageUrl" TEXT,
    "previousDescription" TEXT,
    "imageMediaId" TEXT,
    CONSTRAINT "location_images_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "location_images_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "novel_promotion_locations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "novel_promotion_characters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelPromotionProjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customVoiceUrl" TEXT,
    "customVoiceMediaId" TEXT,
    "voiceId" TEXT,
    "voiceType" TEXT,
    "profileData" TEXT,
    "profileConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "introduction" TEXT,
    "sourceGlobalCharacterId" TEXT,
    CONSTRAINT "novel_promotion_characters_customVoiceMediaId_fkey" FOREIGN KEY ("customVoiceMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "novel_promotion_characters_novelPromotionProjectId_fkey" FOREIGN KEY ("novelPromotionProjectId") REFERENCES "novel_promotion_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "novel_promotion_locations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelPromotionProjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "assetKind" TEXT NOT NULL DEFAULT 'location',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceGlobalLocationId" TEXT,
    "selectedImageId" TEXT,
    CONSTRAINT "novel_promotion_locations_selectedImageId_fkey" FOREIGN KEY ("selectedImageId") REFERENCES "location_images" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "novel_promotion_locations_novelPromotionProjectId_fkey" FOREIGN KEY ("novelPromotionProjectId") REFERENCES "novel_promotion_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "novel_promotion_episodes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelPromotionProjectId" TEXT NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "novelText" TEXT,
    "audioUrl" TEXT,
    "audioMediaId" TEXT,
    "srtContent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "speakerVoices" TEXT,
    CONSTRAINT "novel_promotion_episodes_audioMediaId_fkey" FOREIGN KEY ("audioMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "novel_promotion_episodes_novelPromotionProjectId_fkey" FOREIGN KEY ("novelPromotionProjectId") REFERENCES "novel_promotion_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "video_editor_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "projectData" TEXT NOT NULL,
    "renderStatus" TEXT,
    "renderTaskId" TEXT,
    "outputUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "video_editor_projects_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "novel_promotion_episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "novel_promotion_clips" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "start" INTEGER,
    "end" INTEGER,
    "duration" INTEGER,
    "summary" TEXT NOT NULL,
    "location" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "characters" TEXT,
    "props" TEXT,
    "endText" TEXT,
    "shotCount" INTEGER,
    "startText" TEXT,
    "screenplay" TEXT,
    CONSTRAINT "novel_promotion_clips_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "novel_promotion_episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "novel_promotion_panels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storyboardId" TEXT NOT NULL,
    "panelIndex" INTEGER NOT NULL,
    "panelNumber" INTEGER,
    "shotType" TEXT,
    "cameraMove" TEXT,
    "description" TEXT,
    "location" TEXT,
    "characters" TEXT,
    "props" TEXT,
    "srtSegment" TEXT,
    "srtStart" REAL,
    "srtEnd" REAL,
    "duration" REAL,
    "imagePrompt" TEXT,
    "imageUrl" TEXT,
    "imageMediaId" TEXT,
    "imageHistory" TEXT,
    "videoPrompt" TEXT,
    "firstLastFramePrompt" TEXT,
    "videoUrl" TEXT,
    "videoGenerationMode" TEXT,
    "videoMediaId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sceneType" TEXT,
    "candidateImages" TEXT,
    "linkedToNextPanel" BOOLEAN NOT NULL DEFAULT false,
    "lipSyncTaskId" TEXT,
    "lipSyncVideoUrl" TEXT,
    "lipSyncVideoMediaId" TEXT,
    "sketchImageUrl" TEXT,
    "sketchImageMediaId" TEXT,
    "photographyRules" TEXT,
    "actingNotes" TEXT,
    "previousImageUrl" TEXT,
    "previousImageMediaId" TEXT,
    CONSTRAINT "novel_promotion_panels_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "novel_promotion_panels_videoMediaId_fkey" FOREIGN KEY ("videoMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "novel_promotion_panels_lipSyncVideoMediaId_fkey" FOREIGN KEY ("lipSyncVideoMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "novel_promotion_panels_sketchImageMediaId_fkey" FOREIGN KEY ("sketchImageMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "novel_promotion_panels_previousImageMediaId_fkey" FOREIGN KEY ("previousImageMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "novel_promotion_panels_storyboardId_fkey" FOREIGN KEY ("storyboardId") REFERENCES "novel_promotion_storyboards" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "novel_promotion_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analysisModel" TEXT,
    "imageModel" TEXT,
    "videoModel" TEXT,
    "audioModel" TEXT,
    "videoRatio" TEXT NOT NULL DEFAULT '9:16',
    "ttsRate" TEXT NOT NULL DEFAULT '+50%',
    "globalAssetText" TEXT,
    "artStyle" TEXT NOT NULL DEFAULT 'american-comic',
    "artStylePrompt" TEXT,
    "characterModel" TEXT,
    "locationModel" TEXT,
    "storyboardModel" TEXT,
    "editModel" TEXT,
    "videoResolution" TEXT NOT NULL DEFAULT '720p',
    "capabilityOverrides" TEXT,
    "workflowMode" TEXT NOT NULL DEFAULT 'srt',
    "lastEpisodeId" TEXT,
    "imageResolution" TEXT NOT NULL DEFAULT '2K',
    "importStatus" TEXT,
    CONSTRAINT "novel_promotion_projects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "novel_promotion_shots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "clipId" TEXT,
    "shotId" TEXT NOT NULL,
    "srtStart" INTEGER NOT NULL,
    "srtEnd" INTEGER NOT NULL,
    "srtDuration" REAL NOT NULL,
    "sequence" TEXT,
    "locations" TEXT,
    "characters" TEXT,
    "plot" TEXT,
    "imagePrompt" TEXT,
    "scale" TEXT,
    "module" TEXT,
    "focus" TEXT,
    "zhSummarize" TEXT,
    "imageUrl" TEXT,
    "imageMediaId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pov" TEXT,
    CONSTRAINT "novel_promotion_shots_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "novel_promotion_shots_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "novel_promotion_clips" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "novel_promotion_shots_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "novel_promotion_episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "novel_promotion_storyboards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "storyboardImageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "panelCount" INTEGER NOT NULL DEFAULT 9,
    "storyboardTextJson" TEXT,
    "imageHistory" TEXT,
    "candidateImages" TEXT,
    "lastError" TEXT,
    "photographyPlan" TEXT,
    CONSTRAINT "novel_promotion_storyboards_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "novel_promotion_clips" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "novel_promotion_storyboards_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "novel_promotion_episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "supplementary_panels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storyboardId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourcePanelId" TEXT,
    "description" TEXT,
    "imagePrompt" TEXT,
    "imageUrl" TEXT,
    "imageMediaId" TEXT,
    "characters" TEXT,
    "location" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "supplementary_panels_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "supplementary_panels_storyboardId_fkey" FOREIGN KEY ("storyboardId") REFERENCES "novel_promotion_storyboards" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" DATETIME,
    CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "usage_costs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiType" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "cost" DECIMAL NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_costs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "usage_costs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "analysisModel" TEXT,
    "characterModel" TEXT,
    "locationModel" TEXT,
    "storyboardModel" TEXT,
    "editModel" TEXT,
    "videoModel" TEXT,
    "audioModel" TEXT,
    "lipSyncModel" TEXT,
    "voiceDesignModel" TEXT,
    "analysisConcurrency" INTEGER,
    "imageConcurrency" INTEGER,
    "videoConcurrency" INTEGER,
    "videoRatio" TEXT NOT NULL DEFAULT '9:16',
    "videoResolution" TEXT NOT NULL DEFAULT '720p',
    "artStyle" TEXT NOT NULL DEFAULT 'american-comic',
    "ttsRate" TEXT NOT NULL DEFAULT '+50%',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imageResolution" TEXT NOT NULL DEFAULT '2K',
    "capabilityDefaults" TEXT,
    "llmBaseUrl" TEXT DEFAULT 'https://openrouter.ai/api/v1',
    "llmApiKey" TEXT,
    "falApiKey" TEXT,
    "googleAiKey" TEXT,
    "arkApiKey" TEXT,
    "qwenApiKey" TEXT,
    "customModels" TEXT,
    "customProviders" TEXT,
    CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verificationtoken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "novel_promotion_voice_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "lineIndex" INTEGER NOT NULL,
    "speaker" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "voicePresetId" TEXT,
    "audioUrl" TEXT,
    "audioMediaId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emotionPrompt" TEXT,
    "emotionStrength" REAL DEFAULT 0.4,
    "matchedPanelIndex" INTEGER,
    "matchedStoryboardId" TEXT,
    "audioDuration" INTEGER,
    "matchedPanelId" TEXT,
    CONSTRAINT "novel_promotion_voice_lines_audioMediaId_fkey" FOREIGN KEY ("audioMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "novel_promotion_voice_lines_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "novel_promotion_episodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "novel_promotion_voice_lines_matchedPanelId_fkey" FOREIGN KEY ("matchedPanelId") REFERENCES "novel_promotion_panels" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "voice_presets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "audioMediaId" TEXT,
    "description" TEXT,
    "gender" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "voice_presets_audioMediaId_fkey" FOREIGN KEY ("audioMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_balances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL NOT NULL DEFAULT 0,
    "frozenAmount" DECIMAL NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "balance_freezes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT,
    "taskId" TEXT,
    "requestId" TEXT,
    "idempotencyKey" TEXT,
    "metadata" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "balance_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "balanceAfter" DECIMAL NOT NULL,
    "description" TEXT,
    "relatedId" TEXT,
    "freezeId" TEXT,
    "operatorId" TEXT,
    "externalOrderId" TEXT,
    "idempotencyKey" TEXT,
    "projectId" TEXT,
    "episodeId" TEXT,
    "taskType" TEXT,
    "billingMeta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "episodeId" TEXT,
    "type" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "dedupeKey" TEXT,
    "externalId" TEXT,
    "payload" JSONB,
    "result" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "billingInfo" JSONB,
    "billedAt" DATETIME,
    "queuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "heartbeatAt" DATETIME,
    "enqueuedAt" DATETIME,
    "enqueueAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastEnqueueError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "task_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "taskId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_events_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "task_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "graph_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "episodeId" TEXT,
    "workflowType" TEXT NOT NULL,
    "taskType" TEXT,
    "taskId" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "input" JSONB,
    "output" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "cancelRequestedAt" DATETIME,
    "leaseOwner" TEXT,
    "leaseExpiresAt" DATETIME,
    "heartbeatAt" DATETIME,
    "workflowVersion" INTEGER NOT NULL DEFAULT 1,
    "queuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "graph_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "graph_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "stepTitle" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "currentAttempt" INTEGER NOT NULL DEFAULT 0,
    "stepIndex" INTEGER NOT NULL,
    "stepTotal" INTEGER NOT NULL,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "graph_steps_runId_fkey" FOREIGN KEY ("runId") REFERENCES "graph_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "graph_step_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT,
    "modelKey" TEXT,
    "inputHash" TEXT,
    "input" JSONB,
    "outputText" TEXT,
    "outputReasoning" TEXT,
    "usageJson" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "graph_step_attempts_runId_fkey" FOREIGN KEY ("runId") REFERENCES "graph_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "graph_step_attempts_runId_stepKey_fkey" FOREIGN KEY ("runId", "stepKey") REFERENCES "graph_steps" ("runId", "stepKey") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "graph_events" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "stepKey" TEXT,
    "attempt" INTEGER,
    "lane" TEXT,
    "payload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "graph_events_runId_fkey" FOREIGN KEY ("runId") REFERENCES "graph_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "graph_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "graph_checkpoints" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "nodeKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "stateJson" JSONB NOT NULL,
    "stateBytes" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "graph_checkpoints_runId_fkey" FOREIGN KEY ("runId") REFERENCES "graph_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "graph_artifacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "stepKey" TEXT,
    "artifactType" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "versionHash" TEXT,
    "payload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "graph_artifacts_runId_fkey" FOREIGN KEY ("runId") REFERENCES "graph_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "global_asset_folders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "global_asset_folders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "global_characters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "aliases" TEXT,
    "profileData" TEXT,
    "profileConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "voiceId" TEXT,
    "voiceType" TEXT,
    "customVoiceUrl" TEXT,
    "customVoiceMediaId" TEXT,
    "globalVoiceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "global_characters_customVoiceMediaId_fkey" FOREIGN KEY ("customVoiceMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "global_characters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "global_characters_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "global_asset_folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "global_character_appearances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "characterId" TEXT NOT NULL,
    "appearanceIndex" INTEGER NOT NULL,
    "changeReason" TEXT NOT NULL DEFAULT 'default',
    "artStyle" TEXT,
    "description" TEXT,
    "descriptions" TEXT,
    "imageUrl" TEXT,
    "imageMediaId" TEXT,
    "imageUrls" TEXT,
    "selectedIndex" INTEGER,
    "previousImageUrl" TEXT,
    "previousImageMediaId" TEXT,
    "previousImageUrls" TEXT,
    "previousDescription" TEXT,
    "previousDescriptions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "global_character_appearances_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "global_character_appearances_previousImageMediaId_fkey" FOREIGN KEY ("previousImageMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "global_character_appearances_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "global_characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "global_locations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "artStyle" TEXT,
    "summary" TEXT,
    "assetKind" TEXT NOT NULL DEFAULT 'location',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "global_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "global_locations_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "global_asset_folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "global_location_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "imageIndex" INTEGER NOT NULL,
    "description" TEXT,
    "availableSlots" TEXT,
    "imageUrl" TEXT,
    "imageMediaId" TEXT,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "previousImageUrl" TEXT,
    "previousImageMediaId" TEXT,
    "previousDescription" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "global_location_images_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "global_location_images_previousImageMediaId_fkey" FOREIGN KEY ("previousImageMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "global_location_images_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "global_locations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "global_voices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "voiceId" TEXT,
    "voiceType" TEXT NOT NULL DEFAULT 'qwen-designed',
    "customVoiceUrl" TEXT,
    "customVoiceMediaId" TEXT,
    "voicePrompt" TEXT,
    "gender" TEXT,
    "language" TEXT NOT NULL DEFAULT 'zh',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "global_voices_customVoiceMediaId_fkey" FOREIGN KEY ("customVoiceMediaId") REFERENCES "media_objects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "global_voices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "global_voices_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "global_asset_folders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "media_objects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT,
    "mimeType" TEXT,
    "sizeBytes" BIGINT,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "legacy_media_refs_backup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "legacyValue" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_provider_providerAccountId_key" ON "account"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "character_appearances_characterId_idx" ON "character_appearances"("characterId");

-- CreateIndex
CREATE INDEX "character_appearances_imageMediaId_idx" ON "character_appearances"("imageMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "character_appearances_characterId_appearanceIndex_key" ON "character_appearances"("characterId", "appearanceIndex");

-- CreateIndex
CREATE INDEX "location_images_locationId_idx" ON "location_images"("locationId");

-- CreateIndex
CREATE INDEX "location_images_imageMediaId_idx" ON "location_images"("imageMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "location_images_locationId_imageIndex_key" ON "location_images"("locationId", "imageIndex");

-- CreateIndex
CREATE INDEX "novel_promotion_characters_novelPromotionProjectId_idx" ON "novel_promotion_characters"("novelPromotionProjectId");

-- CreateIndex
CREATE INDEX "novel_promotion_characters_customVoiceMediaId_idx" ON "novel_promotion_characters"("customVoiceMediaId");

-- CreateIndex
CREATE INDEX "novel_promotion_locations_novelPromotionProjectId_idx" ON "novel_promotion_locations"("novelPromotionProjectId");

-- CreateIndex
CREATE INDEX "novel_promotion_episodes_novelPromotionProjectId_idx" ON "novel_promotion_episodes"("novelPromotionProjectId");

-- CreateIndex
CREATE INDEX "novel_promotion_episodes_audioMediaId_idx" ON "novel_promotion_episodes"("audioMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "novel_promotion_episodes_novelPromotionProjectId_episodeNumber_key" ON "novel_promotion_episodes"("novelPromotionProjectId", "episodeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "video_editor_projects_episodeId_key" ON "video_editor_projects"("episodeId");

-- CreateIndex
CREATE INDEX "novel_promotion_clips_episodeId_idx" ON "novel_promotion_clips"("episodeId");

-- CreateIndex
CREATE INDEX "novel_promotion_panels_storyboardId_idx" ON "novel_promotion_panels"("storyboardId");

-- CreateIndex
CREATE INDEX "novel_promotion_panels_imageMediaId_idx" ON "novel_promotion_panels"("imageMediaId");

-- CreateIndex
CREATE INDEX "novel_promotion_panels_videoMediaId_idx" ON "novel_promotion_panels"("videoMediaId");

-- CreateIndex
CREATE INDEX "novel_promotion_panels_lipSyncVideoMediaId_idx" ON "novel_promotion_panels"("lipSyncVideoMediaId");

-- CreateIndex
CREATE INDEX "novel_promotion_panels_sketchImageMediaId_idx" ON "novel_promotion_panels"("sketchImageMediaId");

-- CreateIndex
CREATE INDEX "novel_promotion_panels_previousImageMediaId_idx" ON "novel_promotion_panels"("previousImageMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "novel_promotion_panels_storyboardId_panelIndex_key" ON "novel_promotion_panels"("storyboardId", "panelIndex");

-- CreateIndex
CREATE UNIQUE INDEX "novel_promotion_projects_projectId_key" ON "novel_promotion_projects"("projectId");

-- CreateIndex
CREATE INDEX "novel_promotion_shots_clipId_idx" ON "novel_promotion_shots"("clipId");

-- CreateIndex
CREATE INDEX "novel_promotion_shots_episodeId_idx" ON "novel_promotion_shots"("episodeId");

-- CreateIndex
CREATE INDEX "novel_promotion_shots_shotId_idx" ON "novel_promotion_shots"("shotId");

-- CreateIndex
CREATE INDEX "novel_promotion_shots_imageMediaId_idx" ON "novel_promotion_shots"("imageMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "novel_promotion_storyboards_clipId_key" ON "novel_promotion_storyboards"("clipId");

-- CreateIndex
CREATE INDEX "novel_promotion_storyboards_clipId_idx" ON "novel_promotion_storyboards"("clipId");

-- CreateIndex
CREATE INDEX "novel_promotion_storyboards_episodeId_idx" ON "novel_promotion_storyboards"("episodeId");

-- CreateIndex
CREATE INDEX "supplementary_panels_storyboardId_idx" ON "supplementary_panels"("storyboardId");

-- CreateIndex
CREATE INDEX "supplementary_panels_imageMediaId_idx" ON "supplementary_panels"("imageMediaId");

-- CreateIndex
CREATE INDEX "projects_userId_idx" ON "projects"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "session"("sessionToken");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "usage_costs_apiType_idx" ON "usage_costs"("apiType");

-- CreateIndex
CREATE INDEX "usage_costs_createdAt_idx" ON "usage_costs"("createdAt");

-- CreateIndex
CREATE INDEX "usage_costs_projectId_idx" ON "usage_costs"("projectId");

-- CreateIndex
CREATE INDEX "usage_costs_userId_idx" ON "usage_costs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "user"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "verificationtoken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtoken_identifier_token_key" ON "verificationtoken"("identifier", "token");

-- CreateIndex
CREATE INDEX "novel_promotion_voice_lines_episodeId_idx" ON "novel_promotion_voice_lines"("episodeId");

-- CreateIndex
CREATE INDEX "novel_promotion_voice_lines_matchedPanelId_idx" ON "novel_promotion_voice_lines"("matchedPanelId");

-- CreateIndex
CREATE INDEX "novel_promotion_voice_lines_audioMediaId_idx" ON "novel_promotion_voice_lines"("audioMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "novel_promotion_voice_lines_episodeId_lineIndex_key" ON "novel_promotion_voice_lines"("episodeId", "lineIndex");

-- CreateIndex
CREATE INDEX "voice_presets_audioMediaId_idx" ON "voice_presets"("audioMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "user_balances_userId_key" ON "user_balances"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "balance_freezes_idempotencyKey_key" ON "balance_freezes"("idempotencyKey");

-- CreateIndex
CREATE INDEX "balance_freezes_userId_idx" ON "balance_freezes"("userId");

-- CreateIndex
CREATE INDEX "balance_freezes_status_idx" ON "balance_freezes"("status");

-- CreateIndex
CREATE INDEX "balance_freezes_taskId_idx" ON "balance_freezes"("taskId");

-- CreateIndex
CREATE INDEX "balance_transactions_userId_idx" ON "balance_transactions"("userId");

-- CreateIndex
CREATE INDEX "balance_transactions_type_idx" ON "balance_transactions"("type");

-- CreateIndex
CREATE INDEX "balance_transactions_createdAt_idx" ON "balance_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "balance_transactions_freezeId_idx" ON "balance_transactions"("freezeId");

-- CreateIndex
CREATE INDEX "balance_transactions_externalOrderId_idx" ON "balance_transactions"("externalOrderId");

-- CreateIndex
CREATE INDEX "balance_transactions_projectId_idx" ON "balance_transactions"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "balance_transactions_userId_type_idempotencyKey_key" ON "balance_transactions"("userId", "type", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_dedupeKey_key" ON "tasks"("dedupeKey");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_type_idx" ON "tasks"("type");

-- CreateIndex
CREATE INDEX "tasks_targetType_targetId_idx" ON "tasks"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "tasks_projectId_idx" ON "tasks"("projectId");

-- CreateIndex
CREATE INDEX "tasks_userId_idx" ON "tasks"("userId");

-- CreateIndex
CREATE INDEX "tasks_heartbeatAt_idx" ON "tasks"("heartbeatAt");

-- CreateIndex
CREATE INDEX "task_events_projectId_id_idx" ON "task_events"("projectId", "id");

-- CreateIndex
CREATE INDEX "task_events_taskId_idx" ON "task_events"("taskId");

-- CreateIndex
CREATE INDEX "task_events_userId_idx" ON "task_events"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "graph_runs_taskId_key" ON "graph_runs"("taskId");

-- CreateIndex
CREATE INDEX "graph_runs_projectId_status_idx" ON "graph_runs"("projectId", "status");

-- CreateIndex
CREATE INDEX "graph_runs_userId_createdAt_idx" ON "graph_runs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "graph_runs_taskId_idx" ON "graph_runs"("taskId");

-- CreateIndex
CREATE INDEX "graph_runs_targetType_targetId_idx" ON "graph_runs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "graph_runs_workflowType_targetType_targetId_status_idx" ON "graph_runs"("workflowType", "targetType", "targetId", "status");

-- CreateIndex
CREATE INDEX "graph_runs_leaseExpiresAt_idx" ON "graph_runs"("leaseExpiresAt");

-- CreateIndex
CREATE INDEX "graph_steps_runId_status_idx" ON "graph_steps"("runId", "status");

-- CreateIndex
CREATE INDEX "graph_steps_runId_stepIndex_idx" ON "graph_steps"("runId", "stepIndex");

-- CreateIndex
CREATE UNIQUE INDEX "graph_steps_runId_stepKey_key" ON "graph_steps"("runId", "stepKey");

-- CreateIndex
CREATE INDEX "graph_step_attempts_runId_stepKey_idx" ON "graph_step_attempts"("runId", "stepKey");

-- CreateIndex
CREATE INDEX "graph_step_attempts_runId_createdAt_idx" ON "graph_step_attempts"("runId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "graph_step_attempts_runId_stepKey_attempt_key" ON "graph_step_attempts"("runId", "stepKey", "attempt");

-- CreateIndex
CREATE INDEX "graph_events_projectId_id_idx" ON "graph_events"("projectId", "id");

-- CreateIndex
CREATE INDEX "graph_events_runId_id_idx" ON "graph_events"("runId", "id");

-- CreateIndex
CREATE INDEX "graph_events_userId_id_idx" ON "graph_events"("userId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "graph_events_runId_seq_key" ON "graph_events"("runId", "seq");

-- CreateIndex
CREATE INDEX "graph_checkpoints_runId_createdAt_idx" ON "graph_checkpoints"("runId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "graph_checkpoints_runId_nodeKey_version_key" ON "graph_checkpoints"("runId", "nodeKey", "version");

-- CreateIndex
CREATE INDEX "graph_artifacts_runId_idx" ON "graph_artifacts"("runId");

-- CreateIndex
CREATE INDEX "graph_artifacts_runId_stepKey_idx" ON "graph_artifacts"("runId", "stepKey");

-- CreateIndex
CREATE INDEX "graph_artifacts_artifactType_refId_idx" ON "graph_artifacts"("artifactType", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "graph_artifacts_runId_stepKey_artifactType_refId_key" ON "graph_artifacts"("runId", "stepKey", "artifactType", "refId");

-- CreateIndex
CREATE INDEX "global_asset_folders_userId_idx" ON "global_asset_folders"("userId");

-- CreateIndex
CREATE INDEX "global_characters_userId_idx" ON "global_characters"("userId");

-- CreateIndex
CREATE INDEX "global_characters_folderId_idx" ON "global_characters"("folderId");

-- CreateIndex
CREATE INDEX "global_characters_customVoiceMediaId_idx" ON "global_characters"("customVoiceMediaId");

-- CreateIndex
CREATE INDEX "global_character_appearances_characterId_idx" ON "global_character_appearances"("characterId");

-- CreateIndex
CREATE INDEX "global_character_appearances_imageMediaId_idx" ON "global_character_appearances"("imageMediaId");

-- CreateIndex
CREATE INDEX "global_character_appearances_previousImageMediaId_idx" ON "global_character_appearances"("previousImageMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "global_character_appearances_characterId_appearanceIndex_key" ON "global_character_appearances"("characterId", "appearanceIndex");

-- CreateIndex
CREATE INDEX "global_locations_userId_idx" ON "global_locations"("userId");

-- CreateIndex
CREATE INDEX "global_locations_folderId_idx" ON "global_locations"("folderId");

-- CreateIndex
CREATE INDEX "global_location_images_locationId_idx" ON "global_location_images"("locationId");

-- CreateIndex
CREATE INDEX "global_location_images_imageMediaId_idx" ON "global_location_images"("imageMediaId");

-- CreateIndex
CREATE INDEX "global_location_images_previousImageMediaId_idx" ON "global_location_images"("previousImageMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "global_location_images_locationId_imageIndex_key" ON "global_location_images"("locationId", "imageIndex");

-- CreateIndex
CREATE INDEX "global_voices_userId_idx" ON "global_voices"("userId");

-- CreateIndex
CREATE INDEX "global_voices_folderId_idx" ON "global_voices"("folderId");

-- CreateIndex
CREATE INDEX "global_voices_customVoiceMediaId_idx" ON "global_voices"("customVoiceMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "media_objects_publicId_key" ON "media_objects"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "media_objects_storageKey_key" ON "media_objects"("storageKey");

-- CreateIndex
CREATE INDEX "media_objects_createdAt_idx" ON "media_objects"("createdAt");

-- CreateIndex
CREATE INDEX "legacy_media_refs_backup_runId_idx" ON "legacy_media_refs_backup"("runId");

-- CreateIndex
CREATE INDEX "legacy_media_refs_backup_tableName_fieldName_idx" ON "legacy_media_refs_backup"("tableName", "fieldName");

