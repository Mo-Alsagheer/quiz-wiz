import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CategoryType } from 'src/common/enums/category-enum';
import { DifficultyLevel } from 'src/common/enums/difficulty-enum';
import { QuestionType } from 'src/common/enums/question-type.enum';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QuestionQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: QuestionType,
    description: 'Filter questions by type',
  })
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @ApiPropertyOptional({
    enum: DifficultyLevel,
    description: 'Filter by difficulty',
  })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel;

  @ApiPropertyOptional({
    enum: CategoryType,
    description: 'Filter by category',
  })
  @IsOptional()
  @IsEnum(CategoryType)
  categoryType?: CategoryType;
}
