import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SystemModule as SysMod, SystemModuleDocument } from './schemas/system-module.schema.js';

@Injectable()
export class SystemModulesService {
  constructor(@InjectModel(SysMod.name) private moduleModel: Model<SystemModuleDocument>) {}

  async findAll(): Promise<any[]> {
    return this.moduleModel.find().lean().exec();
  }

  async findOne(id: string): Promise<any> {
    const module = await this.moduleModel.findById(id).lean().exec();
    if (!module) throw new NotFoundException('Module not found');
    return module;
  }

  async updateStatus(id: string, isActive: boolean): Promise<any> {
    const module = await this.moduleModel
      .findByIdAndUpdate(id, { isActive }, { new: true })
      .lean()
      .exec();
    if (!module) throw new NotFoundException('Module not found');
    return module;
  }

  async isModuleActive(slug: string): Promise<boolean> {
    const module = await this.moduleModel.findOne({ slug }).lean().exec();
    return module ? Boolean(module.isActive) : true;
  }
}
