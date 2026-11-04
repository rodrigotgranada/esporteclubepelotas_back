import { Model } from 'mongoose';
import { IdolDocument } from '../schemas/idol.schema.js';

export function slugify(text: string): string {
  const slug = text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  return slug || 'idolo';
}

export async function generateUniqueIdolSlug(
  nameOrNickname: string,
  idolModel: Model<IdolDocument>,
  currentIdolId?: string,
): Promise<string> {
  const baseSlug = slugify(nameOrNickname);

  const regex = new RegExp(`^${baseSlug}(-[0-9]+)?$`);
  const existingIdols = await idolModel
    .find({ slug: regex })
    .select('_id slug')
    .exec();

  const otherSlugs = existingIdols
    .filter((a) => !currentIdolId || a._id.toString() !== currentIdolId.toString())
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
