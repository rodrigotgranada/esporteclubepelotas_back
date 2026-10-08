import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load .env
dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/esporte_clube_pelotas';

const defaultThemes = [
  {
    name: 'Padrão (Azul e Amarelo)',
    isActive: true,
    isDefault: true,
    light: {
      primary: '#fbbf24', // Amarelo Ouro
      secondary: '#1e3a8a', // Azul Royal
      buttonSecondary: '#1e3a8a',
      background: '#f3f4f6', // Cinza claro padrão
      surface: '#ffffff',
      header: '#1e3a8a', // Header azul royal
      card: '#ffffff',
      drawer: '#ffffff',
      table: '#ffffff',
      textPrimary: '#111827',
      textSecondary: '#4b5563',
      border: '#e5e7eb',
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
    },
    dark: {
      primary: '#fbbf24', // Amarelo Ouro
      secondary: '#1e3a8a', // Azul Royal
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
      error: '#ef4444',
      warning: '#f59e0b',
    }
  },
  {
    name: 'Outubro Rosa',
    isActive: false,
    isDefault: false,
    light: {
      primary: '#ec4899', // Pink 500
      secondary: '#be185d', // Pink 700
      buttonSecondary: '#be185d',
      background: '#fdf2f8', // Pink 50
      surface: '#ffffff',
      header: '#ec4899', // Header rosa
      card: '#ffffff',
      drawer: '#ffffff',
      table: '#ffffff',
      textPrimary: '#831843', // Pink 900
      textSecondary: '#9d174d', // Pink 800
      border: '#fbcfe8', // Pink 200
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
    },
    dark: {
      primary: '#f472b6', // Pink 400
      secondary: '#ec4899', // Pink 500
      buttonSecondary: '#ec4899',
      background: '#1a0b12', // Rosa muito escuro (próximo ao preto)
      surface: '#3b1c2b', // Fundo de card escuro mas com tom rosa
      header: '#28111e',
      card: '#28111e',
      drawer: '#28111e',
      table: '#28111e',
      textPrimary: '#fce7f3', // Pink 100
      textSecondary: '#fbcfe8', // Pink 200
      border: '#831843', // Pink 900
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
    }
  },
  {
    name: 'Novembro Azul',
    isActive: false,
    isDefault: false,
    light: {
      primary: '#3b82f6', // Blue 500
      secondary: '#1d4ed8', // Blue 700
      buttonSecondary: '#1d4ed8',
      background: '#eff6ff', // Blue 50
      surface: '#ffffff',
      header: '#3b82f6', // Header azul
      card: '#ffffff',
      drawer: '#ffffff',
      table: '#ffffff',
      textPrimary: '#1e3a8a', // Blue 900
      textSecondary: '#1e40af', // Blue 800
      border: '#bfdbfe', // Blue 200
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
    },
    dark: {
      primary: '#60a5fa', // Blue 400
      secondary: '#3b82f6', // Blue 500
      buttonSecondary: '#3b82f6',
      background: '#0a101d', // Azul muito escuro
      surface: '#152238',
      header: '#0f172a',
      card: '#0f172a',
      drawer: '#0f172a',
      table: '#0f172a',
      textPrimary: '#dbeafe', // Blue 100
      textSecondary: '#bfdbfe', // Blue 200
      border: '#1e3a8a', // Blue 900
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
    }
  },
  {
    name: 'Setembro Amarelo',
    isActive: false,
    isDefault: false,
    light: {
      primary: '#eab308', // Yellow 500
      secondary: '#a16207', // Yellow 700
      buttonSecondary: '#a16207',
      background: '#fefce8', // Yellow 50
      surface: '#ffffff',
      header: '#eab308', // Header Amarelo
      card: '#ffffff',
      drawer: '#ffffff',
      table: '#ffffff',
      textPrimary: '#713f12', // Yellow 900
      textSecondary: '#854d0e', // Yellow 800
      border: '#fef08a', // Yellow 200
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
    },
    dark: {
      primary: '#fde047', // Yellow 300
      secondary: '#eab308', // Yellow 500
      buttonSecondary: '#eab308',
      background: '#1c1911', // Amarelo/Marrom super escuro
      surface: '#2a2416',
      header: '#201b10',
      card: '#201b10',
      drawer: '#201b10',
      table: '#201b10',
      textPrimary: '#fef9c3', // Yellow 100
      textSecondary: '#fef08a', // Yellow 200
      border: '#713f12', // Yellow 900
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
    }
  }
];

async function seedThemes() {
  try {
    console.log(`Connecting to MongoDB... (${MONGODB_URI})`);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    const ThemeModel = mongoose.model('Theme', new mongoose.Schema({
      name: String,
      isActive: Boolean,
      isDefault: Boolean,
      light: Object,
      dark: Object
    }, { strict: false })); // Use strict:false to allow easy bulk insert without full schema

    console.log('Deleting existing themes...');
    await ThemeModel.deleteMany({});
    
    console.log('Inserting default themes...');
    await ThemeModel.insertMany(defaultThemes);
    
    console.log('Themes seeded successfully!');
  } catch (error) {
    console.error('Error seeding themes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seedThemes();
