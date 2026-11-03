import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NewsCategoryDocument = NewsCategory & Document;

@Schema({ timestamps: true })
export class NewsCategory {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: true, unique: true, index: true, trim: true, lowercase: true })
  slug: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: Number, default: 0 })
  order: number;
}

export const NewsCategorySchema = SchemaFactory.createForClass(NewsCategory);
