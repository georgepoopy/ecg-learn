-- CreateTable
CREATE TABLE "EcgType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "superclass" TEXT NOT NULL,
    "scpCodes" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'intermediate'
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "typeId" TEXT NOT NULL,
    "estMinutes" INTEGER NOT NULL DEFAULT 5,
    "sections" TEXT NOT NULL,
    "keyFacts" TEXT NOT NULL,
    CONSTRAINT "Lesson_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "EcgType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Record" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'ptbxl',
    "externalId" TEXT NOT NULL,
    "fs" INTEGER NOT NULL,
    "nSamples" INTEGER NOT NULL,
    "gain" REAL NOT NULL,
    "leads" TEXT NOT NULL,
    "signalsB64" TEXT NOT NULL,
    "ptbReport" TEXT
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "typeId" TEXT NOT NULL,
    "recordId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'identify',
    "tier" TEXT NOT NULL DEFAULT 'foundational',
    "stem" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correctOptionId" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "labels" TEXT NOT NULL DEFAULT '[]',
    "topic" TEXT,
    "authored" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" TEXT NOT NULL DEFAULT 'approved',
    "leadFocus" TEXT,
    CONSTRAINT "Question_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "EcgType" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Question_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "name" TEXT,
    "passwordHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TypeProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" DATETIME,
    "masteryScore" REAL NOT NULL DEFAULT 0,
    "seenCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TypeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TypeProgress_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "EcgType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "dueAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stability" REAL NOT NULL DEFAULT 0,
    "difficulty" REAL NOT NULL DEFAULT 0,
    "elapsedDays" REAL NOT NULL DEFAULT 0,
    "scheduledDays" REAL NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "learningSteps" INTEGER NOT NULL DEFAULT 0,
    "state" INTEGER NOT NULL DEFAULT 0,
    "lastReview" DATETIME,
    "lastGrade" INTEGER,
    "lastSeenAt" DATETIME,
    CONSTRAINT "QuestionState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuestionState_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "chosenOptionId" TEXT NOT NULL,
    "responseMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_typeId_key" ON "Lesson"("typeId");

-- CreateIndex
CREATE UNIQUE INDEX "Record_source_externalId_key" ON "Record"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TypeProgress_userId_typeId_key" ON "TypeProgress"("userId", "typeId");

-- CreateIndex
CREATE INDEX "QuestionState_userId_dueAt_idx" ON "QuestionState"("userId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionState_userId_questionId_key" ON "QuestionState"("userId", "questionId");

