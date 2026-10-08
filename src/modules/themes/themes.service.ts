import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Theme, ThemeDocument } from './schemas/theme.schema.js';

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
        light: {
          primary: '#fbbf24',
          secondary: '#1e3a8a',
          background: '#f3f4f6',
          surface: '#ffffff',
          textPrimary: '#111827',
          textSecondary: '#4b5563',
          border: '#e5e7eb',
          success: '#22c55e',
          error: '#ef4444',
          warning: '#f59e0b',
        },
        dark: {
          primary: '#fbbf24',
          secondary: '#1e3a8a',
          background: '#0a0a0a',
          surface: '#171717',
          textPrimary: '#ffffff',
          textSecondary: '#9ca3af',
          border: '#374151',
          success: '#22c55e',
          error: '#ef4444',
          warning: '#f59e0b',
        }
      });
    }
  }

  async getActiveTheme(): Promise<ThemeDocument> {
    const theme = await this.themeModel.findOne({ isActive: true }).lean().exec();
    if (!theme) {
      const defaultTheme = await this.themeModel.findOne({ isDefault: true }).lean().exec() as any;
      if (defaultTheme) defaultTheme._id = defaultTheme._id.toString();
      return defaultTheme;
    }
    (theme as any)._id = theme._id.toString();
    return theme as any;
  }

  async findAll(): Promise<ThemeDocument[]> {
    const themes = await this.themeModel.find().lean().exec() as any[];
    return themes.map(t => ({ ...t, _id: t._id.toString() }));
  }

  async create(createData: Partial<Theme>): Promise<ThemeDocument> {
    const newTheme = new this.themeModel(createData);
    const savedTheme = await newTheme.save();
    const obj = savedTheme.toObject() as any;
    obj._id = obj._id.toString();
    return obj;
  }

  async update(id: string, updateData: Partial<Theme>): Promise<ThemeDocument> {
    const theme = await this.themeModel.findByIdAndUpdate(id, updateData, { new: true }).lean().exec();
    if (!theme) throw new NotFoundException('Tema não encontrado.');
    (theme as any)._id = theme._id.toString();
    return theme as any;
  }

  async activate(id: string): Promise<void> {
    const theme = await this.themeModel.findById(id).exec();
    if (!theme) throw new NotFoundException('Tema não encontrado.');

    await this.themeModel.updateMany({}, { isActive: false }).exec();
    
    theme.isActive = true;
    await theme.save();
  }

  async remove(id: string): Promise<void> {
    const theme = await this.themeModel.findById(id).exec();
    if (!theme) throw new NotFoundException('Tema não encontrado.');
    if (theme.isDefault) throw new BadRequestException('Não é possível remover o tema padrão.');
    
    if (theme.isActive) {
      const defaultTheme = await this.themeModel.findOne({ isDefault: true }).exec();
      if (defaultTheme) {
        defaultTheme.isActive = true;
        await defaultTheme.save();
      }
    }
    
    await this.themeModel.findByIdAndDelete(id).exec();
  }
}
