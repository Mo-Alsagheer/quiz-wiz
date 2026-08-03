import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AnswerDto {
  @IsEnum(['A', 'B', 'C', 'D'])
  option: 'A' | 'B' | 'C' | 'D';

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  text: string;
}