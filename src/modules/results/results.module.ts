import { Module } from '@nestjs/common';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizResult , QuizResultSchema } from 'src/schemas/quiz-result.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: QuizResult.name,
        schema: QuizResultSchema,
      },
    ]),
  ],
  controllers: [ResultsController],
  providers: [ResultsService],
})
export class ResultsModule {}

