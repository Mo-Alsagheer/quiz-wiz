import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;
}

export class AuthResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  accessToken: string;

  @ApiPropertyOptional()
  expiresIn?: string;

  @ApiProperty({ type: () => UserResponseDto })
  user: UserResponseDto;
}

export class MessageResponseDto {
  @ApiProperty()
  message: string;
}
