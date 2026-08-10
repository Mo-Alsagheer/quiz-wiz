import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ResultsService } from './results.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';
import { InstructorResultsQueryDto } from './dto/instructor-results-query.dto';

@ApiTags('Results')
@ApiBearerAuth('bearer-auth')
@Controller('results')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  // LEARNER ENDPOINTS
  @ApiOperation({ summary: 'Get paginated quiz results for current learner' })
  @ApiResponse({ status: 200, description: 'Paginated list of quiz results' })
  @Roles(UserRole.LEARNER)
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.resultsService.findAll(
      user.userId,
      Number(page),
      Number(limit),
    );
  }

  // INSTRUCTOR ENDPOINTS
  @ApiOperation({
    summary:
      'Get paginated quiz results for instructor quizzes with optional filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of student results for instructor quizzes',
  })
  @Roles(UserRole.INSTRUCTOR)
  @Get('instructor')
  findAllForInstructor(
    @CurrentUser() user: JwtPayload,
    @Query() query: InstructorResultsQueryDto,
  ) {
    return this.resultsService.findAllForInstructor(user.userId, query);
  }

  @ApiOperation({
    summary:
      'Get aggregated summary and metrics for a specific quiz (Instructor)',
  })
  @ApiResponse({ status: 200, description: 'Quiz performance summary metrics' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @Roles(UserRole.INSTRUCTOR)
  @Get('instructor/quiz/:quizId/summary')
  getQuizSummaryForInstructor(
    @CurrentUser() user: JwtPayload,
    @Param('quizId', ParseObjectIdPipe) quizId: string,
  ) {
    return this.resultsService.getQuizSummaryForInstructor(user.userId, quizId);
  }

  @ApiOperation({
    summary:
      'Get detailed result breakdown for a specific attempt (Instructor)',
  })
  @ApiResponse({ status: 200, description: 'Detailed quiz result' })
  @ApiResponse({ status: 404, description: 'Result not found' })
  @Roles(UserRole.INSTRUCTOR)
  @Get('instructor/:id')
  findOneForInstructor(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.resultsService.findOneForInstructor(user.userId, id);
  }

  @ApiOperation({ summary: 'Get single quiz result by ID (Learner)' })
  @ApiResponse({ status: 200, description: 'Quiz result details' })
  @ApiResponse({ status: 404, description: 'Result not found' })
  @Roles(UserRole.LEARNER)
  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.resultsService.findOne(user.userId, id);
  }
}
