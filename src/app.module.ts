import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthModule } from './modules/health/health.module';
import { I18nModule, AcceptLanguageResolver } from 'nestjs-i18n';
import * as path from 'path';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { QuizModule } from './modules/quizzes/quizzes.module';
import { GroupsModule } from './modules/groups/groups.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { ResultsModule } from './modules/results/results.module';
import { QuizAttempt } from './schemas/quiz-attempt.schema';
import { QuizAttemptsModule } from './modules/quiz-attempts/quiz-attempts.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
I18nModule.forRoot({
  fallbackLanguage: 'en',

  loaderOptions: {
    path: path.join(
      process.cwd(),
      'src/common/i18n',
    ),
    watch: true,
  },

  resolvers: [
    AcceptLanguageResolver,
  ],
}),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ||
          'mongodb://localhost:27017/quiz-wiz',
      }),
      inject: [ConfigService],
    }),
    HealthModule,
    AuthModule,
    DashboardModule,
    QuizModule,
    GroupsModule,
    QuestionsModule,
    ResultsModule,
    QuizAttemptsModule,
  ],
})
export class AppModule {}
