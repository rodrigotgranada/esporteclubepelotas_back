import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true })
export class Role {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  label: string;

  @Prop()
  description: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ default: false })
  isImmutable: boolean; // Protects system roles like OWNER from being deleted or modified by mistake
}

export const RoleSchema = SchemaFactory.createForClass(Role);
