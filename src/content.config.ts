import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    locale: z.enum(['en', 'es']).default('en'),
    shortTitle: z.string().optional(),
    eyebrow: z.string().optional(),
    slug: z.string(),
    translationKey: z.string().optional(),
    date: z.string(),
    updated: z.string().optional(),
    projectPeriod: z.string().optional(),
    summary: z.string(),
    tags: z.array(z.string()),
    role: z.string(),
    organization: z.string().optional(),
    collaborators: z.array(z.string()).optional(),
    stack: z.array(z.string()),
    featured: z.boolean().default(false),
    featuredOrder: z.number().optional(),
    status: z
      .enum(['completed', 'in-progress', 'archived'])
      .default('completed'),
    evidence: z.enum(['public', 'sanitized', 'private', 'hold']).optional(),
    disclosure: z.string().optional(),
    links: z
      .object({
        demo: z.string().optional(),
        github: z.string().optional(),
        writeup: z.string().optional(),
        reproduce: z.string().optional(),
        sourceCommit: z.string().optional(),
      })
      .optional(),
    image: z.string().optional(),
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    locale: z.enum(['en', 'es']).default('en'),
    slug: z.string(),
    translationKey: z.string().optional(),
    date: z.string(),
    summary: z.string(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  projects,
  writing,
};
