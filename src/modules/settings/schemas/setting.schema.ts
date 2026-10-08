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

  @Prop({ type: Object, default: { instagram: [], facebook: [], x: [], youtube: [] } })
  socialMedia: {
    instagram?: string[];
    facebook?: string[];
    x?: string[];
    youtube?: string[];
  };
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
