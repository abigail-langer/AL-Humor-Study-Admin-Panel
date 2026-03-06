import { NextResponse } from 'next/server'

const API_BASE = 'https://api.almostcrackd.ai'

const SUPPORTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
]

// POST /api/images/upload
// Runs the full 3-step pipeline using a service token stored in PIPELINE_API_TOKEN:
//   1. GET presigned S3 URL
//   2. PUT file to S3
//   3. Register image with the pipeline (returns imageId saved to DB)
//
// Expects multipart/form-data with a single field: "file"
export async function POST(request: Request) {
  try {
    const token = process.env.PIPELINE_API_TOKEN
    if (!token) {
      return NextResponse.json(
        { error: 'PIPELINE_API_TOKEN env var is not set' },
        { status: 500 }
      )
    }

    // Parse the uploaded file from multipart form data
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const contentType = file.type || 'image/jpeg'
    if (!SUPPORTED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${contentType}. Use JPEG, PNG, WebP, GIF, or HEIC.` },
        { status: 400 }
      )
    }

    // ── Step 1: Get presigned S3 URL ─────────────────────────────────────────
    const presignRes = await fetch(`${API_BASE}/pipeline/generate-presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ contentType: contentType }),
    })

    const presignData = await presignRes.json()
    if (!presignRes.ok) {
      return NextResponse.json(
        { error: presignData?.detail || presignData?.message || 'Failed to get presigned URL' },
        { status: presignRes.status }
      )
    }

    const { presignedUrl, cdnUrl } = presignData
    if (!presignedUrl || !cdnUrl) {
      return NextResponse.json(
        { error: `Unexpected presign response: ${JSON.stringify(presignData)}` },
        { status: 500 }
      )
    }

    // ── Step 2: PUT file directly to S3 ──────────────────────────────────────
    const uploadRes = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    })

    if (!uploadRes.ok) {
      return NextResponse.json(
        { error: `S3 upload failed: ${uploadRes.status} ${uploadRes.statusText}` },
        { status: 502 }
      )
    }

    // ── Step 3: Register with the pipeline ───────────────────────────────────
    // isCommonUse: true for admin uploads (available to all users as study images)
    const registerRes = await fetch(`${API_BASE}/pipeline/upload-image-from-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: true }),
    })

    const registerData = await registerRes.json()
    if (!registerRes.ok) {
      return NextResponse.json(
        { error: registerData?.detail || registerData?.message || 'Failed to register image' },
        { status: registerRes.status }
      )
    }

    const { imageId } = registerData
    if (!imageId) {
      return NextResponse.json(
        { error: `Register response missing imageId: ${JSON.stringify(registerData)}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ imageId, cdnUrl })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
