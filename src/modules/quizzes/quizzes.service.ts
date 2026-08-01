import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Quiz , QuizDocument } from 'src/schemas/quiz.schema';
import { Group , GroupDocument } from 'src/schemas/group.schema';
import { QuestionDocument , Question } from 'src/schemas/question.schema';
import { CreateQuizDto } from 'src/dtos/create-quiz.dto';
import { QuizStatus } from 'src/common/enums/quiz.status.enum';
import { BadRequestException , NotFoundException} from '@nestjs/common';
import { SortOrder } from 'mongoose';
import { UpdateQuizDto } from 'src/dtos/update-quiz.dto';


@Injectable()
export class QuizzesService {

    constructor(
  @InjectModel(Quiz.name)
  private readonly quizModel: Model<QuizDocument>,

  @InjectModel(Group.name)
  private readonly groupModel: Model<GroupDocument>,

  @InjectModel(Question.name)
  private readonly questionModel: Model<QuestionDocument>,
) {}


async create(
  instructorId: string,
  createQuizDto: CreateQuizDto,
) {
  const {
    title,
    description,
    duration,
    numberOfQuestions,
    scorePerQuestion,
    scheduledDateTime,
    difficultyLevel,
    categoryType,
    assignedToGroups,
    randomizeQuestions,
  } = createQuizDto;

  // Future date validation
  const scheduled = new Date(scheduledDateTime);

  if (scheduled <= new Date()) {
    throw new BadRequestException(
      'Scheduled date must be in the future',
    );
  }

  // Validate groups
  const groups = await this.groupModel.find({
    _id: { $in: assignedToGroups },
    instructorId,
  });

  if (groups.length !== assignedToGroups.length) {
    throw new BadRequestException(
      'One or more groups are invalid',
    );
  }

  // Calculate enrolled students
  const totalEnrolledStudents = groups.reduce(
    (sum, group) => sum + group.learnerCount,
    0,
  );

  // Get available questions
  let questions = await this.questionModel.find({
    instructorId,
    difficultyLevel,
    categoryType,
  });

  if (questions.length < numberOfQuestions) {
    throw new BadRequestException(
      `Only ${questions.length} questions available`,
    );
  }

  // Randomize if requested
  if (randomizeQuestions) {
    questions = questions.sort(
      () => Math.random() - 0.5,
    );
  }

  const selectedQuestions = questions
    .slice(0, numberOfQuestions)
    .map((q) => q._id);

  // Generate unique quiz code
  const code = await this.generateUniqueCode();

  const codeValidFrom = new Date();

  const codeValidUntil = new Date(
    scheduled.getTime() + duration * 60 * 1000,
  );

  const quiz = await this.quizModel.create({
    title,
    description,
    duration,
    numberOfQuestions,
    scorePerQuestion,
    scheduledDateTime: scheduled,
    difficultyLevel,
    categoryType,
    assignedToGroups,
    questions: selectedQuestions,
    instructorId,
    code,
    codeValidFrom,
    codeValidUntil,
    status: QuizStatus.SCHEDULED,
    randomizeQuestions: randomizeQuestions ?? false,
    totalEnrolledStudents,
  });

  return quiz;
}


async findAll(
  instructorId: string,
  page = 1,
  limit = 10,
  status?: QuizStatus,
) {
  const filter: Record<string, any> = {
    instructorId,
  };

  if (status) {
    filter.status = status;
  }

  const total = await this.quizModel.countDocuments(
    filter,
  );

  const quizzes = await this.quizModel
    .find(filter)
    .populate('assignedToGroups', 'groupName learnerCount')
    .sort({ scheduledDateTime: status === QuizStatus.COMPLETED? 'desc': 'asc',
} satisfies Record<string, SortOrder>)
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    data: quizzes,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async findOne(
  id: string,
  instructorId: string,
) {
  const quiz = await this.quizModel
    .findOne({
      _id: id,
      instructorId,
    })
    .populate('assignedToGroups')
    .populate('questions');

  if (!quiz) {
    throw new NotFoundException(
      'Quiz not found',
    );
  }

  return quiz;
}

async update(
  id: string,
  instructorId: string,
  updateQuizDto: UpdateQuizDto,
) {
  const quiz = await this.quizModel.findOne({
    _id: id,
    instructorId,
  });

  if (!quiz) {
    throw new NotFoundException(
      'Quiz not found',
    );
  }

  // Prevent updating expired quizzes
  const expiryTime = new Date(
    quiz.scheduledDateTime.getTime() +
      quiz.duration * 60 * 1000,
  );

  if (expiryTime < new Date()) {
    throw new BadRequestException(
      'Quiz has expired and cannot be updated',
    );
  }

  // Only allowed fields
  if (updateQuizDto.title !== undefined) {
    quiz.title = updateQuizDto.title;
  }

  if (updateQuizDto.description !== undefined) {
    quiz.description = updateQuizDto.description;
  }

  if (updateQuizDto.duration !== undefined) {
    quiz.duration = updateQuizDto.duration;

    quiz.codeValidUntil = new Date(
      quiz.scheduledDateTime.getTime() +
        quiz.duration * 60 * 1000,
    );
  }

  await quiz.save();

  return quiz;
}


async reassign(
  id: string,
  instructorId: string,
  scheduledDateTime: string,
) {
  const quiz = await this.quizModel.findOne({
    _id: id,
    instructorId,
  });

  if (!quiz) {
    throw new NotFoundException(
      'Quiz not found',
    );
  }

  const expiryTime = new Date(
    quiz.scheduledDateTime.getTime() +
      quiz.duration * 60 * 1000,
  );

  if (expiryTime > new Date()) {
    throw new BadRequestException(
      'Quiz not yet expired',
    );
  }

  const newDate = new Date(scheduledDateTime);

  if (newDate <= new Date()) {
    throw new BadRequestException(
      'Scheduled date must be in the future',
    );
  }

  quiz.scheduledDateTime = newDate;
  quiz.code = await this.generateUniqueCode();
  quiz.codeValidFrom = new Date();
  quiz.codeValidUntil = new Date(
    newDate.getTime() +
      quiz.duration * 60 * 1000,
  );
  quiz.status = QuizStatus.SCHEDULED;

  await quiz.save();

  return quiz;
}


// unique code function 
private async generateUniqueCode(): Promise<string> {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    while (true) {
      const length =
        Math.random() > 0.5 ? 6 : 7;

      let code = '';

      for (let i = 0; i < length; i++) {
        code += chars.charAt(
          Math.floor(Math.random() * chars.length),
        );
      }

      const exists = await this.quizModel.exists({
        code,
      });

      if (!exists) {
        return code;
      }
    }
  }
}
