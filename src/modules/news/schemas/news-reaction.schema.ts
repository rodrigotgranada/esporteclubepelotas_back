import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NewsReactionDocument = NewsReaction & Document;

export enum NewsReactionType {
  WOLF = 'wolf',
  FIRE = 'fire',
  CLAP = 'clap',
  HEART = 'heart',
}

@Schema({ timestamps: true })
export class NewsReaction {
  @Prop({ type: Types.ObjectId, ref: 'NewsArticle', required: true, index: true })
  article: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: ['wolf', 'fire', 'clap', 'heart'], required: true })
  type: string;
}

export const NewsReactionSchema = SchemaFactory.createForClass(NewsReaction);

// Garante que cada usuário tenha no máximo uma reação por matéria
NewsReactionSchema.index({ article: 1, user: 1 }, { unique: true });
