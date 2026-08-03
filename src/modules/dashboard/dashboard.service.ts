import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Group, GroupDocument } from 'src/schemas/group.schema';

import { Quiz, QuizDocument } from 'src/schemas/quiz.schema';

import { QuizResult, QuizResultDocument } from 'src/schemas/quiz-result.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Group.name)
    private readonly groupModel: Model<GroupDocument>,

    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,

    @InjectModel(QuizResult.name)
    private readonly quizResultModel: Model<QuizResultDocument>,
  ) {}

  async learnerDashboard(learnerId: string) {
    // Get learner groups
    const groups = await this.groupModel.find({
      learners: learnerId,
    });

    const groupIds = groups.map((group) => group._id);

    // Upcoming quizzes
    const upcomingQuizzes = await this.quizModel
      .find({
        assignedToGroups: {
          $in: groupIds,
        },
        scheduledDateTime: {
          $gt: new Date(),
        },
      })
      .sort({
        scheduledDateTime: 1,
      })
      .limit(5)
      .select('title scheduledDateTime totalEnrolledStudents');

    // Recent quiz results
    const recentResults = await this.quizResultModel
      .find({
        learnerId,
      })
      .populate('quizId', 'title')
      .sort({
        submittedAt: -1,
      })
      .limit(5);

    return {
      upcomingQuizzes: upcomingQuizzes.map((quiz) => ({
        id: quiz._id,
        title: quiz.title,
        scheduledDateTime: quiz.scheduledDateTime,
        enrolledCount: quiz.totalEnrolledStudents,
      })),

      recentResults: recentResults.map((result: any) => ({
        id: result._id,
        quizTitle: result.quizId.title,
        score: result.totalScore,
        percentage: result.scorePercentage,
        submittedAt: result.submittedAt,
      })),
    };
  }
}
