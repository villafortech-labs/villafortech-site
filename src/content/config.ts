import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    date: z.string(),
    summary: z.string(),
    tags: z.array(z.string()),
    role: z.string(),
    stack: z.array(z.string()),
    featured: z.boolean().default(false),
    status: z.enum(['completed', 'in-progress', 'archived']).default('completed'),
    links: z.object({
      demo: z.string().optional(),
      github: z.string().optional(),
      writeup: z.string().optional(),
    }).optional(),
    image: z.string().optional(),
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
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
