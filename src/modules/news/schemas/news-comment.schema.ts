import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NewsCommentDocument = NewsComment & Document;

export enum NewsCommentStatus {
  ACTIVE = 'ACTIVE',
  HIDDEN = 'HIDDEN',
}

@Schema({ timestamps: true })
export class NewsComment {
  @Prop({ type: Types.ObjectId, ref: 'NewsArticle', required: true, index: true })
  article: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  author: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 1000 })
  content: string;

  @Prop({ type: String, enum: NewsCommentStatus, default: NewsCommentStatus.ACTIVE, index: true })
  status: NewsCommentStatus;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;
}

export const NewsCommentSchema = SchemaFactory.createForClass(NewsComment);

// Index para consultas ordenadas por matéria e data decrescente
NewsCommentSchema.index({ article: 1, isActive: 1, status: 1, createdAt: -1 });
