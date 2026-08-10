import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionQueryDto } from './dto/question-query.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';
import { AuditLog } from 'src/common/decorators/audit-log.decorator';

@ApiTags('Questions')
@ApiBearerAuth('bearer-auth')
@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  // POST /questions
  @ApiOperation({
    summary: 'Create a new question (MULTIPLE_CHOICE, TRUE_FALSE, or ESSAY)',
  })
  @ApiResponse({ status: 201, description: 'Question created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @AuditLog('CREATE_QUESTION')
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    return this.questionsService.create(user.userId, createQuestionDto);
  }

  // GET /questions
  @ApiOperation({
    summary:
      'Get all questions with optional type, difficulty, category, search filters, and pagination',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of questions' })
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() queryDto: QuestionQueryDto,
  ) {
    return this.questionsService.findAll(user.userId, queryDto);
  }

  // GET /questions/:id
  @ApiOperation({ summary: 'Get single question by ID' })
  @ApiResponse({ status: 200, description: 'Question details' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.questionsService.findOne(id, user.userId);
  }

  // PUT /questions/:id
  @ApiOperation({ summary: 'Update an existing question' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @AuditLog('UPDATE_QUESTION')
  @Put(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(id, user.userId, updateQuestionDto);
  }

  // DELETE /questions/:id
  @ApiOperation({
    summary: 'Delete a question (if not used in completed quizzes)',
  })
  @ApiResponse({ status: 200, description: 'Question deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete question used in completed quizzes',
  })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @AuditLog('DELETE_QUESTION')
  @Delete(':id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.questionsService.remove(id, user.userId);
  }
}
