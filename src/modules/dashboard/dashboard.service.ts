import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Group, GroupDocument } from 'src/schemas/group.schema';
import { Quiz, QuizDocument } from 'src/schemas/quiz.schema';
import { QuizResult, QuizResultDocument } from 'src/schemas/quiz-result.schema';
import { IDashboardService } from './interfaces/dashboard-service.interface';

@Injectable()
export class DashboardService implements IDashboardService {
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

      recentResults: recentResults.map(
        (result: QuizResultDocument & { quizId?: { title?: string } }) => ({
          id: result._id,
          quizTitle: result.quizId ? result.quizId.title : 'Deleted Quiz',
          score: result.totalScore,
          percentage: result.scorePercentage,
          submittedAt: result.submittedAt,
        }),
      ),
    };
  }

  async instructorDashboard(instructorId: string) {
    const instructorObjId = new Types.ObjectId(instructorId);

    // Fetch all quizzes created by this instructor
    const instructorQuizzes = await this.quizModel.find({
      instructorId: instructorObjId,
    });
    const quizIds = instructorQuizzes.map((q) => q._id);

    // Upcoming quizzes created by instructor
    const upcomingQuizzes = await this.quizModel
      .find({
        instructorId: instructorObjId,
        scheduledDateTime: { $gt: new Date() },
      })
      .sort({ scheduledDateTime: 1 })
      .limit(5)
      .select('title scheduledDateTime totalEnrolledStudents code status');

    // Aggregated top performing students for instructor's quizzes
    const topStudentsAgg = await this.quizResultModel.aggregate([
      { $match: { quizId: { $in: quizIds } } },
      {
        $group: {
          _id: '$learnerId',
          averageScorePercentage: { $avg: '$scorePercentage' },
          totalQuizzesTaken: { $sum: 1 },
          lastAttemptAt: { $max: '$submittedAt' },
        },
      },
      { $sort: { averageScorePercentage: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'studentInfo',
        },
      },
      { $unwind: { path: '$studentInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          studentId: '$_id',
          firstName: '$studentInfo.firstName',
          lastName: '$studentInfo.lastName',
          email: '$studentInfo.email',
          averageScorePercentage: { $round: ['$averageScorePercentage', 2] },
          totalQuizzesTaken: 1,
          lastAttemptAt: 1,
        },
      },
    ]);

    const totalResults = await this.quizResultModel.countDocuments({
      quizId: { $in: quizIds },
    });

    const activeQuizzesCount = await this.quizModel.countDocuments({
      instructorId: instructorObjId,
      scheduledDateTime: { $gt: new Date() },
    });

    return {
      overview: {
        totalQuizzesCreated: instructorQuizzes.length,
        totalCompletedAttempts: totalResults,
        activeUpcomingQuizzes: activeQuizzesCount,
      },
      upcomingQuizzes: upcomingQuizzes.map((quiz) => ({
        id: quiz._id,
        title: quiz.title,
        scheduledDateTime: quiz.scheduledDateTime,
        code: quiz.code,
        status: quiz.status,
      })),
      topStudents: topStudentsAgg,
    };
  }
}
