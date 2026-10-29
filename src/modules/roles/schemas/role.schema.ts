import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true })
export class Role {
  @Prop({ type: String, required: true, unique: true })
  name: string;

  @Prop({ type: String })
  label: string;

  @Prop({ type: String })
  description: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ type: Boolean, default: false })
  isImmutable: boolean; // Protects system roles like OWNER from being deleted or modified by mistake
}

export const RoleSchema = SchemaFactory.createForClass(Role);
