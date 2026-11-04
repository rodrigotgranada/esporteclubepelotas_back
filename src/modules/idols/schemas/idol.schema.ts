import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IdolDocument = Idol & Document;

export enum IdolCategory {
  PLAYER = 'PLAYER',
  COACH = 'COACH',
  STAFF = 'STAFF',
  FAN = 'FAN',
}

@Schema({ _id: false })
export class IdolPlayerStats {
  @Prop({ type: String, trim: true })
  position?: string;

  @Prop({ type: String, trim: true })
  preferredFoot?: string;

  @Prop({ type: Number })
  historicJerseyNumber?: number;

  @Prop({ type: Number, default: 0 })
  matchesCount?: number;

  @Prop({ type: Number, default: 0 })
  goalsCount?: number;

  @Prop({ type: [String], default: [] })
  titles?: string[];

  @Prop({ type: String, trim: true })
  memorableMatch?: string;
}
export const IdolPlayerStatsSchema = SchemaFactory.createForClass(IdolPlayerStats);

@Schema({ _id: false })
export class IdolCoachStats {
  @Prop({ type: Number, default: 0 })
  matchesCount?: number;

  @Prop({ type: Number, default: 0 })
  winsCount?: number;

  @Prop({ type: Number, default: 0 })
  drawsCount?: number;

  @Prop({ type: Number, default: 0 })
  lossesCount?: number;

  @Prop({ type: [String], default: [] })
  titles?: string[];

  @Prop({ type: String, trim: true })
  tacticalStyle?: string;
}
export const IdolCoachStatsSchema = SchemaFactory.createForClass(IdolCoachStats);

@Schema({ _id: false })
export class IdolStaffStats {
  @Prop({ type: String, trim: true })
  roleName?: string;

  @Prop({ type: String, trim: true })
  yearsOfDedication?: string;

  @Prop({ type: String, trim: true })
  backstageStory?: string;
}
export const IdolStaffStatsSchema = SchemaFactory.createForClass(IdolStaffStats);

@Schema({ _id: false })
export class IdolFanStats {
  @Prop({ type: String, trim: true })
  stadiumSector?: string;

  @Prop({ type: String, trim: true })
  trademark?: string;
}
export const IdolFanStatsSchema = SchemaFactory.createForClass(IdolFanStats);

@Schema({ timestamps: true, collection: 'idols' })
export class Idol {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, trim: true })
  nickname?: string;

  @Prop({ type: String, required: true, unique: true, index: true, lowercase: true, trim: true })
  slug: string;

  @Prop({
    type: String,
    enum: IdolCategory,
    default: IdolCategory.PLAYER,
    required: true,
    index: true,
  })
  category: IdolCategory;

  @Prop({ type: String, trim: true })
  photoUrl?: string;

  @Prop({ type: [String], default: [] })
  gallery: string[];

  @Prop({ type: Number, required: true })
  startYear: number;

  @Prop({ type: Number })
  endYear?: number;

  @Prop({ type: Boolean, default: false })
  isActiveInClub: boolean;

  @Prop({ type: Date })
  birthDate?: Date;

  @Prop({ type: Date })
  deathDate?: Date;

  @Prop({ type: String, trim: true })
  birthPlace?: string;

  @Prop({ type: String, trim: true })
  quote?: string;

  @Prop({ type: String, required: true })
  biography: string;

  @Prop({ type: IdolPlayerStatsSchema, default: () => ({}) })
  playerStats?: IdolPlayerStats;

  @Prop({ type: IdolCoachStatsSchema, default: () => ({}) })
  coachStats?: IdolCoachStats;

  @Prop({ type: IdolStaffStatsSchema, default: () => ({}) })
  staffStats?: IdolStaffStats;

  @Prop({ type: IdolFanStatsSchema, default: () => ({}) })
  fanStats?: IdolFanStats;

  @Prop({ type: Boolean, default: false, index: true })
  isFeatured: boolean;

  @Prop({ type: Number, default: 0, index: true })
  order: number;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastEditedBy?: Types.ObjectId;
}

export const IdolSchema = SchemaFactory.createForClass(Idol);

IdolSchema.index({ category: 1, isActive: 1 });
IdolSchema.index({ isFeatured: 1, isActive: 1 });
IdolSchema.index({ order: 1, createdAt: -1 });
