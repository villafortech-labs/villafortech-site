export const links = {
  email: 'mailto:contact@villafortech.com',
  emailAddress: 'contact@villafortech.com',
  github: 'https://github.com/VillaforTech',
  githubDisplay: 'github.com/VillaforTech',
  linkedin: 'https://www.linkedin.com/in/robertovillafuerte/',
  linkedinDisplay: 'linkedin.com/in/robertovillafuerte',
  youtube: 'https://www.youtube.com/@VillaforTech',
  instagram: 'https://www.instagram.com/villafortech/',
  tiktok: 'https://www.tiktok.com/@villafortech',
  threads: 'https://www.threads.com/@villafortech',
  x: 'https://x.com/VillaForTech',
} as const;

export const socialProfiles = [
  {
    name: 'LinkedIn',
    url: links.linkedin,
    description: { es: 'Perfil profesional', en: 'Professional profile' },
  },
  {
    name: 'Instagram',
    url: links.instagram,
    description: { es: 'Proceso y publicaciones', en: 'Process and posts' },
  },
  {
    name: 'GitHub',
    url: links.github,
    description: { es: 'Código y proyectos', en: 'Code and projects' },
  },
  {
    name: 'YouTube',
    url: links.youtube,
    description: { es: 'Videos', en: 'Videos' },
  },
  {
    name: 'TikTok',
    url: links.tiktok,
    description: { es: 'Videos breves', en: 'Short videos' },
  },
  {
    name: 'Threads',
    url: links.threads,
    description: { es: 'Conversaciones', en: 'Conversations' },
  },
  {
    name: 'X',
    url: links.x,
    description: { es: 'Ideas y notas', en: 'Ideas and notes' },
  },
] as const;
