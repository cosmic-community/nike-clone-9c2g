// Server-only Stripe helper. Talks to the Stripe REST API directly with fetch
// so the app does not need an extra runtime dependency.
import 'server-only'

const STRIPE_API = 'https://api.stripe.com/v1'

export function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return key
}

// Stripe expects form-encoded bodies with bracketed keys for nested data,
// e.g. line_items[0][price]. This flattens a plain object into that shape.
export function toFormBody(
  data: Record<string, unknown>,
  parentKey?: string,
  form: URLSearchParams = new URLSearchParams()
): URLSearchParams {
  for (const [rawKey, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue
    const key = parentKey ? `${parentKey}[${rawKey}]` : rawKey

    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        if (typeof entry === 'object' && entry !== null) {
          toFormBody(entry as Record<string, unknown>, `${key}[${index}]`, form)
        } else {
          form.append(`${key}[${index}]`, String(entry))
        }
      })
    } else if (typeof value === 'object') {
      toFormBody(value as Record<string, unknown>, key, form)
    } else {
      form.append(key, String(value))
    }
  }

  return form
}

export async function stripeRequest<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: toFormBody(body).toString(),
  })

  const payload = (await response.json()) as T & {
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new Error(payload?.error?.message || `Stripe request failed (${response.status})`)
  }

  return payload
}
