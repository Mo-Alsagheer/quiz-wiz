import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { StudentsService } from './students.service';
import { User } from '../../schemas/user.schema';
import { Group } from '../../schemas/group.schema';
import { QuizResult } from '../../schemas/quiz-result.schema';
import { UserRole } from '../../common/enums/user-role.enum';

describe('StudentsService - Performance & Unit Test (findAll)', () => {
  let service: StudentsService;
  let userModelMock: any;
  let groupModelMock: any;
  let quizResultModelMock: any;

  const mockInstructorId = new Types.ObjectId().toString();

  const mockLearners = Array.from({ length: 50 }, (_, i) => ({
    _id: new Types.ObjectId(),
    firstName: `Student_${i}`,
    lastName: `User_${i}`,
    email: `student${i}@test.com`,
    phone: `010000000${i}`,
    image: `avatar_${i}.jpg`,
    role: UserRole.LEARNER,
    instructorId: new Types.ObjectId(mockInstructorId),
    createdAt: new Date(Date.now() - i * 100000),
  }));

  const mockAggregationResult = mockLearners.slice(0, 10).map((student, idx) => ({
    _id: student._id,
    totalQuizzesTaken: 5 + (idx % 3),
    averageScore: 85.4 + idx,
  }));

  beforeEach(async () => {
    userModelMock = {
      countDocuments: jest.fn().mockResolvedValue(mockLearners.length),
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockLearners.slice(0, 10)),
            }),
          }),
        }),
      }),
    };

    groupModelMock = {
      findOne: jest.fn(),
    };

    quizResultModelMock = {
      aggregate: jest.fn().mockResolvedValue(mockAggregationResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        {
          provide: getModelToken(User.name),
          useValue: userModelMock,
        },
        {
          provide: getModelToken(Group.name),
          useValue: groupModelMock,
        },
        {
          provide: getModelToken(QuizResult.name),
          useValue: quizResultModelMock,
        },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should execute findAll and return formatted student statistics accurately', async () => {
    const startTime = performance.now();
    const result = await service.findAll(mockInstructorId, { page: 1, limit: 10 });
    const endTime = performance.now();
    const executionTimeMs = endTime - startTime;

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('pagination');
    expect(result.data.length).toBe(10);
    expect(result.pagination.total).toBe(50);
    expect(result.pagination.totalPages).toBe(5);

    // Verify first student stats
    const firstStudent = result.data[0];
    expect(firstStudent.id).toBe(mockLearners[0]._id.toString());
    expect(firstStudent.totalQuizzesTaken).toBe(5);
    expect(firstStudent.averageScore).toBe(85.4);

    console.log(`[Jest Test] findAll execution completed in ${executionTimeMs.toFixed(3)} ms`);
    expect(executionTimeMs).toBeLessThan(100); // Expect fast execution < 100ms
  });

  it('should test timing over 1,000 sequential invocations', async () => {
    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      await service.findAll(mockInstructorId, { page: 1, limit: 10 });
    }

    const end = performance.now();
    const totalTimeMs = end - start;
    const avgPerCallMs = totalTimeMs / iterations;

    console.log(`[Jest Benchmark] ${iterations} calls completed in ${totalTimeMs.toFixed(2)} ms (Avg: ${avgPerCallMs.toFixed(4)} ms/call)`);
    expect(avgPerCallMs).toBeLessThan(1.0);
  });
});
