import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  // Adicionado type: String aqui
  @Prop({ type: String, required: true })
  action: string;

  @Prop({ type: Object })
  details: Record<string, any>;

  // Adicionado type: String aqui
  @Prop({ type: String })
  ipAddress: string;

  // Adicionado type: String aqui
  @Prop({ type: String })
  userAgent: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
