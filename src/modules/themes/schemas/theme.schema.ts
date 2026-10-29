import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ThemeDocument = Theme & Document;

@Schema({ _id: false })
export class ThemePalette {
  @Prop({ type: String, required: true, default: '#fbbf24' })
  primary: string; // Amarelo Pelotas padrão

  @Prop({ type: String, required: true, default: '#1e3a8a' })
  secondary: string; // Azul Escuro padrão

  @Prop({ type: String, required: true, default: '#0a0a0a' })
  background: string;

  @Prop({ type: String, required: true, default: '#171717' })
  surface: string;

  @Prop({ type: String, required: true, default: '#111111' })
  header: string; // Cor do Cabeçalho (Public Header)

  @Prop({ type: String, required: true, default: '#111111' })
  card: string; // Cor de Fundo de Cards (Home/Dashboard)

  @Prop({ type: String, required: true, default: '#111111' })
  drawer: string; // Cor de Fundo dos Drawers/Modais

  @Prop({ type: String, required: true, default: '#111111' })
  table: string; // Cor de Fundo das Tabelas

  @Prop({ type: String, required: true, default: '#1e3a8a' })
  buttonSecondary: string; // Cor de Fundo de Botões Secundários

  @Prop({ type: String, required: false })
  buttonPrimaryText?: string;

  @Prop({ type: String, required: false })
  buttonSecondaryText?: string;

  @Prop({ type: String, required: true, default: '#ffffff' })
  textPrimary: string;

  @Prop({ type: String, required: true, default: '#9ca3af' })
  textSecondary: string;

  @Prop({ type: String, required: true, default: '#374151' })
  border: string;

  @Prop({ type: String, required: true, default: '#22c55e' })
  success: string;

  @Prop({ type: String, required: true, default: '#ea580c' })
  error: string;

  @Prop({ type: String, required: true, default: '#f59e0b' })
  warning: string;
}

export const ThemePaletteSchema = SchemaFactory.createForClass(ThemePalette);

@Schema({ timestamps: true })
export class Theme {
  @Prop({ type: String, required: true, unique: true })
  name: string; // ex: "Padrão", "Outubro Rosa"

  @Prop({ type: Boolean, default: false })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isDefault: boolean; // Previne deleção do tema principal

  @Prop({ type: Boolean, default: false })
  isCampaign: boolean; // Identifica se é uma campanha sazonal

  @Prop({ type: String, default: null })
  campaignColor?: string; // Cor semente da campanha (ex: #ec4899)

  @Prop({ type: Date, default: null })
  startDate?: Date; // Data inicial da campanha (UTC)

  @Prop({ type: Date, default: null })
  endDate?: Date; // Data final da campanha (UTC)

  @Prop({ type: ThemePaletteSchema, required: true })
  light: ThemePalette;

  @Prop({ type: ThemePaletteSchema, required: true })
  dark: ThemePalette;
}

export const ThemeSchema = SchemaFactory.createForClass(Theme);
