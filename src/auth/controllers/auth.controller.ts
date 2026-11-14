import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '@Common/dto';
import { AuthService } from '@Auth/services';
import { CurrentUser, Public } from '@Auth/decorators';
import { AuthResponseDto, LoginDto, RefreshTokenDto } from '@Auth/dto';
import { UserResponseDto } from '@Users/dto';
import type { User } from '@PrismaClient';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login. Responde 200 y no 201: no se crea un recurso direccionable, se
   * devuelve una representación de la sesión. Nest usa 201 por defecto en
   * POST, de ahí el @HttpCode explícito.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Inicia sesión con email y contraseña',
    description:
      'Devuelve un access token JWT de corta vida y un refresh token opaco. Email inexistente, contraseña incorrecta y cuenta inactiva responden el mismo 401.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Cuerpo inválido',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Credenciales inválidas.',
  })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    const { user, tokens } = await this.authService.login(dto);
    return AuthResponseDto.from(user, tokens);
  }

  /** Canjea el refresh token por un par nuevo. El token viejo queda revocado. */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renueva el access token rotando el refresh token',
    description:
      'Revoca el refresh token usado y emite un par nuevo. Reutilizar un token ya canjeado revoca todas las sesiones del usuario.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Cuerpo inválido',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Refresh token inválido, expirado o ya utilizado.',
  })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const { user, tokens } = await this.authService.refresh(dto.refreshToken);
    return AuthResponseDto.from(user, tokens);
  }

  /** Logout. 204 porque no hay cuerpo que devolver. */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cierra la sesión revocando el refresh token',
    description:
      'Es idempotente: repetirlo con un token ya revocado también responde 204.',
  })
  @ApiNoContentResponse({ description: 'Sesión cerrada.' })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Cuerpo inválido',
  })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  /** Usuario autenticado. Protegido por el guard global. */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Devuelve el usuario autenticado',
    description: 'Incluye rol, nombre y carné del usuario dueño del token.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente, inválido o expirado.',
  })
  me(@CurrentUser() user: User): UserResponseDto {
    return UserResponseDto.fromEntity(user);
  }
}
