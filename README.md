# Nike Clone
![App Preview](https://imgix.cosmicjs.com/4c06d990-a8cf-11f1-8939-55103cc35c44-autopilot-photo-1465453869711-7e174808ace9-1788574371234.jpeg?w=1200&h=630&fit=crop&auto=format,compress)

A bold, high-energy athletic footwear and apparel storefront built with Next.js and [Cosmic](https://www.cosmicjs.com). Browse featured drops, filter products by category, view rich product detail pages with galleries and variant selection, and read verified customer reviews.

## Features

- 🏠 Full-bleed hero homepage with featured products and category showcase
- 🧢 Category-filtered, sortable product listing pages
- 👟 Product detail pages with gallery, sale pricing, inventory badges, and variant selector
- ⭐ Customer reviews with star ratings and verified-purchase badges
- 🏷️ Category landing pages with hero image and description
- 📱 Mobile-first, responsive, black/white design with a bold accent color
- ⚡ Server-rendered data fetching for speed and security

## Clone this Project

Want to create your own version of this project with all the content and structure? Clone this Cosmic bucket and code repository to get started instantly:

[![Clone this Project](https://img.shields.io/badge/Clone%20this%20Project-29abe2?style=for-the-badge&logo=cosmic&logoColor=white)](https://app.cosmicjs.com/projects/new?clone_bucket=6a9b7a5d254225867de1da08&clone_repository=6a9b7c5a254225867de1da59)

## Prompts

This application was built using the following prompts to generate the content structure and code:

### Content Model Prompt

> Create content models for an online store with products (including images, pricing, description, and inventory status), product categories, and customer reviews.
>
> User instructions: An e-commerce store with products, categories, variants, and customer reviews. Nike.com clone

### Code Generation Prompt

> Build a Next.js application for an online business called "Nike Clone". The content is managed in Cosmic CMS with the following object types: categories, products, reviews. Create a beautiful, modern, responsive design with a homepage and pages for each content type.
>
> User instructions: A bold, high-energy Nike-style athletic footwear and apparel storefront. Homepage with a full-bleed hero, featured products grid, and category showcase. Product listing pages filtered by category with sorting. Product detail pages showing gallery, price (with strikethrough compare-at price when on sale), inventory status badge, variant selector (color/size from the variants JSON), description, and customer reviews with star ratings and verified-purchase badges. Category pages with hero image and description. Clean, modern, mobile-first design with big typography, lots of whitespace, black/white palette with bold accent color, smooth hover states. Uses the existing Cosmic content types: products, categories, reviews.

The app has been tailored to work with your existing Cosmic content structure and includes all the features requested above.

## Technologies

- [Next.js 16](https://nextjs.org/) — App Router, Server Components
- [Cosmic](https://www.cosmicjs.com) — Headless CMS for products, categories, and reviews
- [TypeScript](https://www.typescriptlang.org/) — Strict typing throughout
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first styling

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed
- A Cosmic account with a bucket containing `categories`, `products`, and `reviews` object types

### Installation

```bash
bun install
```

### Environment Variables

Create a `.env.local` file (never commit this) with:

```env
COSMIC_BUCKET_SLUG=your-bucket-slug
COSMIC_READ_KEY=your-read-key
COSMIC_WRITE_KEY=your-write-key
```

### Run the dev server

```bash
bun run dev
```

## Agent checkout (CAP)

The store answers AI agents through the [Concierge Agent Protocol](https://conciergeprotocol.org/spec). `agent.txt` points at the CAP door at `/cap/v1` and the login at `/oauth`.

- **Logins.** An agent logs the shopper in with the OAuth device code. When it asks for `scope=write`, the shopper chooses **Allow changes**, **Read only**, or **Deny**. Write tokens last 15 minutes.
- **Bag.** A signed-in shopper's bag is stored on the server (`carts`), so the bag in the browser and the bag the agent changes are the same. With a write login, an agent can say "add the Pegasus 41 in size 10 to my bag", "remove the Volt one", or "what's in my bag?".
- **Checkout.** "Check out" or "buy the Metcon 10 in size 11" never charges. The store prices the order from Stripe, holds it in `cap-confirmations`, and answers with a `confirmation` whose `authorization_details` is a `purchase`. The shopper opens `/confirm/{id}`, reviews the order, and pays on Stripe Checkout. The agent reads `GET /cap/v1/confirmations/{id}` until it is `done`, and `result.reference` is the order number.
- **Webhook.** Point a Stripe webhook at `/api/stripe/webhook` with `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `checkout.session.expired`, and set `STRIPE_WEBHOOK_SECRET`. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

The `carts` and `cap-confirmations` object types are created in your bucket on first use.

## Cosmic SDK Examples

```typescript
import { cosmic } from '@/lib/cosmic'

// Get all products with category data
const { objects: products } = await cosmic.objects
  .find({ type: 'products' })
  .props(['id', 'slug', 'title', 'metadata'])
  .depth(1)

// Get products for a specific category (query by id, not slug)
const { objects: categoryProducts } = await cosmic.objects
  .find({ type: 'products', 'metadata.category': categoryId })
  .props(['id', 'slug', 'title', 'metadata'])
  .depth(1)

// Get reviews for a product
const { objects: reviews } = await cosmic.objects
  .find({ type: 'reviews', 'metadata.product': productId })
  .props(['id', 'slug', 'title', 'metadata'])
  .depth(1)
```

## Cosmic CMS Integration

This app reads directly from your Cosmic bucket's `categories`, `products`, and `reviews` object types using the [Cosmic SDK](https://www.cosmicjs.com/docs). All data fetching happens server-side in React Server Components — no Cosmic credentials are ever exposed to the browser. Product-to-category and review-to-product relationships use Cosmic's object metafields with `depth(1)` to resolve connected data in a single query.

## Deployment Options

### Vercel

1. Push this repository to GitHub
2. Import the project into [Vercel](https://vercel.com)
3. Add the environment variables (`COSMIC_BUCKET_SLUG`, `COSMIC_READ_KEY`, `COSMIC_WRITE_KEY`) in the Vercel project settings
4. Deploy

### Netlify

1. Push this repository to GitHub
2. Import the project into [Netlify](https://netlify.com)
3. Set the build command to `bun run build` and publish directory to `.next`
4. Add the environment variables in the Netlify site settings
5. Deploy

<!-- README_END -->