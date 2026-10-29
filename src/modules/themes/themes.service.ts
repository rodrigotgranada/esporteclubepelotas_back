import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Theme, ThemeDocument } from './schemas/theme.schema.js';
import { generateCampaignPalettes } from './helpers/palette-generator.helper.js';

@Injectable()
export class ThemesService {
  constructor(
    @InjectModel(Theme.name) private themeModel: Model<ThemeDocument>,
  ) {}

  async onModuleInit() {
    // Seed default theme if none exists
    const count = await this.themeModel.countDocuments();
    if (count === 0) {
      await this.themeModel.create({
        name: 'Padrão E.C. Pelotas',
        isActive: true,
        isDefault: true,
        isCampaign: false,
        light: {
          primary: '#fbbf24',
          secondary: '#1e3a8a',
          buttonSecondary: '#1e3a8a',
          background: '#f3f4f6',
          surface: '#ffffff',
          header: '#1e3a8a',
          card: '#ffffff',
          drawer: '#ffffff',
          table: '#ffffff',
          textPrimary: '#111827',
          textSecondary: '#4b5563',
          border: '#e5e7eb',
          success: '#22c55e',
          error: '#ea580c',
          warning: '#f59e0b',
        },
        dark: {
          primary: '#fbbf24',
          secondary: '#1e3a8a',
          buttonSecondary: '#1e3a8a',
          background: '#0a0a0a',
          surface: '#171717',
          header: '#111111',
          card: '#111111',
          drawer: '#111111',
          table: '#111111',
          textPrimary: '#ffffff',
          textSecondary: '#9ca3af',
          border: '#374151',
          success: '#22c55e',
          error: '#ea580c',
          warning: '#f59e0b',
        },
      });
    }
  }

  async getActiveTheme(): Promise<ThemeDocument> {
    const now = new Date();

    // 1. Procura por campanhas ativas e dentro da vigência de datas (UTC)
    const activeCampaign = await this.themeModel
      .findOne({
        isCampaign: true,
        isActive: true,
        $or: [
          { startDate: { $lte: now }, endDate: { $gte: now } },
          { startDate: { $lte: now }, endDate: null },
          { startDate: null, endDate: { $gte: now } },
          { startDate: null, endDate: null },
        ],
      })
      .sort({ startDate: -1, updatedAt: -1 })
      .lean()
      .exec();

    if (activeCampaign) {
      (activeCampaign as any)._id = activeCampaign._id.toString();
      return activeCampaign as any;
    }

    // 2. Fallback para o tema regular padrão ativo
    const regularTheme = await this.themeModel
      .findOne({ isActive: true, isCampaign: false })
      .lean()
      .exec();

    if (regularTheme) {
      (regularTheme as any)._id = regularTheme._id.toString();
      return regularTheme as any;
    }

    // 3. Fallback para o tema default registrado
    const defaultTheme = (await this.themeModel
      .findOne({ isDefault: true })
      .lean()
      .exec()) as any;

    if (defaultTheme) {
      defaultTheme._id = defaultTheme._id.toString();
      return defaultTheme;
    }

    const anyTheme = (await this.themeModel.findOne().lean().exec()) as any;
    if (anyTheme) {
      anyTheme._id = anyTheme._id.toString();
      return anyTheme;
    }

    throw new NotFoundException('Nenhum tema configurado.');
  }

  async findAll(): Promise<ThemeDocument[]> {
    const themes = (await this.themeModel
      .find()
      .sort({ isCampaign: -1, createdAt: -1 })
      .lean()
      .exec()) as any[];
    return themes.map((t) => ({ ...t, _id: t._id.toString() }));
  }

  async create(createData: Partial<Theme>): Promise<ThemeDocument> {
    const payload = { ...createData };

    if (payload.isCampaign && payload.campaignColor) {
      const generated = generateCampaignPalettes(payload.campaignColor);
      if (!payload.light || Object.keys(payload.light).length === 0) {
        payload.light = generated.light;
      }
      if (!payload.dark || Object.keys(payload.dark).length === 0) {
        payload.dark = generated.dark;
      }
    }

    const newTheme = new this.themeModel(payload);
    const savedTheme = await newTheme.save();
    const obj = savedTheme.toObject() as any;
    obj._id = obj._id.toString();
    return obj;
  }

  async update(id: string, updateData: Partial<Theme>): Promise<ThemeDocument> {
    const payload = { ...updateData };

    if (payload.isCampaign && payload.campaignColor) {
      if (!payload.light || !payload.dark) {
        const generated = generateCampaignPalettes(payload.campaignColor);
        payload.light = payload.light || generated.light;
        payload.dark = payload.dark || generated.dark;
      }
    }

    const theme = await this.themeModel
      .findByIdAndUpdate(id, payload, { new: true })
      .lean()
      .exec();
    if (!theme) throw new NotFoundException('Tema não encontrado.');
    (theme as any)._id = theme._id.toString();
    return theme as any;
  }

  async activate(id: string): Promise<void> {
    const theme = await this.themeModel.findById(id).exec();
    if (!theme) throw new NotFoundException('Tema não encontrado.');

    if (theme.isCampaign) {
      await this.themeModel.updateMany({ isCampaign: true }, { isActive: false }).exec();
      theme.isActive = true;
      await theme.save();
    } else {
      await this.themeModel.updateMany({ isCampaign: false }, { isActive: false }).exec();
      theme.isActive = true;
      await theme.save();
    }
  }

  async deactivate(id: string): Promise<void> {
    const theme = await this.themeModel.findById(id).exec();
    if (!theme) throw new NotFoundException('Tema não encontrado.');
    if (theme.isDefault) {
      throw new BadRequestException('Não é possível desativar o tema padrão.');
    }

    theme.isActive = false;
    await theme.save();
  }

  async remove(id: string): Promise<void> {
    const theme = await this.themeModel.findById(id).exec();
    if (!theme) throw new NotFoundException('Tema não encontrado.');
    if (theme.isDefault) {
      throw new BadRequestException('Não é possível remover o tema padrão.');
    }

    if (theme.isActive && !theme.isCampaign) {
      const defaultTheme = await this.themeModel.findOne({ isDefault: true }).exec();
      if (defaultTheme) {
        defaultTheme.isActive = true;
        await defaultTheme.save();
      }
    }

    await this.themeModel.findByIdAndDelete(id).exec();
  }
}
