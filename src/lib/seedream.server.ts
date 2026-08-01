import "@tanstack/react-start/server-only"
import { env } from "cloudflare:workers"

export const IMAGE_GENERATION_MODEL = "bytedance-seed/seedream-4.5"

const OPENROUTER_IMAGE_GENERATION_URL = "https://openrouter.ai/api/v1/images"
const IMAGE_GENERATION_ASPECT_RATIO = "3:4"
const IMAGE_GENERATION_RESOLUTION = "2K"
const IMAGE_GENERATION_TIMEOUT_MS = 90_000

interface GenerateImageOptions {
  imageBase64: string
  prompt: string
}

interface OpenRouterImageGenerationResponse {
  data?: Array<{
    b64_json?: string
    media_type?: string
  }>
  error?: {
    message?: string
    code?: string
    type?: string
  }
}

const DEFAULT_IMAGE_CONTENT_TYPE = "image/png"

function getImageExtension(contentType: string): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg"
    case "image/webp":
      return "webp"
    case "image/png":
      return "png"
    default:
      return "png"
  }
}

function decodeBase64Image(base64Image: string): Uint8Array {
  const binaryImage = atob(base64Image)
  const bytes = new Uint8Array(binaryImage.length)

  for (let index = 0; index < binaryImage.length; index += 1) {
    bytes[index] = binaryImage.charCodeAt(index)
  }

  return bytes
}

async function storeGeneratedImage({
  base64Image,
  contentType,
}: {
  base64Image: string
  contentType: string
}): Promise<string> {
  const imageKey = `${env.R2_IMAGE_PREFIX}${crypto.randomUUID()}.${getImageExtension(contentType)}`

  await env.IMAGE_BUCKET.put(imageKey, decodeBase64Image(base64Image), {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=86400",
    },
  })

  return new URL(imageKey, `${env.R2_PUBLIC_BASE_URL}/`).toString()
}

function getOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured")
  }

  return apiKey
}

export async function generateImage({
  imageBase64,
  prompt,
}: GenerateImageOptions): Promise<string> {
  const apiKey = getOpenRouterApiKey()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), IMAGE_GENERATION_TIMEOUT_MS)

  try {
    const response = await fetch(OPENROUTER_IMAGE_GENERATION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: IMAGE_GENERATION_MODEL,
        prompt,
        input_references: [
          {
            type: "image_url",
            image_url: { url: imageBase64 },
          },
        ],
        aspect_ratio: IMAGE_GENERATION_ASPECT_RATIO,
        resolution: IMAGE_GENERATION_RESOLUTION,
        n: 1,
      }),
      signal: controller.signal,
    })

    const responseText = await response.text()
    let payload: OpenRouterImageGenerationResponse | null = null

    try {
      payload = responseText
        ? (JSON.parse(responseText) as OpenRouterImageGenerationResponse)
        : null
    } catch (parseError: unknown) {
      console.error("Failed to parse OpenRouter image response JSON", {
        status: response.status,
        responseText,
        parseError,
      })
    }

    if (!response.ok) {
      const apiMessage = payload?.error?.message ?? responseText
      throw new Error(`OpenRouter image API error ${response.status}: ${apiMessage}`)
    }

    const resultImage = payload?.data?.[0]

    if (!resultImage?.b64_json) {
      console.error("OpenRouter image response missing base64 data", { payload })
      throw new Error("OpenRouter did not return generated image data")
    }

    return await storeGeneratedImage({
      base64Image: resultImage.b64_json,
      contentType: resultImage.media_type ?? DEFAULT_IMAGE_CONTENT_TYPE,
    })
  } catch (generationError: unknown) {
    console.error("OpenRouter Seedream image generation request failed", {
      model: IMAGE_GENERATION_MODEL,
      endpoint: OPENROUTER_IMAGE_GENERATION_URL,
      aspectRatio: IMAGE_GENERATION_ASPECT_RATIO,
      resolution: IMAGE_GENERATION_RESOLUTION,
      hasImage: Boolean(imageBase64),
      promptLength: prompt.length,
      generationError,
    })

    if (generationError instanceof DOMException && generationError.name === "AbortError") {
      throw new Error("生成超时，请重试", { cause: generationError })
    }

    throw generationError
  } finally {
    clearTimeout(timeout)
  }
}
