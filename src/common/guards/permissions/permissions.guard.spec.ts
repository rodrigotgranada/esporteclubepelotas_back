import { PermissionsGuard } from './permissions.guard.js';

describe('PermissionsGuard', () => {
  it('should be defined', () => {
    expect(new PermissionsGuard()).toBeDefined();
  });
});
