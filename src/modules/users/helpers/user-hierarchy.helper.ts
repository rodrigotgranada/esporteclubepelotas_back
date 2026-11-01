import { BadRequestException } from '@nestjs/common';
import { Model, Types } from 'mongoose';

export class UserHierarchyHelper {
  private static readonly ROLE_LEVELS: Record<string, number> = {
    OWNER: 100,
    ADMIN: 80,
    EDITOR: 50,
    SOCIO: 20,
    USER: 10,
  };

  static getRoleLevel(roleName: string): number {
    return this.ROLE_LEVELS[roleName?.toUpperCase()] || 0;
  }

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

    if (typeof roleOrIdOrDoc === 'object') {
      const name = roleOrIdOrDoc.name || roleOrIdOrDoc.role || '';
      if (typeof name === 'string' && name.trim()) {
        const upper = name.toUpperCase();
        return upper === 'SOCIETY' ? 'SOCIO' : upper;
      }
      const id = roleOrIdOrDoc._id || roleOrIdOrDoc.id;
      if (id && Types.ObjectId.isValid(id)) {
        const found = await roleModel.findById(id).exec();
        const foundName = found?.name?.toUpperCase() || '';
        return foundName === 'SOCIETY' ? 'SOCIO' : foundName;
      }
    }
    return '';
  }

  static async checkHierarchy(
    roleModel: Model<any>,
    actorRole: any,
    targetRole: any,
    actionType: 'edit' | 'promote' | 'delete' = 'edit',
  ): Promise<void> {
    const actorName = await this.resolveRoleName(roleModel, actorRole);
    const targetName = await this.resolveRoleName(roleModel, targetRole);

    const actorLevel = this.getRoleLevel(actorName);
    const targetLevel = this.getRoleLevel(targetName);

    // O OWNER possui controle absoluto
    if (actorName === 'OWNER') {
      if (actionType === 'delete' && targetName === 'OWNER') {
        throw new BadRequestException('O Proprietário (Owner) não pode ser excluído.');
      }
      return;
    }

    // Regra 1: Qualquer tentativa de ação sobre o OWNER por não-owners é estritamente bloqueada
    if (targetName === 'OWNER') {
      throw new BadRequestException(
        `Usuários do nível ${actorName || 'atual'} não têm permissão para ${
          actionType === 'promote' ? 'promover para' : actionType === 'delete' ? 'excluir um' : 'modificar um'
        } Proprietário (Owner).`,
      );
    }

    // Regra 2: Usuários com nível menor NUNCA podem modificar usuários de nível maior
    if (actionType === 'edit' && actorLevel < targetLevel) {
      throw new BadRequestException(
        `Usuários do nível ${actorName} não têm permissão para modificar um usuário ${targetName} (hierarquia superior).`,
      );
    }

    // Regra 3: Promoção/atribuição de cargo só pode ser feita para níveis estritamente inferiores ao do autor
    if (actionType === 'promote' && targetLevel >= actorLevel) {
      throw new BadRequestException(
        `Você não tem permissão para atribuir um cargo de nível igual ou superior ao seu (${targetName}).`,
      );
    }

    // Regra 4: Exclusão de usuários de mesmo nível ou superior é restrita ao OWNER
    if (actionType === 'delete' && targetLevel >= actorLevel) {
      throw new BadRequestException(
        `Apenas o Proprietário (Owner) pode excluir usuários do nível ${targetName}.`,
      );
    }

    // Se o ator não tem nível mínimo de gestão (pelo menos ADMIN/EDITOR com permissão)
    if (actorLevel < this.ROLE_LEVELS.ADMIN && actorLevel <= targetLevel) {
      throw new BadRequestException('Ação não permitida para o seu nível de acesso.');
    }
  }
}
