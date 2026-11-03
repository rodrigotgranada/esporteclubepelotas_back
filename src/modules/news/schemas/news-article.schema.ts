import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type NewsArticleDocument = NewsArticle & Document;

export enum NewsStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  SCHEDULED = 'SCHEDULED',
  ARCHIVED = 'ARCHIVED',
}

@Schema({ timestamps: true })
export class NewsArticle {
  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, trim: true })
  subtitle?: string;

  @Prop({ type: String, required: true, unique: true, index: true, trim: true, lowercase: true })
  slug: string;

  @Prop({ type: String, required: true })
  coverImage: string;

  @Prop({ type: String, trim: true })
  coverCaption?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  content: Record<string, any>;

  @Prop({ type: String, trim: true })
  summary?: string;

  @Prop({ type: Types.ObjectId, ref: 'NewsCategory', required: true, index: true })
  category: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: String, enum: NewsStatus, default: NewsStatus.DRAFT, index: true })
  status: NewsStatus;

  @Prop({ type: Boolean, default: false, index: true })
  isFeatured: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  author: Types.ObjectId;

  @Prop({ type: Date, index: true })
  publishedAt?: Date;

  @Prop({ type: [String], default: [] })
  gallery: string[];

  @Prop({ type: String, trim: true })
  youtubeVideoUrl?: string;

  @Prop({ type: Number, default: 0 })
  viewsCount: number;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;
}

export const NewsArticleSchema = SchemaFactory.createForClass(NewsArticle);

// Compound index for efficient public feed listing (published + active + publishedAt DESC)
NewsArticleSchema.index({ isActive: 1, status: 1, publishedAt: -1 });
// Compound index for featured news
NewsArticleSchema.index({ isActive: 1, status: 1, isFeatured: 1, publishedAt: -1 });
// Text index for search on title, subtitle, and summary
NewsArticleSchema.index({ title: 'text', subtitle: 'text', summary: 'text' });

