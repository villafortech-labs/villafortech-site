# VillaForTech Site Architecture

> Technical specification for `villafortech.com` — Astro + Tailwind + MDX

---

## 1. Routes & Site Map

| Route | Page | Content Source | Layout |
|-------|------|----------------|--------|
| `/` | Home | `pages/index.astro` | BaseLayout |
| `/projects` | Projects Index | `pages/projects/index.astro` + `data/projects.json` | BaseLayout |
| `/projects/[slug]` | Project Case Study | `content/projects/*.mdx` | ContentLayout |
| `/about` | About | `pages/about.astro` | BaseLayout |
| `/writing` | Writing Index | `pages/writing/index.astro` | BaseLayout |
| `/writing/[slug]` | Writing Post | `content/writing/*.mdx` | ContentLayout |
| `/contact` | Contact | `pages/contact.astro` | BaseLayout |
| `/resume` | Resume | `pages/resume.astro` | BaseLayout |
| `/404` | Not Found | `pages/404.astro` | BaseLayout |

### Navigation Structure

```
Primary Nav: Home | Projects | About | Writing | Contact | Resume
Footer Nav:  Email | GitHub | LinkedIn | Twitter/X
```

---

## 2. Page Specifications

### 2.1 Home (`/`)

**Purpose:** Communicate value proposition in <10 seconds; drive to projects or contact.

**Sections:**
1. **Hero** — Headline, subheadline, primary CTA (Projects), secondary CTA (Contact)
2. **Proof Row** — 3 cards: "What I Build", "How I Work", "What I Care About"
3. **Featured Projects** — 3 project cards (pulled from `data/projects.json`, filtered by `featured: true`)
4. **Credibility Bar** — Experience years, certifications, community involvement (optional)
5. **Footer** — Email, social links

**Data Dependencies:** `data/projects.json` (featured projects)

---

### 2.2 Projects Index (`/projects`)

**Purpose:** Showcase all projects with filtering context.

**Sections:**
1. **Page Header** — Title, brief intro
2. **Project Grid** — Cards for each project (sorted by date desc)
3. **Tags Filter** — Optional: filter by tag (can be MVP-deferred)

**Data Dependencies:** `data/projects.json`

---

### 2.3 Project Case Study (`/projects/[slug]`)

**Purpose:** Deep dive into a single project with systems-thinking narrative.

**Sections (MDX content):**
1. **Header** — Title, date, tags, role, stack
2. **Context** — Business problem, constraints
3. **Architecture** — System design, decisions
4. **Implementation** — Key technical details
5. **Evaluation** — Metrics, testing approach
6. **Outcomes** — Results, impact
7. **Learnings** — What worked, what didn't
8. **Links** — Demo, GitHub, related writing

**Data Dependencies:** MDX frontmatter + body

---

### 2.4 About (`/about`)

**Purpose:** Personal story and values; build trust.

**Sections:**
1. **Intro** — Who I am (150 words max)
2. **Values** — 3-4 bullet principles
3. **Background** — Brief career path
4. **Current Focus** — What I'm building now
5. **CTA** — Link to contact

---

### 2.5 Writing Index (`/writing`)

**Purpose:** Share technical insights; establish thought leadership.

**Sections:**
1. **Page Header** — Title, brief intro
2. **Posts List** — Cards or list items sorted by date desc

**Data Dependencies:** `content/writing/*.mdx` collection

---

### 2.6 Writing Post (`/writing/[slug]`)

**Purpose:** Individual article/note.

**Sections:**
1. **Header** — Title, date, tags, reading time (computed)
2. **Body** — MDX content
3. **Footer** — Related posts (optional), back link

---

### 2.7 Contact (`/contact`)

**Purpose:** Clear CTA for outreach.

**Sections:**
1. **Header** — Title, microcopy
2. **Email** — `mailto:` link (primary)
3. **Social Links** — GitHub, LinkedIn, Twitter/X
4. **Availability** — Brief note on response time (optional)

---

### 2.8 Resume (`/resume`)

**Purpose:** Professional summary with PDF download option.

**Sections:**
1. **Header** — Name, title, contact
2. **Summary** — 2-3 sentences
3. **Experience** — Reverse chronological
4. **Skills** — Grouped by category
5. **Education** — Degrees, certifications
6. **PDF Link** — Download button (links to `/resume.pdf` in `public/`)

---

## 3. Content Model

### 3.1 Project Schema (MDX Frontmatter)

```yaml
---
title: string              # Required. Display title.
slug: string               # Required. URL slug (must match filename).
date: string               # Required. ISO date (YYYY-MM-DD).
summary: string            # Required. 1-2 sentence description.
tags: string[]             # Required. e.g., ["RAG", "MLOps", "Python"]
role: string               # Required. e.g., "AI Engineer", "Tech Lead"
stack: string[]            # Required. Technologies used.
featured: boolean          # Optional. Show on home page. Default: false.
status: string             # Optional. "completed" | "in-progress" | "archived"
links:
  demo: string             # Optional. Live demo URL.
  github: string           # Optional. Source code URL.
  writeup: string          # Optional. Related blog post URL.
image: string              # Optional. OG/card image path.
---
```

### 3.2 Writing Schema (MDX Frontmatter)

```yaml
---
title: string              # Required. Display title.
slug: string               # Required. URL slug (must match filename).
date: string               # Required. ISO date (YYYY-MM-DD).
summary: string            # Required. What the reader will learn.
tags: string[]             # Required. e.g., ["LLMs", "Evaluation"]
draft: boolean             # Optional. Hide from index if true. Default: false.
---
```

### 3.3 Projects Index Data (`data/projects.json`)

```json
{
  "projects": [
    {
      "slug": "project-slug",
      "title": "Project Title",
      "summary": "One-liner.",
      "tags": ["RAG", "MLOps"],
      "featured": true,
      "date": "2026-01-15"
    }
  ]
}
```

> **Note:** This JSON provides quick access for index pages without parsing all MDX files. Keep in sync with MDX frontmatter.

### 3.4 Social Links (`data/socials.json`)

```json
{
  "email": "hello@villafortech.com",
  "github": "https://github.com/username",
  "linkedin": "https://linkedin.com/in/username",
  "twitter": "https://twitter.com/username"
}
```

---

## 4. Layouts

### 4.1 BaseLayout (`src/layouts/BaseLayout.astro`)

**Purpose:** Global wrapper for all pages.

**Responsibilities:**
- HTML document structure (`<html>`, `<head>`, `<body>`)
- Meta tags (title, description, OG, Twitter cards)
- Favicon and fonts
- Global CSS import
- Skip-to-content link (a11y)
- `<Navbar />` component
- `<slot />` for page content
- `<Footer />` component

**Props:**
```typescript
interface Props {
  title: string;
  description: string;
  image?: string;        // OG image, defaults to /og.png
  noIndex?: boolean;     // For draft/private pages
}
```

### 4.2 ContentLayout (`src/layouts/ContentLayout.astro`)

**Purpose:** Wrapper for MDX content pages (projects, writing).

**Extends:** BaseLayout

**Additional Responsibilities:**
- Article semantic structure (`<article>`)
- Content header (title, date, tags)
- Prose styling container
- Reading time display
- Back navigation link

**Props:**
```typescript
interface Props {
  frontmatter: {
    title: string;
    date: string;
    summary: string;
    tags: string[];
    // ... other frontmatter fields
  };
  readingTime?: string;
}
```

---

## 5. Components

### 5.1 Core Components

| Component | File | Purpose |
|-----------|------|---------|
| Navbar | `components/Navbar.astro` | Site navigation, mobile menu |
| Footer | `components/Footer.astro` | Social links, copyright |
| Section | `components/Section.astro` | Consistent section wrapper with heading |
| Card | `components/Card.astro` | Project/post preview card |
| Tag | `components/Tag.astro` | Styled tag/badge |
| Button | `components/Button.astro` | Primary/secondary button styles |

### 5.2 Content Components (MDX)

| Component | File | Purpose |
|-----------|------|---------|
| Callout | `components/Callout.astro` | Info/warning/tip boxes |
| CodeBlock | `components/CodeBlock.astro` | Syntax-highlighted code (if custom styling needed) |

### 5.3 Component Specifications

#### Navbar
- Logo/site name (links to `/`)
- Desktop: horizontal nav links
- Mobile: hamburger menu with slide-out or dropdown
- Highlight current page
- No JS required (CSS-only mobile menu preferred)

#### Card
**Props:**
```typescript
interface Props {
  title: string;
  summary: string;
  href: string;
  tags?: string[];
  date?: string;
  variant?: "default" | "featured";
}
```

#### Button
**Props:**
```typescript
interface Props {
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  external?: boolean;  // Opens in new tab
}
```

#### Section
**Props:**
```typescript
interface Props {
  title?: string;
  id?: string;         // For anchor links
  class?: string;      // Additional classes
}
```

---

## 6. Design Tokens (Tailwind)

### Typography
- **Font:** System font stack (fast, no network requests)
  ```css
  font-family: ui-sans-serif, system-ui, sans-serif;
  ```
- **Headings:** `font-semibold`, sizes: h1=3xl, h2=2xl, h3=xl, h4=lg
- **Body:** `text-base` (16px), `leading-relaxed`
- **Code:** `font-mono`, slightly smaller

### Colors
- **Background:** `gray-50` (light) / near-white
- **Text:** `gray-900` (dark)
- **Muted:** `gray-600`
- **Accent:** `blue-600` (links, buttons, highlights)
- **Accent hover:** `blue-700`

### Spacing
- **Container:** `max-w-4xl mx-auto px-4 sm:px-6`
- **Section padding:** `py-16 sm:py-24`
- **Card gap:** `gap-6`

### Responsive Breakpoints
- `sm`: 640px (tablet)
- `md`: 768px (small desktop)
- `lg`: 1024px (desktop)

---

## 7. File Structure

```
villafortech-site/
├── public/
│   ├── favicon.ico
│   ├── og.png                    # Default OG image
│   └── resume.pdf                # Downloadable resume
├── src/
│   ├── components/
│   │   ├── Navbar.astro
│   │   ├── Footer.astro
│   │   ├── Section.astro
│   │   ├── Card.astro
│   │   ├── Tag.astro
│   │   ├── Button.astro
│   │   └── Callout.astro
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── ContentLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about.astro
│   │   ├── contact.astro
│   │   ├── resume.astro
│   │   ├── 404.astro
│   │   ├── projects/
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro
│   │   └── writing/
│   │       ├── index.astro
│   │       └── [...slug].astro
│   ├── content/
│   │   ├── config.ts             # Astro content collections config
│   │   ├── projects/
│   │   │   ├── rag-pipeline.mdx
│   │   │   ├── mlops-platform.mdx
│   │   │   └── llm-monitoring.mdx
│   │   └── writing/
│   │       └── evaluating-rag.mdx
│   ├── data/
│   │   ├── projects.json
│   │   └── socials.json
│   └── styles/
│       └── global.css
├── docs/
│   └── architecture.md           # This file
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
└── README.md
```

---

## 8. Implementation Milestones

### Milestone 1: Project Setup & Skeleton
**Goal:** Working Astro project with Tailwind, MDX, and basic structure.

**Tasks:**
1. Initialize Astro project
2. Add Tailwind CSS integration
3. Add MDX integration
4. Add sitemap integration
5. Create folder structure (layouts, components, pages, content, data)
6. Configure content collections (`src/content/config.ts`)
7. Create placeholder data files (projects.json, socials.json)
8. Add global CSS with Tailwind base

**Acceptance Criteria:**
- [ ] `npm run dev` starts without errors
- [ ] Tailwind classes work in `.astro` files
- [ ] MDX files can be created in `content/` folders
- [ ] Content collections are typed and queryable

---

### Milestone 2: Layouts & Core Components
**Goal:** Reusable layouts and components ready for pages.

**Tasks:**
1. Implement `BaseLayout.astro` with head, nav slot, footer slot
2. Implement `ContentLayout.astro` extending BaseLayout
3. Implement `Navbar.astro` with responsive mobile menu
4. Implement `Footer.astro` with social links
5. Implement `Section.astro` wrapper
6. Implement `Card.astro` for projects/posts
7. Implement `Tag.astro` for categories
8. Implement `Button.astro` with variants

**Acceptance Criteria:**
- [ ] BaseLayout renders valid HTML5 document
- [ ] Navbar is accessible (keyboard nav, ARIA labels)
- [ ] Mobile menu works without JavaScript (CSS-only) or with minimal JS
- [ ] Components accept and render props correctly
- [ ] All components are responsive

---

### Milestone 3: Static Pages
**Goal:** All non-content pages implemented.

**Tasks:**
1. Implement Home page with all sections
2. Implement About page
3. Implement Contact page
4. Implement Resume page
5. Implement 404 page
6. Implement Projects index page
7. Implement Writing index page

**Acceptance Criteria:**
- [ ] All pages render without errors
- [ ] Navigation links work between pages
- [ ] Home page displays featured projects from data
- [ ] Contact page has working mailto link
- [ ] Resume page has PDF download link
- [ ] Pages are responsive on mobile/tablet/desktop

---

### Milestone 4: Content Pages (MDX)
**Goal:** Dynamic project and writing pages from MDX content.

**Tasks:**
1. Create 3 project case study MDX files with full content
2. Create dynamic route `projects/[...slug].astro`
3. Create 1-2 writing post MDX files
4. Create dynamic route `writing/[...slug].astro`
5. Add `Callout.astro` component for MDX
6. Style prose content (headings, lists, code blocks, links)

**Acceptance Criteria:**
- [ ] `/projects/[slug]` renders correct MDX content
- [ ] `/writing/[slug]` renders correct MDX content
- [ ] Frontmatter data displays in page header
- [ ] Code blocks have syntax highlighting
- [ ] Images in MDX are optimized
- [ ] Back links return to index pages

---

### Milestone 5: SEO & Meta
**Goal:** Search engine and social sharing optimization.

**Tasks:**
1. Add unique title/description to each page
2. Implement canonical URLs
3. Add Open Graph meta tags
4. Add Twitter Card meta tags
5. Create default OG image (`public/og.png`)
6. Verify sitemap generation
7. Add `robots.txt`
8. Add JSON-LD structured data (Person, WebSite)

**Acceptance Criteria:**
- [ ] Each page has unique `<title>` and `<meta name="description">`
- [ ] OG tags render correctly (test with https://opengraph.dev)
- [ ] Sitemap is accessible at `/sitemap-index.xml`
- [ ] `robots.txt` allows crawling
- [ ] No SEO warnings in Lighthouse

---

### Milestone 6: Performance & Accessibility
**Goal:** Lighthouse scores 90+ across all categories.

**Tasks:**
1. Optimize images (use Astro `<Image />` component)
2. Ensure system fonts load instantly
3. Minimize/eliminate render-blocking resources
4. Add proper heading hierarchy (h1 > h2 > h3)
5. Add alt text to all images
6. Ensure color contrast meets WCAG AA
7. Add skip-to-content link
8. Test keyboard navigation
9. Add ARIA labels where needed
10. Run Lighthouse audit and fix issues

**Acceptance Criteria:**
- [ ] Lighthouse Performance: 90+
- [ ] Lighthouse Accessibility: 90+
- [ ] Lighthouse Best Practices: 90+
- [ ] Lighthouse SEO: 90+
- [ ] No critical accessibility violations
- [ ] Site works without JavaScript

---

### Milestone 7: Deployment
**Goal:** Live site on `villafortech.com` via Vercel.

**Tasks:**
1. Push repository to GitHub
2. Create Vercel project and connect to repo
3. Configure build settings (Astro defaults)
4. Add custom domain `villafortech.com`
5. Configure DNS (A record for apex, CNAME for www)
6. Set up www → apex redirect (or vice versa)
7. Verify HTTPS certificate
8. Verify existing email DNS records (MX, SPF, DKIM) still work
9. Test production site

**Acceptance Criteria:**
- [ ] Site loads at `https://villafortech.com`
- [ ] HTTPS works without warnings
- [ ] www redirects correctly
- [ ] All pages load in production
- [ ] Email delivery still works (if applicable)

---

## 9. Definition of Done

### Pages
- [ ] Home page exists and displays hero + proof + featured projects
- [ ] Projects index lists all projects
- [ ] 3 project case study pages with full content
- [ ] About page with personal story
- [ ] Contact page with email + social links
- [ ] Resume page with PDF download
- [ ] Writing index (can be empty initially)
- [ ] 404 page handles unknown routes

### Responsiveness
- [ ] All pages work on mobile (320px+)
- [ ] All pages work on tablet (768px+)
- [ ] All pages work on desktop (1024px+)
- [ ] No horizontal scroll on any viewport

### SEO
- [ ] Unique title per page
- [ ] Unique description per page
- [ ] Open Graph tags present
- [ ] Sitemap generated
- [ ] robots.txt present

### Performance
- [ ] Lighthouse Performance: 90+
- [ ] No large JS bundles (< 50kb total)
- [ ] Images optimized via Astro
- [ ] System fonts (no font network requests)

### Accessibility
- [ ] Lighthouse Accessibility: 90+
- [ ] Skip-to-content link
- [ ] Keyboard navigation works
- [ ] Color contrast passes WCAG AA
- [ ] All images have alt text

### Functionality
- [ ] All navigation links work
- [ ] Contact mailto link works
- [ ] PDF download works
- [ ] External links open in new tab

### Deployment
- [ ] Live at `https://villafortech.com`
- [ ] HTTPS active
- [ ] www redirect configured
- [ ] Vercel deployment succeeds on push

---

## 10. Tech Dependencies

### Required
```json
{
  "astro": "^5.x",
  "@astrojs/tailwind": "^6.x",
  "@astrojs/mdx": "^4.x",
  "@astrojs/sitemap": "^3.x",
  "tailwindcss": "^4.x"
}
```

### Optional
```json
{
  "prettier": "^3.x",
  "prettier-plugin-astro": "^0.x",
  "lucide-astro": "^0.x"  // Icons
}
```

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Content not ready | Delays launch | Use placeholder content; launch with 3 solid projects |
| Scope creep (features) | Delays launch | Stick to MVP; defer Writing section if needed |
| DNS propagation delays | Temporary 404s | Set low TTL before migration; verify with `dig` |
| Mobile menu complexity | Extra JS/bugs | Use CSS-only disclosure pattern |

---

*Last updated: 2026-02-02*
