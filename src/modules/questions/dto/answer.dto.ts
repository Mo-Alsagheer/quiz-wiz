import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AnswerDto {
  @ApiProperty({
    description: 'Option identifier (e.g. A, B, C, D)',
    example: 'A',
  })
  @IsNotEmpty()
  @IsString()
  option: string;

  @ApiProperty({
    description: 'Text description for option choice',
    example: 'Cascading Style Sheets',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text: string;
}
