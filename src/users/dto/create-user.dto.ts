import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsNormalizedEmail } from '@Common/decorators';

export class CreateUserDto {
  @ApiPropertyOptional({
    description: 'Nombre visible. Si se omite se usa la parte local del email.',
    example: 'Ana López',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiProperty({
    description: 'Email del usuario. Se normaliza a minúsculas y sin espacios.',
    example: 'nestor@example.com',
    format: 'email',
    maxLength: 254,
  })
  @IsNormalizedEmail()
  email!: string;

  @ApiProperty({
    description:
      'Contraseña. Debe incluir al menos una minúscula, una mayúscula y un número.',
    example: 'Str0ngPass',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  // bcrypt trunca silenciosamente en 72 bytes, así que se rechaza antes de hashear.
  @MaxLength(72, {
    message: 'La contraseña no puede superar los 72 caracteres.',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'La contraseña debe incluir al menos una minúscula, una mayúscula y un número.',
  })
  password!: string;
}
