import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettingDocument = Setting & Document;

@Schema({ timestamps: true })
export class Setting {
  @Prop({ default: null })
  clubLogoUrl: string;

  @Prop({ type: [String], default: [] })
  clubLogoGallery: string[];

  @Prop({ default: 'Esporte Clube Pelotas' })
  clubName: string;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
