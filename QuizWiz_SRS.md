# Software Requirements Specification (SRS)

Quiz Management & Assessment Platform

# 1. Introduction

## 1.1 Purpose

This document defines the functional and non-functional requirements for a Quiz Management & Assessment Platform (QuizWiz). It serves as the reference specification for backend development teams regardless of their chosen technology stack.

## 1.2 Scope

The system is a RESTful backend API for an online assessment and quiz management platform divided into two main roles: Instructor and Learner. It handles question bank management with difficulty levels, quiz creation and scheduling with time-limited access codes, learner participation tracking, real-time scoring with immediate feedback, and comprehensive performance analytics across groups and individual learners.

## 1.3 Technology Stack

- **Backend Framework:** NestJS (TypeScript)
- **Database:** MongoDB with Mongoose ODM
- **API Documentation:** Swagger/OpenAPI
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcryptjs (10 salt rounds)
# 2. Overall Description

## 2.1 System Overview

The application exposes a RESTful API consumed by a frontend client. It supports two primary user roles (Instructor and Learner) with distinct permissions, and one anonymous access level. Instructors can create and manage question banks with difficulty levels (ENTRY, MID, ADVANCED), organize learners into groups, schedule quizzes with precise date/time control, generate unique time-limited quiz codes, and analyze detailed performance metrics. Learners can join quizzes using secure access codes, participate in timed assessments, receive immediate scoring feedback, and track their performance history. The platform implements role-based access control (RBAC) via JWT tokens with secure password hashing and comprehensive audit logging.

## 2.2 User Roles

Instructor: Full CRUD access to question banks, group management, quiz creation and scheduling, quiz code generation, access to results and analytics dashboards. Limited to own data (created questions, owned groups, created quizzes).

Learner: Browse available quizzes, join quizzes using codes, participate in timed assessments, view personal results and performance history, access their dashboard with last 5 scores and upcoming 5 quizzes.

Public/Unauthenticated: Self-registration, login authentication, password reset via OTP, access to public endpoints only.

## 2.3 Assumptions & Constraints

All protected routes require a valid JWT in the Authorization: Bearer <token> header.

Passwords must be hashed before storage (bcryptjs with minimum 10 salt rounds recommended).

The system supports bilingual content: Arabic and English with RTL/LTR layout support.

Quiz code expiration is strictly enforced: code expires at scheduled date/time + duration (minutes). Code validity is both temporal and exact string match required.

One learner can take each quiz only once; duplicate submissions are automatically prevented via unique constraint on (quizId, learnerId) in quiz_results.

Quiz results are immutable after submission and cannot be recalculated or modified.

Questions used in completed quizzes cannot be deleted to preserve historical accuracy.

Discount stored as percentage on room/quiz record; soft-delete recommended for historical tracking.

Images uploaded as multipart form data (future enhancement for avatars).

# 3. Functional Requirements

## 3.1 Authentication Module (Instructor & Learner)

Both roles share the same authentication flow but are distinguished by a role field (INSTRUCTOR / LEARNER) stored in the User document. No Admin registration via public endpoint; Instructor accounts created internally or via seeded scripts.

### 3.1.1 Register

**Endpoint:** `POST /api/auth/register`

- **Access:** Public (User/Instructor registration; Admin seeded separately)
- **Body:** firstName (string), lastName (string), email (string), role (enum: INSTRUCTOR or LEARNER), password (string), confirmPassword (string), phone (optional), profileImage (optional file)
- **Validation:** firstName/lastName min 2 max 50 chars alphabetic+spaces; email valid format and unique across system; role must be one of [INSTRUCTOR, LEARNER]; password min 8 chars with uppercase, lowercase, number, special character; confirmPassword must match password exactly.
- **Behaviour:** Validate all fields with detailed error messages. Check email uniqueness against users collection. Hash password using bcryptjs (10 rounds) before storage. Create User document with role, timestamps, isActive=true. Generate and return JWT token with userId, email, role, iat, exp(24h). Optional auto-login or redirect to login page with success message 'Account created successfully'.
### 3.1.2 Login

**Endpoint:** `POST /api/auth/login`

- **Access:** Public
- **Body:** email (string), password (string)
- **Validation:** Email must be valid format; password not empty.
- **Behaviour:** Query User collection for matching email. If not found, return error 'Invalid email or password' (generic for security). If found, use bcrypt.compare() to verify password hash. If password mismatch, return same generic error. If password matches, generate JWT token containing: sub (userId), email, role, iat (issued at), exp (current time + 24 hours). Return AuthResponseDto with accessToken, user data (id, firstName, lastName, email, role), expiresIn timestamp. Redirect UI based on role: INSTRUCTOR → /instructor/dashboard; LEARNER → /learner/dashboard.
### 3.1.3 Forgot Password

**Endpoint:** `POST /api/auth/forgot-password`

- **Access:** Public
- **Body:** email (string)
- **Validation:** Email valid format.
- **Behaviour:** Query User collection for email. If not found, display message 'If email exists, reset link will be sent' (security practice - don't reveal email existence). If email found, generate OTP (6-digit random code) or reset token. Store in User.passwordResetToken and User.passwordResetExpires (current time + 15 minutes). Send email notification with reset link/OTP (can simulate by displaying OTP on screen for testing). Return success message. Implement rate limiting: max 3 password reset requests per email per hour.
### 3.1.4 Reset Password

**Endpoint:** `POST /api/auth/reset-password`

- **Access:** Public
- **Body:** email (string), otp (string 6 digits), newPassword (string), confirmPassword (string)
- **Validation:** Email valid format; OTP exactly 6 digits; newPassword min 8 chars with uppercase, lowercase, number, special char; confirmPassword must match newPassword.
- **Behaviour:** Query User by email and validate passwordResetToken exists and passwordResetExpires > current time (not expired). If token invalid or expired, return error 'Reset link has expired. Request new one.' If valid, hash newPassword using bcryptjs (10 rounds). Update User document: set password=hashed, clear passwordResetToken and passwordResetExpires, update passwordChangedAt=current time. Return success message 'Password reset successful' and redirect to login page.
### 3.1.5 Change Password

**Endpoint:** `PUT /api/auth/change-password`

- **Access:** Logged-in User / Instructor (require JWT)
- **Body:** oldPassword (string), newPassword (string), confirmNewPassword (string)
- **Validation:** All fields required; newPassword min 8 chars with complexity requirements; confirmNewPassword must match newPassword; newPassword must differ from oldPassword.
- **Behaviour:** Extract userId from decoded JWT. Fetch User document by id with select: '+password' to include hashed password. Use bcrypt.compare(oldPassword, stored_hash) to verify. If mismatch, return error 'Old password is incorrect'. Hash newPassword with bcryptjs (10 rounds). Update User.password, set passwordChangedAt=current time. Optionally invalidate all existing sessions (requires session tracking). Return success message 'Password changed successfully'. Recommend re-login for security.
## 3.2 Instructor — Dashboard

### 3.2.1 Get Instructor Dashboard

**Endpoint:** `GET /api/dashboard/instructor`

- **Access:** Instructor only (role=INSTRUCTOR verified via Guard)
- **Behaviour:** Query and aggregate data: Top 5 Students - group all quiz_results by learnerId, calculate average score per learner, sort descending, join with User collection to get names, limit 5 results. Upcoming 5 Quizzes - query quizzes by instructorId, filter where scheduledDateTime > current time, sort by scheduledDateTime ascending, limit 5, include enrolledStudentCount calculated from assigned groups' learner arrays. Return InstructorDashboardDto with upcomingQuizzes array (id, title, scheduledDateTime, enrolledCount, code) and topStudents array (id, firstName, lastName, classRank, averageScore, avatar).
## 3.3 Instructor — Group Management (CRUD)

### 3.3.1 Create Group

**Endpoint:** `POST /api/groups`

- **Access:** Instructor only
- **Body:** groupName (string), learners (array of learner User IDs)
- **Validation:** groupName required, min 2 chars, max 100 chars; learners array required, minimum 1 element, maximum 500 elements; each ID must reference valid User with role=LEARNER.
- **Behaviour:** Extract instructorId from JWT. Validate learner IDs exist in users collection with role=LEARNER. Calculate learnerCount=learners.length. Create Group document: {groupName, instructorId, learners, learnerCount, createdAt, updatedAt}. Return GroupResponseDto with id, groupName, learnerCount, learners populated with full User objects (firstName, lastName, email), timestamps. Display success message 'Group created successfully'. Update groups list.
### 3.3.2 Get All Groups

**Endpoint:** `GET /api/groups`

- **Access:** Instructor only
- **Query Params:** page (default 1, min 1), limit (default 10, min 1, max 100), search (optional string filter by groupName, case-insensitive)
- **Behaviour:** Extract instructorId from JWT. Query groups collection with filter {instructorId: current_user_id}. Apply search filter if provided using regex. Calculate skip=(page-1)*limit. Apply pagination with limit and skip. Return PaginatedResponseDto: {data: [GroupResponseDto], pagination: {total: count, page, limit, totalPages: ceil(total/limit)}}. Sort by createdAt descending by default.
### 3.3.3 Get Single Group

**Endpoint:** `GET /api/groups/:id`

- **Access:** Instructor only
- **Behaviour:** Extract instructorId from JWT. Query group by id. Verify group.instructorId matches current_user_id else return 403 Forbidden. Populate learners array with full User objects. Return GroupResponseDto or 404 if not found.
### 3.3.4 Update Group

**Endpoint:** `PUT /api/groups/:id`

- **Access:** Instructor only
- **Body:** groupName (optional string), learners (optional array of User IDs)
- **Validation:** If groupName provided, check min 2 max 100 chars. If learners provided, verify all IDs reference User documents with role=LEARNER, minimum 1 learner required.
- **Behaviour:** Extract instructorId from JWT. Find group by id and verify ownership (instructorId match). Update only provided fields. Recalculate learnerCount if learners array updated. Update updatedAt timestamp. Return updated GroupResponseDto or error if validation fails or not found.
### 3.3.5 Delete Group

**Endpoint:** `DELETE /api/groups/:id`

- **Access:** Instructor only
- **Behaviour:** Extract instructorId from JWT. Find group by id and verify ownership. Check if any quizzes assigned to this group (query quizzes collection with assignedToGroups contains group_id). If quizzes exist with active bookings/submissions, consider warning but proceed with soft-delete or archive. Delete Group document from database. Return success message 'Group deleted successfully' or 404 if not found.
## 3.4 Instructor — Question Bank Management (CRUD)

### 3.4.1 Create Question

**Endpoint:** `POST /api/questions`

- **Access:** Instructor only
- **Body:** title (string), description (optional string), answers (array of objects with option (A-D) and text), correctAnswer (A/B/C/D), categoryType (string enum), difficultyLevel (ENTRY/MID/ADVANCED)
- **Validation:** title required, min 10 chars, max 500 chars; description optional, max 1000 chars; answers must be array of exactly 4 objects with options A, B, C, D each having text min 2 max 200 chars; correctAnswer required, must be one of [A, B, C, D]; categoryType required, must be from defined enum [FE, BE, DATABASE, GENERAL]; difficultyLevel required, must be one of [ENTRY, MID, ADVANCED].
- **Behaviour:** Extract instructorId from JWT. Validate all fields. Create Question document: {title, description, answers, correctAnswer, categoryType, difficultyLevel, instructorId, createdAt, updatedAt}. Return QuestionResponseDto with all fields and id. Display success message 'Question added successfully'. Add to questions list.
### 3.4.2 Get All Questions

**Endpoint:** `GET /api/questions`

- **Access:** Instructor only
- **Query Params:** page (default 1), limit (default 10, max 100), difficultyLevel (optional filter ENTRY/MID/ADVANCED), categoryType (optional filter string), search (optional filter by title, case-insensitive)
- **Behaviour:** Extract instructorId from JWT. Query questions collection with filter {instructorId: current_user_id}. Apply optional filters if provided. Calculate pagination with skip and limit. Return PaginatedResponseDto with array of QuestionResponseDto, total count, page info. Sort by createdAt descending.
### 3.4.3 Get Single Question

**Endpoint:** `GET /api/questions/:id`

- **Access:** Instructor only
- **Behaviour:** Extract instructorId from JWT. Find question by id. Verify question.instructorId matches current_user_id. Return QuestionResponseDto with all details including answers and correctAnswer, or 404 if not found.
### 3.4.4 Update Question

**Endpoint:** `PUT /api/questions/:id`

- **Access:** Instructor only
- **Body:** title (optional), description (optional), answers (optional), correctAnswer (optional), categoryType (optional), difficultyLevel (optional)
- **Validation:** Same field rules as create, but all fields optional. Validate exactly 4 options if answers provided.
- **Behaviour:** Find question by id, verify ownership. Update only provided fields. Update updatedAt timestamp. Return updated QuestionResponseDto or error if validation fails or not found. Note: Updating question used in completed quizzes does NOT recalculate historical results; immutability of past assessments.
### 3.4.5 Delete Question

**Endpoint:** `DELETE /api/questions/:id`

- **Access:** Instructor only
- **Behaviour:** Find question by id, verify ownership. Check if question is used in any quiz_results (completed quizzes). If yes, return error 'Cannot delete question used in completed quizzes' (historical integrity). If only in scheduled/active quizzes (not yet taken), allow deletion. Delete Question document. Return success message 'Question deleted successfully' or error if validation fails.
## 3.5 Instructor — Quiz Management (CRUD)

### 3.5.1 Create Quiz

**Endpoint:** `POST /api/quizzes`

- **Access:** Instructor only
- **Body:** title (string), description (optional string), duration (number 5-180 minutes), numberOfQuestions (number 1-100), scorePerQuestion (number 1-100), scheduledDateTime (ISO 8601 date-time string), difficultyLevel (enum ENTRY/MID/ADVANCED), categoryType (string), assignedToGroups (array of group IDs), randomizeQuestions (optional boolean)
- **Validation:** title required, min 5 max 200 chars; duration required, must be one of [5, 10, 15, 20, 30, 45, 60, 90, 120, 180]; numberOfQuestions required, 1-100; scorePerQuestion required, 1-100; scheduledDateTime required, must be future date/time; difficultyLevel required, enum check; categoryType required; assignedToGroups required, array min 1 element, all elements must reference valid Group documents; randomizeQuestions optional boolean default false.
- **Behaviour:** Extract instructorId from JWT. Validate all fields with descriptive error messages. Verify scheduledDateTime is in future. Query questions collection with filters {instructorId, difficultyLevel, categoryType}. Check sufficient questions available for numberOfQuestions count; if not, return error with available count. If randomizeQuestions=true, randomly shuffle selected questions, otherwise use default order. Generate unique 6-7 character alphanumeric quiz code (verify uniqueness in quizzes collection). Calculate codeValidFrom=current time, codeValidUntil=scheduledDateTime + duration (in minutes). Create Quiz document: {title, description, duration, numberOfQuestions, scorePerQuestion, scheduledDateTime, difficultyLevel, categoryType, assignedToGroups, questions (selected question IDs), instructorId, code, codeValidFrom, codeValidUntil, status: SCHEDULED, randomizeQuestions, totalEnrolledStudents (calculated from group learner counts), createdAt, updatedAt}. Return QuizResponseDto with code prominently displayed. Display success dialog: 'Quiz was successfully created' with CODE and Copy button.
### 3.5.2 Get All Quizzes

**Endpoint:** `GET /api/quizzes`

- **Access:** Instructor and Learner (role-specific filtering)
- **Query Params:** status (optional SCHEDULED/ACTIVE/COMPLETED), page (default 1), limit (default 10)
- **Behaviour:** Extract userId and role from JWT. If role=INSTRUCTOR: query quizzes where instructorId=current_user_id. If role=LEARNER: query quiz_assignments (groups where learner is member) → get all quizzes assigned to those groups. Apply status filter if provided. Calculate pagination. Return PaginatedResponseDto with array of QuizResponseDto. Sort by scheduledDateTime ascending for SCHEDULED, descending for COMPLETED.
### 3.5.3 Get Single Quiz

**Endpoint:** `GET /api/quizzes/:id`

- **Access:** Instructor (own quizzes) and Learner (assigned quizzes)
- **Behaviour:** Extract userId and role from JWT. Find quiz by id. If role=INSTRUCTOR: verify quiz.instructorId matches current_user_id. If role=LEARNER: verify learner is in one of the assignedToGroups. Return QuizResponseDto with full metadata, questions array (without correctAnswer for learners), quiz attempt data, results summary table (for instructor), or 404/403 if not found/unauthorized.
### 3.5.4 Update Quiz

**Endpoint:** `PUT /api/quizzes/:id`

- **Access:** Instructor only
- **Body:** title (optional), duration (optional), description (optional)
- **Behaviour:** Find quiz by id, verify ownership (instructorId match). IMPORTANT: numberOfQuestions, scorePerQuestion, scheduledDateTime, difficultyLevel, categoryType, assignedToGroups, questions array are read-only after creation and CANNOT be modified. Only allow updates to title, duration, description. Apply max 1000 chars validation if updating description. Update only provided fields. Update updatedAt. Return updated QuizResponseDto or error if trying to modify read-only fields or if quiz expired (scheduledDateTime + duration < now, then code is locked).
### 3.5.5 Reassign Quiz

**Endpoint:** `POST /api/quizzes/:id/reassign`

- **Access:** Instructor only
- **Body:** scheduledDateTime (ISO 8601 future date-time)
- **Validation:** scheduledDateTime required, must be future date/time, must be a valid date.
- **Behaviour:** Find quiz by id, verify ownership. Check if quiz is expired (scheduledDateTime + duration < current time). If not expired, return error 'Quiz not yet expired'. If expired, proceed: generate new unique quiz code (verify uniqueness). Update quiz: scheduledDateTime=new_date, codeValidUntil=new_date + duration, code=new_code. Update updatedAt. Return QuizResponseDto with new code displayed. Learners must use new code to rejoin. Previous results remain unchanged (immutable).
## 3.6 Learner — Dashboard

### 3.6.1 Get Learner Dashboard

**Endpoint:** `GET /api/dashboard/learner`

- **Access:** Learner only
- **Behaviour:** Extract learnerId from JWT. Query quiz_results collection for learnerId, sort by submittedAt descending, limit 5 (last 5 quiz scores). Populate with quiz details (title, scheduled date). Query groups collection where learner is in learners array. Get all quizzes assigned to those groups, filter where scheduledDateTime > current time, sort by scheduledDateTime ascending, limit 5 (upcoming 5 quizzes). Return LearnerDashboardDto with upcomingQuizzes array (id, title, scheduledDateTime, enrolledCount) and recentResults array (id, quizTitle, score, percentage, submittedAt). Display on dashboard with sections: 'Upcoming quizzes' and 'Completed Quizzes'.
## 3.7 Learner — Quiz Participation

### 3.7.1 Join Quiz (Enter Code)

**Endpoint:** `POST /api/quizzes/join`

- **Access:** Learner only
- **Body:** code (string 6-7 characters)
- **Validation:** code required, not empty, length 6-7 chars, uppercase/alphanumeric.
- **Behaviour:** Extract learnerId from JWT. Query quizzes collection for exact code match (case-sensitive). If not found or code invalid, return error 'Invalid or expired quiz code'. Validate code validity: current_time >= codeValidFrom AND current_time <= codeValidUntil. If outside window, return error 'Quiz code expired'. Validate current_time < (scheduledDateTime + duration minutes). Check if learner already has submitted quiz result for this quiz (query quiz_results: {quizId, learnerId} must not exist). If already submitted, return message 'You have already completed this quiz'. If not submitted, proceed: Create QuizAttempt document {quizId, learnerId, attemptStartTime: current_time, attemptEndTime: current_time + (duration × 60 seconds), status: IN_PROGRESS, answers: []}. Fetch quiz questions and populate without correctAnswer field (hide answers from learner). Return JoinQuizResponseDto with quiz metadata (id, title, duration, numberOfQuestions, scorePerQuestion, description), questions array (id, number, title, description, answers with A-D options no correct answer), attemptEndTime for timer calculation. Redirect to quiz taking page.
### 3.7.2 Take Quiz (Display Questions)

**Endpoint:** `GET /api/quizzes/:id (implicit after join)`

- **Access:** Learner with active QuizAttempt in progress
- **Behaviour:** Display quiz page with: Quiz title and metadata at top, Timer countdown (updating in real-time) showing remaining minutes:seconds, All questions displayed on SINGLE PAGE (not paginated) numbered 1-N, Each question: title, optional description, 4 radio buttons for options A-D with option text, Submit button at bottom (initially disabled until at least 1 answer selected). UI allows: click radio button to select option, change option by clicking different button, scroll between questions, timer auto-counts down. If timer reaches 0, auto-submit quiz with current answers and display 'Time's up! Your quiz has been submitted.' If user navigates away and returns before expiry, restore their answers from QuizAttempt.answers array.
### 3.7.3 Submit Quiz

**Endpoint:** `POST /api/quizzes/:id/submit`

- **Access:** Learner only
- **Body:** answers (array of objects {questionId: ObjectId, selectedOption: A|B|C|D|null})
- **Validation:** answers must be array; each object must reference valid question ID; selectedOption must be A/B/C/D or null (unanswered); answer array must match numberOfQuestions in quiz (can have null for unanswered).
- **Behaviour:** Extract learnerId from JWT (using @CurrentUser() decorator). Find QuizAttempt by ID, verify status=IN_PROGRESS and current_time <= attemptEndTime. If time expired, return error 'Time limit exceeded'. Fetch Quiz document, then fetch all Question documents by IDs in Quiz.questions. For each answer in answers array: find corresponding Question document, compare selectedOption with Question.correctAnswer, create result object {questionId, selectedOption, correctOption, isCorrect: boolean}. Count correct answers. Calculate totalScore = correctAnswers × scorePerQuestion. Calculate scorePercentage = (totalScore / (numberOfQuestions × scorePerQuestion)) × 100. Calculate timeTaken = attemptEndTime - attemptStartTime (in seconds). Create QuizResult document: {quizId, learnerId, groupId (from learner's group membership), attemptId, submittedAt: current_time, totalScore, scorePercentage, timeTaken, answers (array of results), createdAt}. Update QuizAttempt: status=SUBMITTED, answers populated. Return SubmitQuizResponseDto: {resultId, totalScore, scorePercentage, correctAnswers, totalQuestions, timeTaken, answers (detailed breakdown with question titles, selected/correct options, correct flag)}. Display results popup: Checkmark icon, Quiz title, Score prominently (e.g., '16 / 20' or '80%'), Close button. After close, redirect to Results detail page showing all questions with learner vs correct answers visualization.
## 3.8 Results & Analytics

### 3.8.1 List Results (Instructor)

**Endpoint:** `GET /api/results`

- **Access:** Instructor only
- **Query Params:** quizId (optional), groupId (optional), page (default 1), limit (default 10)
- **Behaviour:** Extract instructorId from JWT. Query quiz_results collection for quizzes where quiz.instructorId matches current_user_id (via join/lookup). Apply optional filters: if quizId provided, filter by quizId; if groupId provided, filter by groupId. Calculate pagination. Return PaginatedResponseDto with table: Quiz Title, Group Name, No. of Persons in Group, Participants (count of results), Date (submitted date), Action (View button). Populate quiz and group details. Sort by submitted date descending.
### 3.8.2 List Results (Learner)

**Endpoint:** `GET /api/results`

- **Access:** Learner only
- **Query Params:** page (default 1), limit (default 10)
- **Behaviour:** Extract learnerId from JWT. Query quiz_results where learnerId=current_user_id only. Calculate pagination. Return PaginatedResponseDto with table: Quiz Title, Score (totalScore / maxScore), Percentage (scorePercentage), Date Submitted, Action (View button). Populate quiz titles from quiz_id. Sort by submitted date descending.
### 3.8.3 Get Quiz Results Summary (Instructor)

**Endpoint:** `GET /api/results/quiz/:quizId`

- **Access:** Instructor only
- **Behaviour:** Extract instructorId from JWT. Fetch Quiz by ID, verify instructor ownership. Query quiz_results for quizId. Aggregate statistics: totalParticipants = count of results, averageScore = mean of totalScore, highestScore = max(totalScore), lowestScore = min(totalScore). Build table of StudentResultItemDto objects sorted by score descending: student name, score, percentage, timeTaken, submittedAt. Return QuizResultsSummaryDto: {quizId, quizTitle, scheduledDateTime, totalEnrolled (from quiz.totalEnrolledStudents), totalParticipated, averageScore, highestScore, lowestScore, results: []}.
### 3.8.4 Get Detailed Result (View Answers)

**Endpoint:** `GET /api/results/:id`

- **Access:** Instructor (any result) and Learner (own results only)
- **Behaviour:** Find QuizResult by id. Extract userId and role from JWT. If role=LEARNER: verify result.learnerId matches current_user_id. If role=INSTRUCTOR: fetch related quiz, verify instructor ownership. Populate question details and learner info. For each answer in result.answers, display: question number, question title, learner's selected option (highlighted), correct option (highlighted green if correct, red if incorrect), visual indicator (✓ or ✗). Return DetailedResultResponseDto with all metadata and answers breakdown. Provide option to download or print results (future enhancement).
## 3.9 Instructor — Student Management

### 3.9.1 Add Student

**Endpoint:** `POST /api/students`

- **Access:** Instructor only
- **Body:** firstName (string), lastName (string), phone (string), email (optional)
- **Validation:** firstName required, min 2 max 50 chars; lastName required, min 2 max 50 chars; phone required, valid international phone format (regex \+?[1-9]\d{1,14}); email optional but if provided must be unique (or auto-generate).
- **Behaviour:** Extract instructorId from JWT. Validate all fields. Create new User document: {firstName, lastName, phone, email (auto-generated or provided), password (temporary, auto-generated), role: LEARNER, instructorId, isActive: true, createdAt, updatedAt}. Return UserResponseDto. Display success 'Student added successfully'. Send temporary credentials to student via email (or display for testing).
### 3.9.2 Get All Students

**Endpoint:** `GET /api/students`

- **Access:** Instructor only
- **Query Params:** groupId (optional filter), page (default 1), limit (default 10), search (optional by name)
- **Behaviour:** Extract instructorId from JWT. Query users with role=LEARNER and instructorId=current_user_id. If groupId provided, filter learners in that group (query groups collection). Apply search filter if provided (regex on firstName + lastName). For each learner, calculate classRank (position by average score across all quizzes), averageScore, totalQuizzesTaken (count of quiz_results). Calculate pagination. Display in 2-column grid: student avatar/photo, name, class rank, average score, action buttons (edit, delete). Alternatively table view with pagination.
### 3.9.3 Update Student

**Endpoint:** `PUT /api/students/:id`

- **Access:** Instructor only
- **Body:** firstName (optional), lastName (optional), phone (optional)
- **Validation:** If firstName provided, validate as above; if lastName, validate; if phone, validate format.
- **Behaviour:** Find User by ID, verify role=LEARNER. Verify ownership (user.instructorId matches current_user_id). Update only provided fields. Return updated StudentDetailDto with fresh statistics.
### 3.9.4 Delete Student

**Endpoint:** `DELETE /api/students/:id`

- **Access:** Instructor only
- **Behaviour:** Find User by ID, verify role=LEARNER and ownership. Delete or soft-delete User document. Cascade removal from groups (remove from learners array in Group documents). Optionally archive quiz results. Return success message 'Student deleted'.
# 4. Data Models (Schema Definitions)

These are database-agnostic logical models. Fields and constraints should be mapped to MongoDB data types and Mongoose validation.

## 4.1 User Collection

- **Fields:** id (ObjectId), firstName (String, 2-50 chars), lastName (String, 2-50 chars), email (String, unique index, lowercase), password (String, bcrypt hash, select: false), phone (String, optional), role (Enum: INSTRUCTOR/LEARNER/ADMIN), isActive (Boolean, default true), profileImage (String URL, optional), passwordResetToken (String, optional, sparse index), passwordResetExpires (Date, optional, sparse index with TTL 900s), passwordChangedAt (Date, optional), createdAt (Date, auto), updatedAt (Date, auto)
- **Indexes:** email (unique), (email + role), createdAt (-1 desc), passwordResetExpires (TTL 900)
## 4.2 Group Collection

- **Fields:** id (ObjectId), groupName (String, 2-100 chars), instructorId (ObjectId, ref User), learners (Array of ObjectId, ref User), learnerCount (Number, denormalized count), createdAt (Date, auto), updatedAt (Date, auto)
- **Indexes:** instructorId, (instructorId + groupName unique compound), learners (for finding groups by member)
## 4.3 Question Collection

- **Fields:** id (ObjectId), title (String, 10-500 chars), description (String, optional, max 1000 chars), answers (Array of {option: String enum A-D, text: String 2-200 chars}), correctAnswer (String enum A-D), categoryType (String enum FE/BE/DATABASE/GENERAL), difficultyLevel (String enum ENTRY/MID/ADVANCED), instructorId (ObjectId, ref User), createdAt (Date, auto), updatedAt (Date, auto)
- **Indexes:** instructorId, (difficultyLevel + categoryType compound), createdAt (-1)
## 4.4 Quiz Collection

- **Fields:** id (ObjectId), title (String, 5-200 chars), description (String, optional, max 1000 chars), duration (Number, min 5 max 180 minutes), numberOfQuestions (Number, 1-100), scorePerQuestion (Number, 1-100), scheduledDateTime (Date, future validation), difficultyLevel (String enum), categoryType (String), assignedToGroups (Array of ObjectId, ref Group), questions (Array of ObjectId, ref Question, immutable after creation), instructorId (ObjectId, ref User), code (String, unique index, 6-7 chars), codeValidFrom (Date), codeValidUntil (Date), status (String enum SCHEDULED/ACTIVE/COMPLETED), randomizeQuestions (Boolean, default false), totalEnrolledStudents (Number, denormalized), createdAt (Date, auto), updatedAt (Date, auto)
- **Indexes:** instructorId, code (unique), scheduledDateTime, status, (scheduledDateTime + duration for expiry calculation), assignedToGroups
## 4.5 QuizAttempt Collection

- **Fields:** id (ObjectId), quizId (ObjectId, ref Quiz), learnerId (ObjectId, ref User), attemptStartTime (Date), attemptEndTime (Date), status (String enum IN_PROGRESS/SUBMITTED/EXPIRED), answers (Array of {questionId: ObjectId, selectedOption: String A-D or null}), createdAt (Date, auto), updatedAt (Date, auto)
- **Indexes:** (quizId + learnerId compound for one-attempt-per-learner), learnerId, status
## 4.6 QuizResult Collection

- **Fields:** id (ObjectId), quizId (ObjectId, ref Quiz), learnerId (ObjectId, ref User), groupId (ObjectId, ref Group), attemptId (ObjectId, ref QuizAttempt), submittedAt (Date), totalScore (Number, >= 0), scorePercentage (Number, 0-100), timeTaken (Number, seconds), answers (Array of {questionId: ObjectId, selectedOption: String/null, correctOption: String A-D, isCorrect: Boolean}), createdAt (Date, auto)
- **Indexes:** quizId, learnerId, groupId, submittedAt (-1), (quizId + learnerId unique compound - one result per learner per quiz)
# 5. Non-Functional Requirements

## 5.1 Security

All passwords must be hashed using bcryptjs with minimum 10 salt rounds before storage in database; plain text passwords never persisted.

JWT tokens must expire (24 hours for Instructor/Learner); secret key must be min 32 characters stored in .env; tokens include userId, email, role, iat, exp.

Role-based access control guards implemented via NestJS @UseGuards(AuthGuard('jwt'), RolesGuard); @Roles('INSTRUCTOR') decorator on protected endpoints; verify JWT presence and role authorization on every request.

Environment variables (.env file) must store all secrets: MONGODB_URI, JWT_SECRET, JWT_EXPIRATION, ALLOWED_ORIGINS, etc. Never commit .env to version control.

Sensitive fields (password, passwordResetToken) excluded from default queries using select: false in Mongoose schema; explicitly select if needed with .select('+password').

Input validation on all DTOs using class-validator; sanitize strings with trim(), lowercase(), match regex; validate array lengths, enum values, date formats.

CORS configured with whitelist of allowed origins; no Access-Control-Allow-Origin: * in production.

Rate limiting on authentication endpoints: max 5 failed login attempts per IP per hour; exponential backoff recommended (100ms, 200ms, 400ms delays).

Quiz code validation is both temporal (within codeValidFrom/codeValidUntil window) and exact string match (case-sensitive); prevent unauthorized access via invalid or expired codes.

Audit logging of sensitive operations: login, password change, quiz creation, result submission; log timestamp, userId, action, resource affected.

## 5.2 Validation & Error Handling

All request bodies validated against DTO schemas using class-validator before processing; return 400 Bad Request with detailed validation errors.

Global exception filter in NestJS catches all errors and returns consistent error response format: {status: 'error', message: 'Descriptive error message', errors: []}.

Quiz code validity checked strictly: verify code exists in quizzes collection, verify current time falls within [codeValidFrom, codeValidUntil] window, verify current time < scheduledDateTime + duration.

Prevent duplicate quiz submissions: check if (quizId, learnerId) already exists in quiz_results collection; if yes, return error 'Quiz already completed'.

Error messages user-friendly but don't leak system internals; e.g., 'Invalid email or password' rather than 'Email not found' (prevents user enumeration).

## 5.3 Response Format

All API responses follow consistent envelope structure: {status: 'success'|'error', message: 'optional descriptive message', data: {} or []}.

HTTP status codes: 200 OK for successful GET/PUT, 201 Created for successful POST, 204 No Content for successful DELETE with no body, 400 Bad Request for validation errors, 401 Unauthorized for auth failures, 403 Forbidden for permission denials, 404 Not Found for missing resources, 500 Internal Server Error for server faults.

Paginated responses include metadata: {data: [], pagination: {total: N, page: 1, limit: 10, totalPages: ceil(total/limit)}}.

## 5.4 Pagination

All list endpoints (GET /quizzes, GET /questions, GET /groups, GET /results, etc.) must support page and limit query parameters.

Default page: 1, default limit: 10, max limit: 100 (prevent abuse). Validate page >= 1 and limit >= 1, limit <= 100.

Calculate skip = (page - 1) * limit; apply in MongoDB query with .skip(skip).limit(limit).

Return pagination metadata: {data: [...], pagination: {total: totalCount, page, limit, totalPages: Math.ceil(total / limit)}}.

Database indexes on frequently sorted fields (createdAt, scheduledDateTime, submittedAt) ensure pagination performance.

## 5.5 Internationalisation (i18n)

API respects Accept-Language header in requests (ar or en); if not specified, default to en.

Error messages and user-facing strings returned in requested language (using i18n library like i18next or nestjs-i18n).

Frontend applies RTL (right-to-left) layout for Arabic, LTR for English; API can return lang attribute with responses if needed.

Date/time formatting respects locale: e.g., DD/MM/YYYY for most locales, alternative formats for region-specific preferences.

Question and quiz content stored with bilingual support (optional fields for Arabic translation, default English).

## 5.6 Performance & Scalability

All frequently queried fields indexed in MongoDB: email (User), instructorId (Group, Question, Quiz), quizId/learnerId (QuizAttempt, QuizResult), scheduledDateTime (Quiz), code (Quiz unique).

Compound indexes for multi-field queries: (instructorId + groupName), (difficultyLevel + categoryType), (quizId + learnerId).

All list endpoints must use pagination; no unbounded queries returning all documents.

Database connection pooling: min 5, max 10 connections configured in Mongoose.

Consider Redis caching for high-hit data: Dashboard data (5-min TTL), Question bank by difficulty (10-min TTL), Student rankings (15-min TTL); invalidate cache on mutations.

Target response times: GET list 100-300ms, GET single 50-150ms, POST create 50-200ms, POST submit quiz 500-2000ms (includes calculation).

Use database transactions when updating related documents (e.g., QuizAttempt + QuizResult creation) to ensure consistency.

# 6. API Documentation

The team must deliver API documentation using one of the following approaches:

- **Option A - Swagger/OpenAPI:** Auto-generated or manually written swagger.json or swagger.yaml file; accessible at /api/docs endpoint when server is running; all schemas defined under components/schemas; request/response examples for each endpoint; JWT bearer authentication configured under securitySchemes; endpoint descriptions include access level, body/query parameters, response codes, example payloads.
- **Option B - Postman Collection:** Fully exported Postman Collection (v2.1 or later) with environment variables configured for baseURL and authorization token; all endpoints grouped by module (Auth, Instructor/Groups, Instructor/Questions, Instructor/Quizzes, Instructor/Students, Learner/Dashboard, Learner/Quiz, Results, etc.); example request bodies and expected responses documented on each request; pre-request scripts for token generation if needed.
# 7. Folder Structure Recommendation

```text
src/
├── config/          # Database connection, environment config, constants
├── common/          # Reusable guards, filters, decorators, middleware, validators
├── modules/         # Feature-based modules
│   ├── auth/        # Authentication: register, login, password reset, change password
│   ├── groups/      # Group CRUD operations
│   ├── questions/   # Question bank CRUD
│   ├── quizzes/     # Quiz management and quiz attempts
│   ├── results/     # Results retrieval and analytics
│   ├── students/    # Student management (instructor perspective)
│   └── dashboard/   # Dashboard endpoints for instructor and learner
├── schemas/         # Mongoose schema definitions for all collections
├── dtos/            # Data Transfer Objects for all endpoints (requests/responses)
├── utils/           # Helper functions, pagination, response formatters, validators
└── app.module.ts    # Main application module imports and configuration
```
