import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../decorators/permissions/permissions.decorator.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !user.role || !user.role.permissions) {
      throw new ForbiddenException('User has no role or permissions.');
    }

    const userPermissions = user.role.permissions || [];

    // OWNER bypasses all permissions
    if (user.role.name === 'OWNER') {
      return true;
    }

    // Check if user has AT LEAST ONE of the required permissions
    const hasPermission = requiredPermissions.some((permission) => userPermissions.includes(permission));

    if (!hasPermission) {
      throw new ForbiddenException('Acesso Negado: Você não possui a permissão necessária para esta ação.');
    }

    return true;
  }
}
