import { Types } from 'mongoose';
import { UserRole } from '../../common/enums/user-role.enum';

interface LearnerDoc {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  image?: string;
  role: string;
  instructorId: Types.ObjectId;
  createdAt: Date;
}

interface QuizResultDoc {
  _id: Types.ObjectId;
  learnerId: Types.ObjectId;
  quizId: Types.ObjectId;
  scorePercentage: number;
}

interface GroupDoc {
  _id: Types.ObjectId;
  instructorId: string;
  learners: Types.ObjectId[];
}

export function generateMockData(learnerCount: number, resultsPerLearner: number) {
  const instructorId = new Types.ObjectId().toString();
  const instructorObjectId = new Types.ObjectId(instructorId);

  const learners: LearnerDoc[] = [];
  for (let i = 0; i < learnerCount; i++) {
    learners.push({
      _id: new Types.ObjectId(),
      firstName: `Learner${i}`,
      lastName: `Test${i}`,
      email: `learner${i}@example.com`,
      phone: `123-456-${1000 + i}`,
      role: UserRole.LEARNER,
      instructorId: instructorObjectId,
      createdAt: new Date(Date.now() - i * 3600 * 1000),
    });
  }

  const quizResults: QuizResultDoc[] = [];
  for (const learner of learners) {
    for (let r = 0; r < resultsPerLearner; r++) {
      quizResults.push({
        _id: new Types.ObjectId(),
        learnerId: learner._id,
        quizId: new Types.ObjectId(),
        scorePercentage: Math.floor(Math.random() * 41) + 60, // 60-100%
      });
    }
  }

  const group: GroupDoc = {
    _id: new Types.ObjectId(),
    instructorId,
    learners: learners.slice(0, Math.min(200, learnerCount)).map((l) => l._id),
  };

  return { instructorId, learners, quizResults, group };
}

export async function runMockFindAllProcess(
  learners: LearnerDoc[],
  quizResults: QuizResultDoc[],
  group: GroupDoc | null,
  queryDto: { page?: number; limit?: number; search?: string; groupId?: string }
) {
  const { page = 1, limit = 10, search, groupId } = queryDto;
  const clampedLimit = Math.min(Math.max(limit, 1), 100);
  const clampedPage = Math.max(page, 1);

  const t0 = performance.now();

  // 1. Group Filtering (if specified)
  let allowedIdsSet: Set<string> | null = null;
  if (groupId && group) {
    allowedIdsSet = new Set(group.learners.map((id) => id.toString()));
  }

  // 2. Filter matching (role, instructorId, groupId, search regex)
  let filtered = learners.filter((l) => {
    if (allowedIdsSet && !allowedIdsSet.has(l._id.toString())) return false;
    if (search) {
      const sanitized = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(sanitized, 'i');
      if (!re.test(l.firstName) && !re.test(l.lastName) && !re.test(l.email)) {
        return false;
      }
    }
    return true;
  });

  const t1 = performance.now();

  // 3. Count documents & Pagination
  const total = filtered.length;
  filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const pageStudents = filtered.slice(
    (clampedPage - 1) * clampedLimit,
    clampedPage * clampedLimit
  );

  const t2 = performance.now();

  // 4. Batch Aggregation for page students
  const learnerIds = pageStudents.map((s) => s._id);
  const learnerIdSet = new Set(learnerIds.map((id) => id.toString()));

  // Simulate MongoDB aggregation: $match learnerId in learnerIds -> $group
  const statsMap = new Map<string, { totalQuizzesTaken: number; sumScore: number }>();
  for (const qr of quizResults) {
    const lIdStr = qr.learnerId.toString();
    if (learnerIdSet.has(lIdStr)) {
      const current = statsMap.get(lIdStr) || { totalQuizzesTaken: 0, sumScore: 0 };
      current.totalQuizzesTaken += 1;
      current.sumScore += qr.scorePercentage;
      statsMap.set(lIdStr, current);
    }
  }

  const aggregatedStatsMap = new Map<string, { totalQuizzesTaken: number; averageScore: number }>();
  for (const [lIdStr, val] of statsMap.entries()) {
    aggregatedStatsMap.set(lIdStr, {
      totalQuizzesTaken: val.totalQuizzesTaken,
      averageScore: Math.round((val.sumScore / val.totalQuizzesTaken) * 10) / 10,
    });
  }

  const t3 = performance.now();

  // 5. Final Mapping
  const studentStats = pageStudents.map((student) => {
    const stats = aggregatedStatsMap.get(student._id.toString()) || {
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
      createdAt: student.createdAt,
    };
  });

  const t4 = performance.now();

  return {
    result: {
      data: studentStats,
      pagination: {
        total,
        page: clampedPage,
        limit: clampedLimit,
        totalPages: Math.ceil(total / clampedLimit),
      },
    },
    timings: {
      filterMs: t1 - t0,
      paginationMs: t2 - t1,
      aggregationMs: t3 - t2,
      mapMs: t4 - t3,
      totalMs: t4 - t0,
    },
  };
}

// Simulate baseline N+1 approach for comparison
export async function runUnoptimizedNPlusOneProcess(
  learners: LearnerDoc[],
  quizResults: QuizResultDoc[],
  queryDto: { page?: number; limit?: number }
) {
  const { page = 1, limit = 10 } = queryDto;
  const clampedLimit = Math.min(Math.max(limit, 1), 100);
  const clampedPage = Math.max(page, 1);

  const t0 = performance.now();
  const pageStudents = learners.slice(
    (clampedPage - 1) * clampedLimit,
    clampedPage * clampedLimit
  );

  // N+1: query quizResults separately for each student
  const studentStats = [];
  for (const student of pageStudents) {
    const studentResults = quizResults.filter(
      (qr) => qr.learnerId.toString() === student._id.toString()
    );
    const count = studentResults.length;
    const avg = count > 0 ? studentResults.reduce((a, b) => a + b.scorePercentage, 0) / count : 0;

    studentStats.push({
      id: student._id.toString(),
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      image: student.image,
      averageScore: Math.round(avg * 10) / 10,
      totalQuizzesTaken: count,
      createdAt: student.createdAt,
    });
  }

  const t1 = performance.now();
  return {
    totalMs: t1 - t0,
  };
}

async function runBenchmarks() {
  console.log('==============================================================================');
  console.log('   QUIZ-WIZ: StudentsService.findAll Performance Benchmark (Mock Dataset)');
  console.log('==============================================================================\n');

  const datasetConfigs = [
    { name: 'Small Scale', learners: 100, resultsPerLearner: 10 },    // 100 learners, 1,000 results
    { name: 'Medium Scale', learners: 1000, resultsPerLearner: 50 },  // 1,000 learners, 50,000 results
    { name: 'Large Scale', learners: 10000, resultsPerLearner: 10 }, // 10,000 learners, 100,000 results
  ];

  for (const config of datasetConfigs) {
    console.log(`>>> Dataset: ${config.name} (${config.learners.toLocaleString()} learners, ${(config.learners * config.resultsPerLearner).toLocaleString()} quiz results)`);
    const { learners, quizResults, group } = generateMockData(config.learners, config.resultsPerLearner);

    // Warm up
    await runMockFindAllProcess(learners, quizResults, null, { page: 1, limit: 10 });

    const iterations = 50;

    // Test 1: Limit = 10
    let totalMs10 = 0;
    let aggMs10 = 0;
    for (let i = 0; i < iterations; i++) {
      const res = await runMockFindAllProcess(learners, quizResults, null, { page: 1, limit: 10 });
      totalMs10 += res.timings.totalMs;
      aggMs10 += res.timings.aggregationMs;
    }

    // Test 2: Limit = 100
    let totalMs100 = 0;
    let aggMs100 = 0;
    for (let i = 0; i < iterations; i++) {
      const res = await runMockFindAllProcess(learners, quizResults, null, { page: 1, limit: 100 });
      totalMs100 += res.timings.totalMs;
      aggMs100 += res.timings.aggregationMs;
    }

    // Test 3: Search filter
    let totalMsSearch = 0;
    for (let i = 0; i < iterations; i++) {
      const res = await runMockFindAllProcess(learners, quizResults, null, { page: 1, limit: 10, search: 'Learner1' });
      totalMsSearch += res.timings.totalMs;
    }

    // Test 4: Group filter
    let totalMsGroup = 0;
    for (let i = 0; i < iterations; i++) {
      const res = await runMockFindAllProcess(learners, quizResults, group, { page: 1, limit: 10, groupId: group._id.toString() });
      totalMsGroup += res.timings.totalMs;
    }

    // Benchmark comparison: Single Aggregation vs N+1
    let nPlusOneMs = 0;
    for (let i = 0; i < iterations; i++) {
      const res = await runUnoptimizedNPlusOneProcess(learners, quizResults, { page: 1, limit: 10 });
      nPlusOneMs += res.totalMs;
    }

    const avg10 = (totalMs10 / iterations).toFixed(3);
    const avgAgg10 = (aggMs10 / iterations).toFixed(3);
    const avg100 = (totalMs100 / iterations).toFixed(3);
    const avgSearch = (totalMsSearch / iterations).toFixed(3);
    const avgGroup = (totalMsGroup / iterations).toFixed(3);
    const avgNPlusOne = (nPlusOneMs / iterations).toFixed(3);
    const speedupRatio = (nPlusOneMs / totalMs10).toFixed(1);

    console.log(`    - Limit=10  (Default): ${avg10} ms/op (Aggregation step: ${avgAgg10} ms)`);
    console.log(`    - Limit=100 (Max Page): ${avg100} ms/op`);
    console.log(`    - Search Query Filter: ${avgSearch} ms/op`);
    console.log(`    - Group Filter Query:  ${avgGroup} ms/op`);
    console.log(`    - Baseline N+1 Query:  ${avgNPlusOne} ms/op`);
    console.log(`    => Batch Aggregation Speedup: ${speedupRatio}x faster than N+1\n`);
  }
}

if (require.main === module) {
  runBenchmarks().catch(console.error);
}
