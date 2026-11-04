import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AthleteDocument = Athlete & Document;

export enum PreferredFoot {
  RIGHT = 'RIGHT',
  LEFT = 'LEFT',
  BOTH = 'BOTH',
}

@Schema({ timestamps: true })
export class Athlete {
  @Prop({ required: true, trim: true, index: true })
  name: string;

  @Prop({ trim: true, index: true })
  nickname?: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ trim: true })
  photoUrl?: string;

  @Prop({ type: Date })
  birthDate?: Date;

  @Prop({ trim: true })
  birthPlace?: string;

  @Prop({ type: Number })
  height?: number; // em centímetros (ex: 182)

  @Prop({ type: Number })
  weight?: number; // em kg (ex: 78)

  @Prop({ type: String, enum: Object.values(PreferredFoot), default: PreferredFoot.RIGHT })
  preferredFoot?: PreferredFoot;

  @Prop({ required: true, trim: true, index: true })
  primaryPosition: string;

  @Prop({ type: [String], default: [] })
  secondaryPositions: string[];

  @Prop({ type: [String], default: [] })
  pastClubs: string[];

  @Prop({ trim: true })
  biography?: string;

  @Prop({ trim: true })
  instagram?: string;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const AthleteSchema = SchemaFactory.createForClass(Athlete);

AthleteSchema.index({ name: 'text', nickname: 'text', primaryPosition: 'text' });

