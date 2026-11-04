import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard.js';
import { describe, it, expect } from 'vitest';

describe('PermissionsGuard', () => {
  it('should be defined', () => {
    expect(new PermissionsGuard(new Reflector())).toBeDefined();
  });
});
