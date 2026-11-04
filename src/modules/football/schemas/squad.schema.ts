import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Athlete } from './athlete.schema.js';

export type SquadDocument = Squad & Document;

export enum SquadCategory {
  PROFESSIONAL = 'PROFESSIONAL',
  FEMININE = 'FEMININE',
  SUB_20 = 'SUB_20',
  SUB_17 = 'SUB_17',
  SUB_15 = 'SUB_15',
}

export enum SquadSector {
  GOALKEEPER = 'GOALKEEPER',
  DEFENDER = 'DEFENDER',
  MIDFIELDER = 'MIDFIELDER',
  FORWARD = 'FORWARD',
}

export enum SquadMemberRole {
  STARTER = 'STARTER',
  SUBSTITUTE = 'SUBSTITUTE',
  CAPTAIN = 'CAPTAIN',
  INJURED = 'INJURED',
}

@Schema({ _id: false })
export class SquadStaffMember {
  @Prop({ required: true, trim: true })
  role: string;

  @Prop({ required: true, trim: true })
  name: string;
}
export const SquadStaffMemberSchema = SchemaFactory.createForClass(SquadStaffMember);

@Schema({ _id: false })
export class SquadMember {
  @Prop({ type: Types.ObjectId, ref: Athlete.name, required: true })
  athlete: Types.ObjectId;

  @Prop({ required: true, type: Number })
  jerseyNumber: number;

  @Prop({ type: String, enum: Object.values(SquadSector), required: true })
  sector: SquadSector;

  @Prop({ type: String, enum: Object.values(SquadMemberRole), default: SquadMemberRole.STARTER })
  role: SquadMemberRole;

  @Prop({ type: Number, default: 0 })
  order: number;
}
export const SquadMemberSchema = SchemaFactory.createForClass(SquadMember);

@Schema({ timestamps: true })
export class Squad {
  @Prop({ required: true, type: Number, index: true })
  year: number;

  @Prop({ type: String, enum: Object.values(SquadCategory), required: true, index: true })
  category: SquadCategory;

  @Prop({ required: true, trim: true })
  seasonName: string;

  @Prop({ trim: true })
  coachName?: string;

  @Prop({ type: [SquadStaffMemberSchema], default: [] })
  staff: SquadStaffMember[];

  @Prop({ trim: true })
  coverUrl?: string;

  @Prop({ type: Boolean, default: false, index: true })
  isCurrent: boolean;

  @Prop({ type: [SquadMemberSchema], default: [] })
  members: SquadMember[];

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const SquadSchema = SchemaFactory.createForClass(Squad);

SquadSchema.index({ year: -1, category: 1, isActive: 1 });
SquadSchema.index({ isCurrent: 1, category: 1 });

