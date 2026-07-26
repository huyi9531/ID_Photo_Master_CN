import "@tanstack/react-start/server-only"

export const IMAGE_GENERATION_MODEL = "doubao-seedream-4-5-251128"

const ARK_IMAGE_GENERATION_URL =
  "https://ark.cn-beijing.volces.com/api/v3/images/generations"
const IMAGE_GENERATION_SIZE = "3072x4096"
const IMAGE_GENERATION_TIMEOUT_MS = 90_000

interface GenerateImageOptions {
  imageBase64: string
  prompt: string
}

interface ArkImageGenerationResponse {
  data?: Array<{
    url?: string
    b64_json?: string
    size?: string
  }>
  error?: {
    message?: string
    code?: string
    type?: string
  }
}

function getArkApiKey(): string {
  const apiKey = process.env.ARK_API_KEY

  if (!apiKey) {
    throw new Error("ARK_API_KEY is not configured")
  }

  return apiKey
}

export async function generateImage({
  imageBase64,
  prompt,
}: GenerateImageOptions): Promise<string> {
  const apiKey = getArkApiKey()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), IMAGE_GENERATION_TIMEOUT_MS)

  try {
    const response = await fetch(ARK_IMAGE_GENERATION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: IMAGE_GENERATION_MODEL,
        prompt,
        image: [imageBase64],
        size: IMAGE_GENERATION_SIZE,
        response_format: "url",
        watermark: false,
      }),
      signal: controller.signal,
    })

    const responseText = await response.text()
    let payload: ArkImageGenerationResponse | null = null

    try {
      payload = responseText
        ? (JSON.parse(responseText) as ArkImageGenerationResponse)
        : null
    } catch (parseError: unknown) {
      console.error("Failed to parse Seedream response JSON", {
        status: response.status,
        responseText,
        parseError,
      })
    }

    if (!response.ok) {
      const apiMessage = payload?.error?.message ?? responseText
      throw new Error(`Seedream API error ${response.status}: ${apiMessage}`)
    }

    const resultImageUrl = payload?.data?.[0]?.url

    if (!resultImageUrl) {
      console.error("Seedream response missing image URL", { payload })
      throw new Error("Seedream API did not return an image URL")
    }

    return resultImageUrl
  } catch (generationError: unknown) {
    console.error("Seedream image generation request failed", {
      model: IMAGE_GENERATION_MODEL,
      endpoint: ARK_IMAGE_GENERATION_URL,
      size: IMAGE_GENERATION_SIZE,
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
