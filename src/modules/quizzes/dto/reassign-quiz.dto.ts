import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class ReassignQuizDto {
  @ApiProperty({
    description:
      'New scheduled date and time for the reassigned quiz (ISO 8601 string)',
    example: '2026-09-01T10:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  scheduledDateTime: string;
}
