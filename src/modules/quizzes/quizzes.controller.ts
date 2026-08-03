import {
  Body,
  Controller,
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
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { QuizStatus } from 'src/common/enums/quiz.status.enum';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';

@ApiTags('Quizzes')
@ApiBearerAuth('bearer-auth')
@Controller('quizzes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // POST /quizzes
  @ApiOperation({
    summary: 'Create and schedule a new quiz with auto-generated code',
  })
  @ApiResponse({ status: 201, description: 'Quiz created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or insufficient questions',
  })
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() createQuizDto: CreateQuizDto,
  ) {
    return this.quizzesService.create(user.userId, createQuizDto);
  }

  // GET /quizzes
  @ApiOperation({
    summary: 'Get all quizzes for instructor with optional status filter',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of quizzes' })
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: QuizStatus,
  ) {
    return this.quizzesService.findAll(user.userId, page, limit, status);
  }

  // GET /quizzes/:id
  @ApiOperation({
    summary: 'Get single quiz by ID with assigned groups and questions',
  })
  @ApiResponse({ status: 200, description: 'Quiz details' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.quizzesService.findOne(id, user.userId);
  }

  // PUT /quizzes/:id
  @ApiOperation({
    summary:
      'Update quiz title, duration, description (locked after scheduled time)',
  })
  @ApiResponse({ status: 200, description: 'Quiz updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Quiz cannot be edited after its scheduled time has passed',
  })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @Put(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateQuizDto: UpdateQuizDto,
  ) {
    return this.quizzesService.update(id, user.userId, updateQuizDto);
  }

  // POST /quizzes/:id/reassign
  @ApiOperation({
    summary:
      'Reassign an expired quiz with a new scheduled date and access code',
  })
  @ApiResponse({ status: 200, description: 'Quiz reassigned successfully' })
  @ApiResponse({
    status: 400,
    description: 'Quiz not yet expired or invalid date',
  })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @Post(':id/reassign')
  reassign(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body('scheduledDateTime') scheduledDateTime: string,
  ) {
    return this.quizzesService.reassign(id, user.userId, scheduledDateTime);
  }
}
