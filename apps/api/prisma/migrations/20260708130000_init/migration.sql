-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "defaultChatId" TEXT NOT NULL,
    "catalogJson" JSON NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
