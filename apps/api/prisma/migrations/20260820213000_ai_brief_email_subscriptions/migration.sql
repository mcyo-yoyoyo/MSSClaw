-- AI Brief email subscribers. One active subscription per workspace user.
CREATE TABLE "AiBriefEmailSubscription" (
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subscribedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    PRIMARY KEY ("workspaceId", "userId")
);

CREATE INDEX "AiBriefEmailSubscription_workspaceId_subscribedAt_idx"
ON "AiBriefEmailSubscription"("workspaceId", "subscribedAt");

CREATE INDEX "AiBriefEmailSubscription_workspaceId_email_idx"
ON "AiBriefEmailSubscription"("workspaceId", "email");

-- Preserve subscriptions written by the previous platform-doc implementation.
-- Subscriber names come from the workspace member directory when available;
-- userId remains a safe fallback for deleted/legacy members.
INSERT OR IGNORE INTO "AiBriefEmailSubscription" (
    "workspaceId",
    "userId",
    "userName",
    "email",
    "subscribedAt",
    "updatedAt"
)
SELECT
    prefs."workspaceId",
    subscriber.key,
    COALESCE(
        (
            SELECT NULLIF(TRIM(json_extract(member.value, '$.name')), '')
            FROM "CenterRecord" AS members,
                 json_each(members."payload", '$.members') AS member
            WHERE members."workspaceId" = prefs."workspaceId"
              AND members."kind" = 'doc:members'
              AND (
                  json_extract(member.value, '$.id') = subscriber.key
                  OR LOWER(json_extract(member.value, '$.email')) =
                     LOWER(json_extract(subscriber.value, '$.email'))
              )
            LIMIT 1
        ),
        subscriber.key
    ),
    LOWER(TRIM(json_extract(subscriber.value, '$.email'))),
    COALESCE(NULLIF(json_extract(subscriber.value, '$.updatedAt'), ''), CURRENT_TIMESTAMP),
    COALESCE(NULLIF(json_extract(subscriber.value, '$.updatedAt'), ''), CURRENT_TIMESTAMP)
FROM "CenterRecord" AS prefs,
     json_each(prefs."payload", '$.byUser') AS subscriber
WHERE prefs."kind" = 'doc:ai-news-prefs'
  AND json_extract(subscriber.value, '$.emailSubscribed') = 1
  AND json_type(subscriber.value, '$.email') = 'text'
  AND LENGTH(TRIM(json_extract(subscriber.value, '$.email'))) BETWEEN 3 AND 254;
