import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '@Users/dto';
import type { User } from '@PrismaClient';
import type { TokenPair } from '@Auth/types';

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT de acceso para el header Authorization: Bearer <token>.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIuLi4ifQ.firma',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Token opaco para renovar el acceso en POST /auth/refresh.',
    example: '9f2b1c8d4e6a7b3c5d1e0f2a4b6c8d0e',
  })
  refreshToken!: string;

  @ApiProperty({ description: 'Vigencia del access token, en segundos.', example: 900 })
  expiresIn!: number;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  static from(user: User, tokens: TokenPair): AuthResponseDto {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: UserResponseDto.fromEntity(user),
    };
  }
}
