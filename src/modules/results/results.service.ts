import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import { QuizResult, QuizResultDocument } from 'src/schemas/quiz-result.schema';

@Injectable()
export class ResultsService {
  constructor(
    @InjectModel(QuizResult.name)
    private readonly quizResultModel: Model<QuizResultDocument>,
  ) {}

  async findAll(learnerId: string, page = 1, limit = 10) {
    const total = await this.quizResultModel.countDocuments({
      learnerId,
    });

    const results = await this.quizResultModel
      .find({
        learnerId,
      })
      .populate('quizId', 'title scheduledDateTime')
      .sort({
        submittedAt: -1,
      })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      data: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(learnerId: string, resultId: string) {
    const result = await this.quizResultModel
      .findOne({
        _id: resultId,
        learnerId,
      })
      .populate('quizId');

    if (!result) {
      throw new NotFoundException('Result not found');
    }

    return result;
  }
}
