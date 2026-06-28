'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { AppIcon, IconGradientDefs, type AppIconName } from '@/components/ui/icons'
import StoryInputComposer from '@/components/story-input/StoryInputComposer'
import AiWriteModal from '@/components/home/AiWriteModal'
import { Link, useRouter } from '@/i18n/navigation'
import { ART_STYLES, VIDEO_RATIOS } from '@/lib/constants'
import { DEFAULT_STYLE_PRESET_VALUE, STYLE_PRESETS } from '@/lib/style-presets'
import { apiFetch } from '@/lib/api-fetch'
import { createHomeProjectLaunch } from '@/lib/home/create-project-launch'
import { expandHomeStory } from '@/lib/home/ai-story-expand'
import { formatDefaultProjectTimestamp } from '@/lib/projects/default-name'
import { HOME_QUICK_START_MIN_ROWS } from '@/lib/ui/textarea-height'

interface ProjectStats {
  episodes: number
  images: number
  videos: number
  panels: number
  firstEpisodePreview: string | null
}

interface Project {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  stats?: ProjectStats
}

const RECENT_COUNT = 6

const agentStages: {
  icon: AppIconName
  title: string
  detail: string
}[] = [
  { icon: 'brain', title: '故事理解', detail: '解析题材、人物、冲突和短视频节奏' },
  { icon: 'fileText', title: '剧本拆分', detail: '生成集数、旁白、对白和镜头动作' },
  { icon: 'clapperboard', title: '分镜生成', detail: '把脚本拆成可执行的画面镜头' },
  { icon: 'usersRound', title: '角色场景', detail: '统一角色外观、场景资产和风格' },
  { icon: 'mic', title: '配音口型', detail: '生成音色、台词音频和口型同步' },
  { icon: 'video', title: '视频合成', detail: '整理镜头、渲染并导出成片' },
]

const promptTemplates = [
  '都市逆袭短剧：外卖员意外获得未来三小时记忆，第一集要有强反转。',
  '古风悬疑：女仵作在雨夜发现皇榜案线索，做成 60 秒竖屏短剧。',
  '科幻亲情：失忆机器人替小女孩完成生日愿望，结尾温暖但不煽情。',
] as const

function formatTimeAgo(dateString: string): string {
  const timestamp = new Date(dateString).getTime()
  if (Number.isNaN(timestamp)) return '刚刚更新'
  const diffMs = Date.now() - timestamp
  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)
  if (minutes < 1) return '刚刚更新'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  return `${days} 天前`
}

export default function AgentDesktopPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectError, setProjectError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [videoRatio, setVideoRatio] = useState('9:16')
  const [artStyle, setArtStyle] = useState('american-comic')
  const [stylePresetValue, setStylePresetValue] = useState<string>(DEFAULT_STYLE_PRESET_VALUE)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [aiWriteOpen, setAiWriteOpen] = useState(false)
  const [aiWriteLoading, setAiWriteLoading] = useState(false)

  const ratioOptions = useMemo(
    () => VIDEO_RATIOS.map((ratio) => ({ ...ratio, recommended: ratio.value === '9:16' })),
    [],
  )

  const styleOptions = useMemo(
    () => ART_STYLES.map((style) => ({ ...style, recommended: style.value === 'realistic' })),
    [],
  )

  const fetchRecentProjects = useCallback(async () => {
    setProjectsLoading(true)
    setProjectError(null)
    try {
      const params = new URLSearchParams({
        page: '1',
        pageSize: RECENT_COUNT.toString(),
      })
      const response = await apiFetch(`/api/projects?${params}`)
      if (!response.ok) {
        throw new Error(`项目列表读取失败 (${response.status})`)
      }
      const data = await response.json() as { projects?: Project[] }
      setProjects(Array.isArray(data.projects) ? data.projects : [])
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : '项目列表读取失败')
      setProjects([])
    } finally {
      setProjectsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchRecentProjects()
  }, [fetchRecentProjects])

  const handleCreate = async () => {
    if (!inputValue.trim() || createLoading) return
    setCreateError(null)
    setCreateLoading(true)
    try {
      const result = await createHomeProjectLaunch({
        apiFetch,
        projectName: `Agent 项目 ${formatDefaultProjectTimestamp(new Date())}`,
        storyText: inputValue.trim(),
        videoRatio,
        artStyle,
        episodeName: '第 1 集',
      })
      router.push(result.target)
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Agent 项目创建失败')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleAiWriteStart = async (prompt: string) => {
    if (aiWriteLoading) return
    setCreateError(null)
    setAiWriteLoading(true)
    try {
      const result = await expandHomeStory({ apiFetch, prompt })
      setInputValue(result.expandedText)
      setAiWriteOpen(false)
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'AI 补全失败，请先检查模型配置')
    } finally {
      setAiWriteLoading(false)
    }
  }

  return (
    <div className="glass-page min-h-screen overflow-hidden text-[var(--glass-text-primary)]">
      <IconGradientDefs className="absolute h-0 w-0" aria-hidden="true" />

      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
        <aside className="hidden border-r border-[var(--glass-stroke-soft)] bg-[var(--glass-bg-nav)]/95 px-4 py-5 lg:flex lg:flex-col">
          <div className="mb-6 flex items-center gap-3">
            <Image src="/logo-small.png?v=1" alt="AI Video Agent" width={44} height={44} className="rounded-xl" />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">AI Video Agent</div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--glass-tone-success-fg)]">
                <span className="h-2 w-2 rounded-full bg-[var(--glass-tone-success-fg)]" />
                本地 Agent
              </div>
            </div>
          </div>

          <nav className="space-y-1.5">
            <Link href={{ pathname: '/agent' }} className="glass-btn-base glass-btn-primary flex h-10 items-center justify-start gap-2 px-3 text-sm">
              <AppIcon name="sparkles" className="h-4 w-4" />
              Agent 工作台
            </Link>
            <Link href={{ pathname: '/workspace' }} className="glass-btn-base flex h-10 items-center justify-start gap-2 px-3 text-sm">
              <AppIcon name="monitor" className="h-4 w-4" />
              项目工作区
            </Link>
            <Link href={{ pathname: '/workspace/asset-hub' }} className="glass-btn-base flex h-10 items-center justify-start gap-2 px-3 text-sm">
              <AppIcon name="folderHeart" className="h-4 w-4" />
              资产中心
            </Link>
            <Link href={{ pathname: '/profile' }} className="glass-btn-base flex h-10 items-center justify-start gap-2 px-3 text-sm">
              <AppIcon name="settingsHex" className="h-4 w-4" />
              模型配置
            </Link>
          </nav>

          <div className="mt-6 rounded-xl border border-[var(--glass-stroke-soft)] bg-[var(--glass-bg-muted)] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--glass-text-secondary)]">
              <AppIcon name="cpu" className="h-4 w-4 text-[var(--glass-tone-info-fg)]" />
              本地运行
            </div>
            <p className="text-xs leading-5 text-[var(--glass-text-tertiary)]">
              数据库、上传文件和任务队列都在本机运行，打开 exe 后即可进入 Agent 流程。
            </p>
          </div>

          <div className="mt-auto rounded-xl border border-[var(--glass-stroke-soft)] bg-[var(--glass-bg-surface)] p-3">
            <div className="text-xs font-semibold text-[var(--glass-text-secondary)]">下一步</div>
            <p className="mt-1 text-xs leading-5 text-[var(--glass-text-tertiary)]">
              先配置模型 Key，再把故事粘进命令区，Agent 会创建项目并进入自动分镜流程。
            </p>
          </div>
        </aside>

        <main className="min-w-0 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 lg:hidden">
              <Image src="/logo-small.png?v=1" alt="AI Video Agent" width={40} height={40} />
              <div>
                <div className="text-sm font-bold">AI Video Agent</div>
                <div className="text-xs text-[var(--glass-tone-success-fg)]">本地 Agent</div>
              </div>
            </div>
            <div className="hidden min-w-0 lg:block">
              <h1 className="text-2xl font-bold tracking-normal">Agent 创作控制台</h1>
              <p className="mt-1 text-sm text-[var(--glass-text-tertiary)]">从故事输入到视频导出，桌面端直接调度本地任务流。</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={{ pathname: '/profile' }} className="glass-btn-base h-9 px-3 text-sm">
                <AppIcon name="settingsHex" className="h-4 w-4" />
                模型配置
              </Link>
              <button
                type="button"
                onClick={() => void fetchRecentProjects()}
                disabled={projectsLoading}
                className="glass-btn-base h-9 px-3 text-sm disabled:opacity-50"
                title="刷新项目"
              >
                <AppIcon name="refresh" className={`h-4 w-4 ${projectsLoading ? 'animate-spin' : ''}`} />
                刷新
              </button>
            </div>
          </header>

          <section className="mb-5 rounded-2xl border border-[var(--glass-stroke-soft)] bg-[var(--glass-bg-surface-strong)] p-4 shadow-[var(--glass-shadow-sm)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--glass-text-secondary)]">
                  <AppIcon name="brain" className="h-4 w-4 text-[var(--glass-tone-info-fg)]" />
                  Agent 命令区
                </div>
                <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">输入故事、脚本或一句创意，Agent 会创建项目并进入工作流。</p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-[var(--glass-tone-success-bg)] px-3 py-1 text-xs font-medium text-[var(--glass-tone-success-fg)]">
                <AppIcon name="badgeCheck" className="h-3.5 w-3.5" />
                本地身份已启用
              </div>
            </div>

            <StoryInputComposer
              value={inputValue}
              onValueChange={(nextValue) => {
                setInputValue(nextValue)
                if (createError) setCreateError(null)
              }}
              placeholder="把短剧创意、小说片段或视频脚本贴到这里。Agent 会先建立项目，再把内容送入故事拆解和分镜工作流。"
              minRows={HOME_QUICK_START_MIN_ROWS}
              textareaClassName="px-0 pt-0 pb-3 align-top"
              videoRatio={videoRatio}
              onVideoRatioChange={setVideoRatio}
              ratioOptions={ratioOptions}
              artStyle={artStyle}
              onArtStyleChange={setArtStyle}
              styleOptions={styleOptions}
              stylePresetValue={stylePresetValue}
              onStylePresetChange={setStylePresetValue}
              stylePresetOptions={STYLE_PRESETS}
              primaryAction={(
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={!inputValue.trim() || createLoading}
                  className="glass-btn-base glass-btn-primary h-10 flex-shrink-0 px-5 text-sm disabled:opacity-50"
                >
                  {createLoading ? '启动中' : '交给 Agent'}
                  <AppIcon name="arrowRight" className="h-4 w-4" />
                </button>
              )}
              secondaryActions={(
                <button
                  type="button"
                  onClick={() => setAiWriteOpen(true)}
                  disabled={createLoading || aiWriteLoading}
                  className="glass-btn-base flex h-10 flex-shrink-0 items-center gap-1.5 border border-[var(--glass-stroke-strong)] px-3 text-sm transition-all hover:border-[var(--glass-tone-info-fg)]/40 disabled:opacity-50"
                >
                  <AppIcon name="sparklesAlt" className="h-4 w-4 text-[var(--glass-tone-info-fg)]" />
                  AI 补全
                </button>
              )}
              footer={createError ? (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                  {createError}
                </p>
              ) : null}
            />
          </section>

          <section className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-3">
            {promptTemplates.map((template, index) => (
              <button
                key={template}
                type="button"
                onClick={() => setInputValue(template)}
                className="rounded-xl border border-[var(--glass-stroke-soft)] bg-[var(--glass-bg-surface)] p-3 text-left transition hover:border-[var(--glass-stroke-focus)] hover:bg-[var(--glass-bg-surface-strong)]"
              >
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--glass-text-secondary)]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]">
                    {index + 1}
                  </span>
                  快速创意
                </div>
                <p className="text-xs leading-5 text-[var(--glass-text-tertiary)]">{template}</p>
              </button>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-3 xl:grid-cols-6">
            {agentStages.map((stage, index) => (
              <div
                key={stage.title}
                className="rounded-xl border border-[var(--glass-stroke-soft)] bg-[var(--glass-bg-surface)] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <AppIcon name={stage.icon} className="h-4 w-4 text-[var(--glass-tone-info-fg)]" />
                  <span className="text-[10px] font-semibold text-[var(--glass-text-tertiary)]">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <div className="text-sm font-semibold text-[var(--glass-text-primary)]">{stage.title}</div>
                <p className="mt-1 text-xs leading-5 text-[var(--glass-text-tertiary)]">{stage.detail}</p>
              </div>
            ))}
          </section>
        </main>

        <aside className="min-w-0 border-t border-[var(--glass-stroke-soft)] bg-[var(--glass-bg-surface)]/75 px-4 py-5 lg:border-l lg:border-t-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">最近项目</h2>
              <p className="mt-1 text-xs text-[var(--glass-text-tertiary)]">继续上次的分镜、配音或视频合成。</p>
            </div>
            <Link href={{ pathname: '/workspace' }} className="text-xs font-medium text-[var(--glass-tone-info-fg)] hover:underline">
              全部
            </Link>
          </div>

          {projectsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-xl bg-[var(--glass-bg-muted)]" />
              ))}
            </div>
          ) : projectError ? (
            <div className="rounded-xl border border-[var(--glass-tone-warning-fg)]/20 bg-[var(--glass-tone-warning-bg)] p-3 text-sm text-[var(--glass-tone-warning-fg)]">
              {projectError}
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--glass-stroke-strong)] p-6 text-center">
              <AppIcon name="folderOpen" className="mx-auto mb-3 h-8 w-8 text-[var(--glass-text-tertiary)]" />
              <p className="text-sm font-medium text-[var(--glass-text-secondary)]">还没有项目</p>
              <p className="mt-1 text-xs leading-5 text-[var(--glass-text-tertiary)]">在左侧命令区输入故事，Agent 会自动创建第一个项目。</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={{ pathname: `/workspace/${project.id}` }}
                  className="block rounded-xl border border-[var(--glass-stroke-soft)] bg-[var(--glass-bg-surface-strong)] p-3 transition hover:border-[var(--glass-stroke-focus)]"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{project.name}</h3>
                    <AppIcon name="arrowRight" className="h-4 w-4 shrink-0 text-[var(--glass-text-tertiary)]" />
                  </div>
                  {(project.description || project.stats?.firstEpisodePreview) ? (
                    <p className="line-clamp-2 text-xs leading-5 text-[var(--glass-text-tertiary)]">
                      {project.description || project.stats?.firstEpisodePreview}
                    </p>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--glass-text-tertiary)]">
                    <span className="flex items-center gap-1">
                      <AppIcon name="clock" className="h-3.5 w-3.5" />
                      {formatTimeAgo(project.updatedAt)}
                    </span>
                    {project.stats ? (
                      <span className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <AppIcon name="fileText" className="h-3.5 w-3.5" />
                          {project.stats.episodes}
                        </span>
                        <span className="flex items-center gap-1">
                          <AppIcon name="image" className="h-3.5 w-3.5" />
                          {project.stats.images}
                        </span>
                        <span className="flex items-center gap-1">
                          <AppIcon name="video" className="h-3.5 w-3.5" />
                          {project.stats.videos}
                        </span>
                      </span>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>

      <AiWriteModal
        open={aiWriteOpen}
        loading={aiWriteLoading}
        onClose={() => setAiWriteOpen(false)}
        onStart={(prompt) => void handleAiWriteStart(prompt)}
        t={(key: string) => {
          const labels: Record<string, string> = {
            title: 'AI 补全故事',
            description: '输入一句创意，Agent 会扩写成可进入工作流的故事梗概。',
            placeholder: '例如：一个普通人突然能听到未来新闻，但每次改变命运都会失去一段记忆。',
            start: '开始生成',
            loading: '生成中',
            close: '关闭',
          }
          return labels[key] ?? key
        }}
      />
    </div>
  )
}
