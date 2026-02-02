# VillaForTech

Personal website for [villafortech.com](https://villafortech.com) — built with Astro, Tailwind CSS, and MDX.

## Tech Stack

- **Framework**: [Astro](https://astro.build) v5
- **Styling**: [Tailwind CSS](https://tailwindcss.com) v3
- **Content**: MDX for projects and writing
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The site will be available at `http://localhost:4321`.

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Navbar.astro
│   ├── Footer.astro
│   ├── Section.astro
│   ├── Card.astro
│   ├── Tag.astro
│   ├── Button.astro
│   └── Callout.astro
├── layouts/          # Page layouts
│   ├── BaseLayout.astro
│   └── ContentLayout.astro
├── pages/            # Route pages
│   ├── index.astro
│   ├── about.astro
│   ├── contact.astro
│   ├── resume.astro
│   ├── 404.astro
│   ├── projects/
│   └── writing/
├── content/          # MDX content collections
│   ├── projects/
│   └── writing/
├── data/             # JSON data files
│   ├── projects.json
│   └── socials.json
└── styles/
    └── global.css
```

## Content Management

### Adding a Project

Create a new `.mdx` file in `src/content/projects/`:

```yaml
---
title: "Project Title"
slug: "project-slug"
date: "2026-01-01"
summary: "One-line description."
tags: ["Tag1", "Tag2"]
role: "Your Role"
stack: ["Tech1", "Tech2"]
featured: true
status: "completed"
links:
  demo: "https://demo.example.com"
  github: "https://github.com/..."
---

Your project content here...
```

Then add an entry to `src/data/projects.json` for the index page.

### Adding a Writing Post

Create a new `.mdx` file in `src/content/writing/`:

```yaml
---
title: "Post Title"
slug: "post-slug"
date: "2026-01-01"
summary: "What readers will learn."
tags: ["Tag1", "Tag2"]
draft: false
---

Your post content here...
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Vercel auto-detects Astro — no configuration needed
4. Add custom domain in project settings

### Environment Variables

No environment variables required for basic deployment.

### Custom Domain Setup

1. In Vercel project settings, go to Domains
2. Add `villafortech.com`
3. Configure DNS:
   - **A Record**: `@` → `76.76.21.21`
   - **CNAME**: `www` → `cname.vercel-dns.com`
4. Wait for DNS propagation and SSL certificate

## Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## License

MIT
