import { Types } from 'mongoose';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { StudentQueryDto } from '../dto/student-query.dto';

export interface StudentSummary {
  id: Types.ObjectId | string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  image?: string;
  averageScore?: number;
  totalQuizzesTaken?: number;
  createdAt?: Date;
}

export interface PaginatedStudentsResponse {
  data: StudentSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface StudentCreatedResponse {
  message: string;
  student: StudentSummary;
  temporaryPassword?: string;
}

export interface IStudentsService {
  create(
    instructorId: string,
    createStudentDto: CreateStudentDto,
  ): Promise<StudentCreatedResponse>;
  findAll(
    instructorId: string,
    queryDto: StudentQueryDto,
  ): Promise<PaginatedStudentsResponse>;
  findOne(id: string, instructorId: string): Promise<StudentSummary>;
  update(
    id: string,
    instructorId: string,
    updateStudentDto: UpdateStudentDto,
  ): Promise<StudentSummary>;
  remove(id: string, instructorId: string): Promise<{ message: string }>;
}
