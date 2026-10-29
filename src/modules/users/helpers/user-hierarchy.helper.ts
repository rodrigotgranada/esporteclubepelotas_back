import { BadRequestException } from '@nestjs/common';
import { Model, Types } from 'mongoose';

export class UserHierarchyHelper {
  static async resolveRoleName(roleModel: Model<any>, roleOrIdOrDoc: any): Promise<string> {
    if (!roleOrIdOrDoc) return '';

    if (typeof roleOrIdOrDoc === 'string') {
      const upper = roleOrIdOrDoc.toUpperCase();
      if (['OWNER', 'ADMIN', 'EDITOR', 'SOCIO', 'SOCIETY', 'USER'].includes(upper)) {
        return upper === 'SOCIETY' ? 'SOCIO' : upper;
      }
      if (Types.ObjectId.isValid(roleOrIdOrDoc)) {
        const found = await roleModel.findById(roleOrIdOrDoc).exec();
        const foundName = found?.name?.toUpperCase() || '';
        return foundName === 'SOCIETY' ? 'SOCIO' : foundName;
      }
      return upper;
    }

    const name = roleOrIdOrDoc.name || roleOrIdOrDoc.role || '';
    if (typeof name === 'string') {
      const upper = name.toUpperCase();
      return upper === 'SOCIETY' ? 'SOCIO' : upper;
    }
    return '';
  }

  static async checkHierarchy(
    roleModel: Model<any>,
    actorRole: any,
    targetRole: any,
    actionType: 'edit' | 'promote' = 'edit',
  ): Promise<void> {
    const actorName = await this.resolveRoleName(roleModel, actorRole);
    const targetName = await this.resolveRoleName(roleModel, targetRole);

    if (actorName === 'OWNER') return;

    if (actorName === 'ADMIN') {
      if (targetName === 'OWNER') {
        throw new BadRequestException(
          `Admins não têm permissão para ${actionType === 'promote' ? 'promover para' : 'modificar um'} Owner.`,
        );
      }
      return;
    }

    throw new BadRequestException('Ação não permitida para o seu nível de acesso.');
  }
}

