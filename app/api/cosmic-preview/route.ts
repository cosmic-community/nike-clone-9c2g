import { NextRequest, NextResponse } from 'next/server'
import { createBucketClient } from '@cosmicjs/sdk'

export async function GET(request: NextRequest) {
  const objectId = request.nextUrl.searchParams.get('object_id')
  const previewToken = request.nextUrl.searchParams.get('preview_token')
  if (!objectId || !previewToken) {
    return NextResponse.json(
      { error: 'object_id and preview_token are required' },
      { status: 400 },
    )
  }

  const cosmic = createBucketClient({
    bucketSlug: process.env.COSMIC_BUCKET_SLUG as string,
    readKey: process.env.COSMIC_READ_KEY as string,
    previewToken,
  })

  try {
    const { object } = await cosmic.objects
      .findOne({ id: objectId })
      .props(['id', 'slug', 'type'])
      .status('any')
    if (!object?.slug) {
      return NextResponse.json({ error: 'Object not found' }, { status: 404 })
    }
    const typeSlug = object.type
    const path = typeSlug ? `/${typeSlug}/${object.slug}` : `/${object.slug}`
    const redirectUrl = new URL(path, request.nextUrl.origin)
    redirectUrl.searchParams.set('preview_token', previewToken)
    return NextResponse.redirect(redirectUrl)
  } catch {
    return NextResponse.json({ error: 'Object not found' }, { status: 404 })
  }
}
