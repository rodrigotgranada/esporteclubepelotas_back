import { Exclude } from 'class-transformer';

export class UserEntity {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  
  @Exclude()
  passwordHash: string;
  
  cpf: string;
  avatarUrl?: string;
  role: any;
  status: string;
  isActive: boolean;
  addresses?: any[];
  phones?: any[];
  birthDate?: Date;
  preferences?: any;
  createdAt?: Date;
  updatedAt?: Date;
  pendingChanges?: Array<{
    type: 'email' | 'phone';
    newValue: string;
    code: string;
    expiresAt: Date;
  }>;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
