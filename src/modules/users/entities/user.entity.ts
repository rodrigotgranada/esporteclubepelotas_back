import { Exclude } from 'class-transformer';

export class UserEntity {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  
  @Exclude()
  passwordHash: string;
  
  cpf: string;
  avatarUrl?: string;
  role: string;
  isActive: boolean;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
