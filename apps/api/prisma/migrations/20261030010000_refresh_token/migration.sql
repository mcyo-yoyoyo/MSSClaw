-- 身份改造第 2 步：JWT 访问令牌不落库，刷新令牌落库以便轮换和作废。
CREATE TABLE "refresh_token" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "auth_method" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "replaced_by" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");
CREATE INDEX "refresh_token_member_idx" ON "refresh_token"("member_id");
CREATE INDEX "refresh_token_expires_idx" ON "refresh_token"("expires_at");
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
