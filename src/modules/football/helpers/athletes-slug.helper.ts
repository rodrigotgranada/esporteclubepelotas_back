import { Model } from 'mongoose';
import { AthleteDocument } from '../schemas/athlete.schema.js';

export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export async function generateUniqueAthleteSlug(
  model: Model<AthleteDocument>,
  name: string,
  nickname?: string,
  currentId?: string,
): Promise<string> {
  const baseText = nickname && nickname.trim() !== '' ? nickname : name;
  const baseSlug = slugify(baseText);

  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await model.findOne({ slug: candidate }).lean().exec();
    if (!existing || (currentId && existing._id.toString() === currentId)) {
      return candidate;
    }
    candidate = `${baseSlug}-${counter}`;
    counter++;
  }
}
