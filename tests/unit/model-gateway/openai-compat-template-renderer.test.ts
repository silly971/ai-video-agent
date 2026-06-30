import { describe, expect, it } from 'vitest'
import {
  buildRenderedTemplateRequest,
  buildTemplateVariables,
  extractTemplateError,
  readJsonPath,
  renderTemplateString,
  renderTemplateValue,
  resolveTemplateEndpointUrl,
} from '@/lib/openai-compat-template-runtime'

describe('model-gateway openai-compat template renderer', () => {
  it('renders placeholders in strings and nested body values', () => {
    const variables = buildTemplateVariables({
      model: 'veo3.1',
      prompt: 'a cat running',
      image: 'https://a.test/cat.png',
      taskId: 'task_1',
    })

    expect(renderTemplateString('/videos/{{task_id}}', variables)).toBe('/videos/task_1')
    expect(renderTemplateValue({
      model: '{{model}}',
      prompt: '{{prompt}}',
      images: '{{images}}',
      nested: [{ value: '{{task_id}}' }],
    }, variables)).toEqual({
      model: 'veo3.1',
      prompt: 'a cat running',
      images: [],
      nested: [{ value: 'task_1' }],
    })
  })

  it('resolves relative path against base url and injects auth header', async () => {
    const request = await buildRenderedTemplateRequest({
      baseUrl: 'https://compat.example.com/v1/',
      endpoint: {
        method: 'POST',
        path: '/v2/videos/generations',
        contentType: 'application/json',
        bodyTemplate: {
          model: '{{model}}',
          prompt: '{{prompt}}',
        },
      },
      variables: buildTemplateVariables({
        model: 'veo3.1',
        prompt: 'hello',
      }),
      defaultAuthHeader: 'Bearer sk-test',
    })

    expect(resolveTemplateEndpointUrl('https://compat.example.com/v1/', '/v2/videos/generations'))
      .toBe('https://compat.example.com/v1/v2/videos/generations')
    expect(request.endpointUrl).toBe('https://compat.example.com/v1/v2/videos/generations')
    expect(request.headers.Authorization).toBe('Bearer sk-test')
    expect(request.headers['Content-Type']).toBe('application/json')
    expect(request.body).toBe(JSON.stringify({
      model: 'veo3.1',
      prompt: 'hello',
    }))
  })

  it('renders image quality and seedance video content into JSON bodies', async () => {
    const imageRequest = await buildRenderedTemplateRequest({
      baseUrl: 'https://compat.example.com/v1',
      endpoint: {
        method: 'POST',
        path: '/images/generations',
        contentType: 'application/json',
        bodyTemplate: {
          model: '{{model}}',
          prompt: '{{prompt}}',
          size: '{{size}}',
          quality: '{{quality}}',
        },
      },
      variables: buildTemplateVariables({
        model: 'gpt-image-1',
        prompt: 'poster',
        size: '1024x1024',
        extra: { quality: 'high' },
      }),
      defaultAuthHeader: 'Bearer sk-test',
    })

    expect(imageRequest.body).toBe(JSON.stringify({
      model: 'gpt-image-1',
      prompt: 'poster',
      size: '1024x1024',
      quality: 'high',
    }))

    const videoRequest = await buildRenderedTemplateRequest({
      baseUrl: 'https://seedance.example.com/v1',
      endpoint: {
        method: 'POST',
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
      variables: buildTemplateVariables({
        model: 'doubao-seedance-2-0-260128',
        prompt: 'animate',
        image: 'https://cdn.example.com/start.png',
        aspectRatio: '16:9',
        resolution: '720p',
        duration: 5,
        extra: {
          generateAudio: false,
          watermark: true,
        },
      }),
      defaultAuthHeader: 'Bearer sk-test',
    })

    expect(videoRequest.body).toBe(JSON.stringify({
      model: 'doubao-seedance-2-0-260128',
      prompt: 'animate',
      resolution: '720p',
      ratio: '16:9',
      duration: 5,
      generate_audio: false,
      watermark: true,
      content: [
        {
          type: 'image_url',
          role: 'first_frame',
          image_url: { url: 'https://cdn.example.com/start.png' },
        },
      ],
    }))
  })

  it('renders Seedance reference image mode as reference_image content', async () => {
    const request = await buildRenderedTemplateRequest({
      baseUrl: 'https://seedance.example.com/v1',
      endpoint: {
        method: 'POST',
        path: '/videos',
        contentType: 'application/json',
        bodyTemplate: {
          model: '{{model}}',
          prompt: '{{prompt}}',
          content: '{{content}}',
        },
      },
      variables: buildTemplateVariables({
        model: 'seedance-2-fast',
        prompt: 'keep the anime style',
        image: 'data:image/png;base64,AAAA',
        extra: {
          generationMode: 'reference_image',
        },
      }),
      defaultAuthHeader: 'Bearer sk-test',
    })

    expect(request.body).toBe(JSON.stringify({
      model: 'seedance-2-fast',
      prompt: 'keep the anime style',
      content: [
        {
          type: 'image_url',
          role: 'reference_image',
          image_url: { url: 'data:image/png;base64,AAAA' },
        },
      ],
    }))
  })

  it('deduplicates /v1 prefix when base url already ends with /v1', async () => {
    const request = await buildRenderedTemplateRequest({
      baseUrl: 'https://yunwu.ai/v1',
      endpoint: {
        method: 'GET',
        path: '/v1/video/query?id={{task_id}}',
      },
      variables: buildTemplateVariables({
        model: 'veo_3_1-fast-4K',
        prompt: '',
        taskId: 'task_abc',
      }),
      defaultAuthHeader: 'Bearer sk-test',
    })

    expect(resolveTemplateEndpointUrl('https://yunwu.ai/v1', '/v1/video/create'))
      .toBe('https://yunwu.ai/v1/video/create')
    expect(request.endpointUrl).toBe('https://yunwu.ai/v1/video/query?id=task_abc')
    expect(request.headers.Authorization).toBe('Bearer sk-test')
  })

  it('builds multipart form data and omits explicit content-type header', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO0p6s8AAAAASUVORK5CYII='
    const request = await buildRenderedTemplateRequest({
      baseUrl: 'https://compat.example.com/v1',
      endpoint: {
        method: 'POST',
        path: '/videos',
        contentType: 'multipart/form-data',
        multipartFileFields: ['input_reference'],
        bodyTemplate: {
          model: '{{model}}',
          prompt: '{{prompt}}',
          input_reference: '{{image}}',
        },
      },
      variables: buildTemplateVariables({
        model: 'veo3.1',
        prompt: 'hello',
        image: dataUrl,
      }),
      defaultAuthHeader: 'Bearer sk-test',
    })

    expect(request.endpointUrl).toBe('https://compat.example.com/v1/videos')
    expect(request.headers.Authorization).toBe('Bearer sk-test')
    expect(request.headers['Content-Type']).toBeUndefined()
    expect(request.body).toBeInstanceOf(FormData)

    const formData = request.body as FormData
    expect(formData.get('model')).toBe('veo3.1')
    expect(formData.get('prompt')).toBe('hello')
    const fileValue = formData.get('input_reference')
    expect(fileValue).toBeInstanceOf(File)
    expect((fileValue as File).name).toBe('reference-0.png')
  })

  it('builds application/x-www-form-urlencoded bodies', async () => {
    const request = await buildRenderedTemplateRequest({
      baseUrl: 'https://compat.example.com/v1',
      endpoint: {
        method: 'POST',
        path: '/videos/query',
        contentType: 'application/x-www-form-urlencoded',
        bodyTemplate: {
          model: '{{model}}',
          task_id: '{{task_id}}',
        },
      },
      variables: buildTemplateVariables({
        model: 'veo3.1',
        prompt: 'hello',
        taskId: 'task_1',
      }),
    })

    expect(request.headers['Content-Type']).toBe('application/x-www-form-urlencoded')
    expect(request.body).toBeInstanceOf(URLSearchParams)
    expect((request.body as URLSearchParams).toString()).toBe('model=veo3.1&task_id=task_1')
  })

  it('reads json path for array/object outputs', () => {
    const payload = {
      data: [{ url: 'https://cdn.test/1.png' }],
      task: {
        status: 'succeeded',
      },
    }
    expect(readJsonPath(payload, '$.data[0].url')).toBe('https://cdn.test/1.png')
    expect(readJsonPath(payload, '$.task.status')).toBe('succeeded')
  })

  it('extracts upstream error message from common payload shape', () => {
    const message = extractTemplateError({
      version: 1,
      mediaType: 'video',
      mode: 'async',
      create: {
        method: 'POST',
        path: '/video/create',
      },
      status: {
        method: 'GET',
        path: '/video/query?id={{task_id}}',
      },
      response: {
        taskIdPath: '$.id',
        statusPath: '$.status',
      },
      polling: {
        intervalMs: 5000,
        timeoutMs: 600000,
        doneStates: ['completed'],
        failStates: ['failed'],
      },
    }, {
      error: {
        message_zh: '当前分组上游负载已饱和，请稍后再试',
      },
    }, 500)

    expect(message).toContain('status 500')
    expect(message).toContain('当前分组上游负载已饱和，请稍后再试')
  })
})
