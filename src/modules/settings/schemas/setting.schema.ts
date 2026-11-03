import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettingDocument = Setting & Document;

export class SocialLinkItem {
  @Prop({ required: true })
  platform: string;

  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  url: string;
}

export class ContactPhoneItem {
  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  number: string;

  @Prop({ default: false })
  isWhatsapp: boolean;
}

export class ContactEmailItem {
  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  email: string;
}

export class FooterNavigationItem {
  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  url: string;

  @Prop({ default: true })
  isVisible: boolean;

  @Prop({ default: false })
  isExternal: boolean;
}

export class OpeningHourItem {
  @Prop({ required: true })
  department: string;

  @Prop({ required: true })
  schedule: string;
}

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

  @Prop({ type: [Object], default: [] })
  socialLinks: SocialLinkItem[];

  @Prop({ type: [Object], default: [] })
  contactPhones: ContactPhoneItem[];

  @Prop({ type: [Object], default: [] })
  contactEmails: ContactEmailItem[];

  @Prop({ type: [Object], default: [] })
  openingHours: OpeningHourItem[];

  @Prop({ type: [Object], default: [] })
  footerNavigationLinks: FooterNavigationItem[];

  @Prop({ default: 'Estádio Boca do Lobo' })
  stadiumName: string;

  @Prop({ default: 'Av. Bento Gonçalves esquina Parque Dom Antônio Zattera - Pelotas/RS, CEP 96015-140' })
  stadiumAddress: string;

  @Prop({ default: 'https://maps.google.com/maps?q=Est%C3%A1dio+Boca+do+Lobo,+Pelotas+-+RS&t=&z=16&ie=UTF8&iwloc=&output=embed' })
  googleMapsEmbedUrl: string;

  @Prop({ default: '© 2026 Esporte Clube Pelotas. Todos os direitos reservados.' })
  copyrightText: string;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
