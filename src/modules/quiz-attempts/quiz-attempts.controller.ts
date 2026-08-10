import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { QuizAttemptsService } from './quiz-attempts.service';
import { JoinQuizDto } from 'src/modules/quizzes/dto/join-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';

@ApiTags('Quiz Attempts')
@ApiBearerAuth('bearer-auth')
@Controller('quiz-attempts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LEARNER)
export class QuizAttemptsController {
  constructor(private readonly quizAttemptsService: QuizAttemptsService) {}

  // POST /quiz-attempts/join
  @ApiOperation({ summary: 'Join a quiz using 6-7 char access code' })
  @ApiResponse({
    status: 201,
    description: 'Quiz joined successfully with questions payload',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid/expired code or not enrolled in group',
  })
  @Post('join')
  joinQuiz(@CurrentUser() user: JwtPayload, @Body() joinQuizDto: JoinQuizDto) {
    return this.quizAttemptsService.joinQuiz(user.userId, joinQuizDto);
  }

  // POST /quiz-attempts/:id/submit
  @ApiOperation({ summary: 'Submit quiz answers and record result' })
  @ApiResponse({
    status: 201,
    description: 'Quiz submitted and score calculated',
  })
  @ApiResponse({
    status: 400,
    description: 'Attempt not found or already completed',
  })
  @Post(':id/submit')
  submitQuiz(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() submitQuizDto: SubmitQuizDto,
  ) {
    return this.quizAttemptsService.submitQuiz(user.userId, id, submitQuizDto);
  }
}
