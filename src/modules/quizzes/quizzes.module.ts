import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Quiz, QuizSchema } from 'src/schemas/quiz.schema';
import { Question, QuestionSchema } from 'src/schemas/question.schema';
import { Group, GroupSchema } from 'src/schemas/group.schema';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Quiz.name,
        schema: QuizSchema,
      },
      {
        name: Question.name,
        schema: QuestionSchema,
      },
      {
        name: Group.name,
        schema: GroupSchema,
      },
    ]),
  ],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService],
})
export class QuizModule {}
