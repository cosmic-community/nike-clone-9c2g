import { cookies } from 'next/headers'
import { createBucketClient } from '@cosmicjs/sdk'

export const COSMIC_PREVIEW_COOKIE = 'cosmic_preview'

export async function getPreviewToken(): Promise<string | undefined> {
  try {
    const store = await cookies()
    return store.get(COSMIC_PREVIEW_COOKIE)?.value
  } catch {
    return undefined
  }
}

export async function getCosmic(previewToken?: string) {
  const token = previewToken || (await getPreviewToken())
  const cosmic = createBucketClient({
    bucketSlug: process.env.COSMIC_BUCKET_SLUG as string,
    readKey: process.env.COSMIC_READ_KEY as string,
    writeKey: process.env.COSMIC_WRITE_KEY,
    ...(token ? { previewToken: token } : {}),
  })
  return { cosmic, previewToken: token }
}
