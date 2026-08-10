import { Types } from 'mongoose';

export interface LearnerDashboardResponse {
  upcomingQuizzes: Array<{
    id: Types.ObjectId | string;
    title: string;
    scheduledDateTime: Date;
    enrolledCount?: number;
  }>;
  recentResults: Array<{
    id: Types.ObjectId | string;
    quizTitle: string;
    score: number;
    percentage: number;
    submittedAt: Date;
  }>;
}

export interface TopStudentSummary {
  studentId: Types.ObjectId | string;
  firstName?: string;
  lastName?: string;
  email?: string;
  averageScorePercentage: number;
  totalQuizzesTaken: number;
  lastAttemptAt?: Date;
}

export interface InstructorDashboardResponse {
  overview: {
    totalQuizzesCreated: number;
    totalCompletedAttempts: number;
    activeUpcomingQuizzes: number;
  };
  upcomingQuizzes: Array<{
    id: Types.ObjectId | string;
    title: string;
    scheduledDateTime: Date;
    code: string;
    status: string;
  }>;
  topStudents: TopStudentSummary[];
}

export interface IDashboardService {
  learnerDashboard(learnerId: string): Promise<LearnerDashboardResponse>;
  instructorDashboard(
    instructorId: string,
  ): Promise<InstructorDashboardResponse>;
}
