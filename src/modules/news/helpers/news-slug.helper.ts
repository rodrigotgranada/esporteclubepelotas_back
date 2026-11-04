import { Model } from 'mongoose';
import { NewsArticleDocument } from '../schemas/news-article.schema.js';

/**
 * Sanitiza strings e produz slugs amigáveis (URL-safe).
 * Remove acentos, caracteres especiais e substitui espaços por hífens.
 */
export function slugify(text: string): string {
  const slug = text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  return slug || 'materia';
}

/**
 * Garante slug único prevenindo colisões (ex: noticia, noticia-1, noticia-2).
 */
export async function generateUniqueArticleSlug(
  title: string,
  articleModel: Model<NewsArticleDocument>,
  currentArticleId?: string,
): Promise<string> {
  const baseSlug = slugify(title);

  const regex = new RegExp(`^${baseSlug}(-[0-9]+)?$`);
  const existingArticles = await articleModel
    .find({ slug: regex })
    .select('_id slug')
    .exec();

  const otherSlugs = existingArticles
    .filter((a) => !currentArticleId || a._id.toString() !== currentArticleId.toString())
    .map((a) => a.slug);

  if (!otherSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 1;
  while (otherSlugs.includes(`${baseSlug}-${counter}`)) {
    counter++;
  }

  return `${baseSlug}-${counter}`;
}
