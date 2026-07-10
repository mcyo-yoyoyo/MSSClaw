-- CreateTable
CREATE TABLE "CenterRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSON NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "CenterRecord_workspaceId_kind_idx" ON "CenterRecord"("workspaceId", "kind");
