-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "external_id" TEXT,
    "display_name" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT 'bg-zinc-600',
    "post_name" TEXT,
    "org_path" TEXT,
    "role" TEXT NOT NULL DEFAULT 'business_user',
    "status" TEXT NOT NULL DEFAULT 'active',
    "dept_ids" JSONB NOT NULL DEFAULT '[]',
    "region_id" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_credential" (
    "member_id" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'sha256-salt',
    "salt" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "password_updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "member_credential_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "auth_session" (
    "token_hash" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "auth_method" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_session_pkey" PRIMARY KEY ("token_hash")
);

-- CreateTable
CREATE TABLE "collection_revision" (
    "collection" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updated_by_member_id" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "collection_revision_pkey" PRIMARY KEY ("collection")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_email_key" ON "member"("email");

-- CreateIndex
CREATE UNIQUE INDEX "member_external_id_key" ON "member"("external_id");

-- CreateIndex
CREATE INDEX "auth_session_member_idx" ON "auth_session"("member_id");

-- CreateIndex
CREATE INDEX "auth_session_expires_idx" ON "auth_session"("expires_at");

-- AddForeignKey
ALTER TABLE "member_credential" ADD CONSTRAINT "member_credential_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

