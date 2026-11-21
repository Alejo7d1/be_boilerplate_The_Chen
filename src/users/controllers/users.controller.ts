import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '@Common/dto';
import { UserRole, type User } from '@PrismaClient';
import { CurrentUser, Public, Roles } from '@Auth/decorators';
import { UsersService } from '@Users/services';
import {
  CreateUserDto,
  ListUsersQueryDto,
  MemberOptionListResponseDto,
  MemberOptionResponseDto,
  UserListResponseDto,
  UserResponseDto,
} from '@Users/dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Registro. Crear un usuario es crear un recurso, así que es un POST a la
   * colección `/users` y responde 201 (el default de Nest para POST).
   */
  @Public()
  @Post()
  @ApiOperation({
    summary: 'Registra un nuevo miembro',
    description:
      'Alta pública: el backend asigna siempre el rol MIEMBRO y genera el carné. El nombre es opcional; si falta se usa la parte local del email.',
  })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Email o contraseña inválidos',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'El email ya está registrado.',
  })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(dto);
    return UserResponseDto.fromEntity(user);
  }

  /**
   * Padrón de miembros para el selector de compra/renovación (BE-2.2) y para
   * que el entrenador asigne rutinas (H12). Nunca expone hash de contraseña ni
   * datos de pago.
   */
  @Get()
  @Roles('RECEPCION_ADMIN', 'ENTRENADOR')
  @ApiBearerAuth()
  @ApiQuery({
    name: 'role',
    required: false,
    enum: UserRole,
    description:
      'Rol a listar. Por defecto MIEMBRO; el rol ENTRENADOR siempre recibe miembros.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Texto libre sobre nombre, email o carné.',
  })
  @ApiOperation({
    summary: 'Lista y busca miembros por rol',
    description:
      'Padrón para el selector de compra/renovación y para asignar rutinas. Por defecto filtra MIEMBRO; search busca en nombre, email y carné. Un ENTRENADOR solo recibe `id`, `name` y `cardNumber` de los miembros.',
  })
  @ApiOkResponse({
    type: UserListResponseDto,
    description:
      '`{ data: UserResponseDto[] }`; para el rol ENTRENADOR, `{ data: MemberOptionResponseDto[] }`.',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Token ausente o inválido',
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Rol distinto de RECEPCION_ADMIN o ENTRENADOR',
  })
  async list(
    @Query() query: ListUsersQueryDto,
    @CurrentUser() user: User,
  ): Promise<UserListResponseDto | MemberOptionListResponseDto> {
    if (user.role === UserRole.ENTRENADOR) {
      const members = await this.usersService.listByRole(
        UserRole.MIEMBRO,
        query.search,
      );
      return {
        data: members.map((member) =>
          MemberOptionResponseDto.fromEntity(member),
        ),
      };
    }

    const users = await this.usersService.listByRole(
      query.role ?? UserRole.MIEMBRO,
      query.search,
    );
    return { data: users.map((entity) => UserResponseDto.fromEntity(entity)) };
  }
}
