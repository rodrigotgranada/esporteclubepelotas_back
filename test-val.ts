import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './src/modules/users/dto/create-user.dto.js';
import { ValidationPipe } from '@nestjs/common';

async function run() {
  const payload = {
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    password: "password123",
    cpf: "123.456.789-00",
    birthDate: new Date().toISOString(),
    avatarUrl: "https://mock.com/avatar.jpg",
    phones: [{ number: "123456789", isWhatsapp: true, isPrimary: true }],
    addresses: [{ zipCode: "12345678", street: "Rua A", number: "123", neighborhood: "Bairro", city: "Cidade", state: "RS", isPrimary: true }]
  };

  const dto = plainToInstance(CreateUserDto, payload);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  console.log('Errors:', errors.length);
  console.log('DTO:', dto);
}

run();
