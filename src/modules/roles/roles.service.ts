import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema.js';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private roleModel: Model<RoleDocument>) {}

  async findAll(): Promise<any[]> {
    const roles = await this.roleModel.find().lean().exec();
    return roles.map((r: any) => ({
      ...r,
      _id: r._id.toString(),
      id: r._id.toString(),
    }));
  }

  async findOne(id: string): Promise<any> {
    const role: any = await this.roleModel.findById(id).lean().exec();
    if (!role) throw new NotFoundException('Role not found');
    return {
      ...role,
      _id: role._id.toString(),
      id: role._id.toString(),
    };
  }

  async create(createRoleDto: { name: string; label?: string; description?: string; permissions?: string[] }): Promise<RoleDocument> {
    const existing = await this.roleModel.findOne({ name: createRoleDto.name });
    if (existing) {
      throw new ConflictException('Role already exists');
    }
    const newRole = new this.roleModel(createRoleDto);
    return newRole.save();
  }

  async update(id: string, updateRoleDto: { name?: string; label?: string; description?: string; permissions?: string[] }): Promise<RoleDocument> {
    const roleDocument = await this.roleModel.findById(id).exec();
    if (!roleDocument) throw new NotFoundException('Role not found');

    if (roleDocument.isImmutable) {
      // Immutable roles can only update label and description
      if (updateRoleDto.label !== undefined) roleDocument.label = updateRoleDto.label;
      if (updateRoleDto.description !== undefined) roleDocument.description = updateRoleDto.description;
      return roleDocument.save();
    }

    if (updateRoleDto.name && updateRoleDto.name !== roleDocument.name) {
      const existing = await this.roleModel.findOne({ name: updateRoleDto.name });
      if (existing) throw new ConflictException('Role name already in use');
    }

    Object.assign(roleDocument, updateRoleDto);
    return roleDocument.save();
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);
    if (role.isImmutable) {
      throw new ConflictException('This role is immutable and cannot be deleted');
    }
    await this.roleModel.deleteOne({ _id: id }).exec();
  }
}
