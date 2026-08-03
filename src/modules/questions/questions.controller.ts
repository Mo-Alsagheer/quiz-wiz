import {
Body,
 Controller,  Delete,  Get,  Param,  Post,  Put,  Query,  UseGuards,} from '@nestjs/common';
import { QuestionsService } from './questions.service'
import { CreateQuestionDto } from 'src/dtos/create-question.dto';
import { UpdateQuestionDto } from 'src/dtos/update-question.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { CategoryType } from 'src/common/enums/category-enum';
import { DifficultyLevel } from 'src/common/enums/difficulty-enum';
@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
  ) {}

  // POST /questions
  @Post()
  create(
    @CurrentUser() user: any,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    return this.questionsService.create(
      user.userId,
      createQuestionDto,
    );
  }

  // GET /questions
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('difficultyLevel')
    difficultyLevel?: DifficultyLevel,
    @Query('categoryType')
    categoryType?: CategoryType,
    @Query('search')
    search?: string,
  ) {
    return this.questionsService.findAll(
      user.userId,
      Number(page),
      Number(limit),
      difficultyLevel,
      categoryType,
      search,
    );
  }

  // GET /questions/:id
  @Get(':id')
  findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.questionsService.findOne(
      id,
      user.userId,
    );
  }

  // PUT /questions/:id
  @Put(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(
      id,
      user.userId,
      updateQuestionDto,
    );
  }

  // DELETE /questions/:id
  @Delete(':id')
  remove(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.questionsService.remove(
      id,
      user.userId,
    );
  }
}