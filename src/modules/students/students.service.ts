import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import { User, UserDocument } from 'src/schemas/user.schema';
import { Group, GroupDocument } from 'src/schemas/group.schema';
import { QuizResult, QuizResultDocument } from 'src/schemas/quiz-result.schema';
import { UserRole } from 'src/common/enums/user-role.enum';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentQueryDto } from './dto/student-query.dto';

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Group.name)
    private readonly groupModel: Model<GroupDocument>,
    @InjectModel(QuizResult.name)
    private readonly quizResultModel: Model<QuizResultDocument>,
  ) {}

  async create(instructorId: string, createStudentDto: CreateStudentDto) {
    const { firstName, lastName, phone, email } = createStudentDto;

    const studentEmail =
      email?.toLowerCase().trim() ||
      `student_${Date.now()}_${randomBytes(3).toString('hex')}@quizwiz.com`;

    const isExist = await this.userModel.findOne({ email: studentEmail });
    if (isExist) {
      throw new BadRequestException('Email already exists');
    }

    const tempPassword = randomBytes(6).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const student = await this.userModel.create({
      firstName,
      lastName,
      email: studentEmail,
      phone,
      password: hashedPassword,
      role: UserRole.LEARNER,
      instructorId: new Types.ObjectId(instructorId),
      isActive: true,
    });

    return {
      message: 'Student added successfully',
      student: {
        id: student._id.toString(),
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone,
        role: student.role,
        createdAt: (student as any).createdAt,
      },
      temporaryPassword: tempPassword,
    };
  }

  async findAll(instructorId: string, queryDto: StudentQueryDto) {
    const { page = 1, limit = 10, search, groupId } = queryDto;

    const clampedLimit = Math.min(Math.max(limit, 1), 100);
    const clampedPage = Math.max(page, 1);

    const filter: Record<string, any> = {
      role: UserRole.LEARNER,
      instructorId: new Types.ObjectId(instructorId),
    };

    if (groupId) {
      const group = await this.groupModel.findOne({
        _id: groupId,
        instructorId,
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      filter._id = { $in: group.learners };
    }

    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { firstName: { $regex: sanitizedSearch, $options: 'i' } },
        { lastName: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    const total = await this.userModel.countDocuments(filter);

    const students = await this.userModel
      .find(filter)
      .select('firstName lastName email phone image createdAt')
      .sort({ createdAt: -1 })
      .skip((clampedPage - 1) * clampedLimit)
      .limit(clampedLimit);

    // Single MongoDB Aggregation query to compute scores for all page students (eliminating N+1)
    const learnerIds = students.map((s) => s._id);

    const statsAggregation = await this.quizResultModel.aggregate([
      { $match: { learnerId: { $in: learnerIds } } },
      {
        $group: {
          _id: '$learnerId',
          totalQuizzesTaken: { $sum: 1 },
          averageScore: { $avg: '$scorePercentage' },
        },
      },
    ]);

    const statsMap = new Map<
      string,
      { totalQuizzesTaken: number; averageScore: number }
    >(
      statsAggregation.map((s) => [
        s._id.toString(),
        {
          totalQuizzesTaken: s.totalQuizzesTaken,
          averageScore: Math.round(s.averageScore * 10) / 10,
        },
      ]),
    );

    const studentStats = students.map((student) => {
      const stats = statsMap.get(student._id.toString()) || {
        totalQuizzesTaken: 0,
        averageScore: 0,
      };

      return {
        id: student._id.toString(),
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone,
        image: student.image,
        averageScore: stats.averageScore,
        totalQuizzesTaken: stats.totalQuizzesTaken,
        createdAt: (student as any).createdAt,
      };
    });

    return {
      data: studentStats,
      pagination: {
        total,
        page: clampedPage,
        limit: clampedLimit,
        totalPages: Math.ceil(total / clampedLimit),
      },
    };
  }

  async findOne(id: string, instructorId: string) {
    const student = await this.userModel.findOne({
      _id: id,
      role: UserRole.LEARNER,
      instructorId,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const statsAggregation = await this.quizResultModel.aggregate([
      { $match: { learnerId: new Types.ObjectId(id) } },
      {
        $group: {
          _id: '$learnerId',
          totalQuizzesTaken: { $sum: 1 },
          averageScore: { $avg: '$scorePercentage' },
        },
      },
    ]);

    const stats = statsAggregation[0] || {
      totalQuizzesTaken: 0,
      averageScore: 0,
    };
    const averageScore = Math.round((stats.averageScore || 0) * 10) / 10;

    return {
      id: student._id.toString(),
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      image: student.image,
      averageScore,
      totalQuizzesTaken: stats.totalQuizzesTaken || 0,
      createdAt: (student as any).createdAt,
    };
  }

  async update(
    id: string,
    instructorId: string,
    updateStudentDto: UpdateStudentDto,
  ) {
    const student = await this.userModel.findOne({
      _id: id,
      role: UserRole.LEARNER,
      instructorId,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (updateStudentDto.firstName) {
      student.firstName = updateStudentDto.firstName;
    }

    if (updateStudentDto.lastName) {
      student.lastName = updateStudentDto.lastName;
    }

    if (updateStudentDto.phone) {
      student.phone = updateStudentDto.phone;
    }

    await student.save();

    return this.findOne(id, instructorId);
  }

  async remove(id: string, instructorId: string) {
    const student = await this.userModel.findOne({
      _id: id,
      role: UserRole.LEARNER,
      instructorId,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    await student.deleteOne();

    // Atomic cascade update: pull student ID from all groups and decrement learnerCount
    await this.groupModel.updateMany(
      { instructorId, learners: new Types.ObjectId(id) },
      {
        $pull: { learners: new Types.ObjectId(id) },
        $inc: { learnerCount: -1 },
      },
    );

    return {
      message: 'Student deleted successfully',
    };
  }
}
