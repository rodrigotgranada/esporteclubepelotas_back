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

  @Prop({ default: 'Estádio Boca do Lobo' })
  stadiumName: string;

  @Prop({ default: 'Av. Bento Gonçalves esquina Parque Dom Antônio Zattera - Pelotas/RS, CEP 96015-140' })
  stadiumAddress: string;

  @Prop({ default: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3393.2081577457755!2d-52.338274023616654!3d-31.76483561175654!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9511b594bce376b5%3A0xeae06c624641dbef!2sEst%C3%A1dio%20Boca%20do%20Lobo%20-%20Pelotas!5e0!3m2!1spt-BR!2sbr!4v1714000000000!5m2!1spt-BR!2sbr' })
  googleMapsEmbedUrl: string;

  @Prop({ default: '© 2026 Esporte Clube Pelotas. Todos os direitos reservados.' })
  copyrightText: string;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
