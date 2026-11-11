ALTER TABLE "skill" ADD COLUMN "execution_mode" TEXT NOT NULL DEFAULT 'prompt' CHECK (execution_mode IN ('prompt','script','agent'));
ALTER TABLE "skill_version" ADD COLUMN "execution_mode" TEXT NOT NULL DEFAULT 'prompt' CHECK (execution_mode IN ('prompt','script','agent'));
CREATE TABLE "skill_run" (
 id TEXT PRIMARY KEY, member_id TEXT NOT NULL, skill_id TEXT NOT NULL, skill_version TEXT NOT NULL,
 execution_id TEXT REFERENCES execution(id) ON DELETE SET NULL,
 status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','cancelled','timeout')),
 input_blob_ids JSONB NOT NULL, artifacts JSONB NOT NULL DEFAULT '[]', package_blob JSONB NOT NULL,
 error TEXT, attempt INTEGER NOT NULL DEFAULT 0, locked_by TEXT, locked_until TIMESTAMPTZ(3),
 cancel_requested BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 started_at TIMESTAMPTZ(3), finished_at TIMESTAMPTZ(3)
);
CREATE INDEX skill_run_status_created_at_idx ON skill_run(status, created_at);
CREATE INDEX skill_run_member_id_created_at_idx ON skill_run(member_id, created_at);
CREATE TABLE skill_run_event (
 run_id TEXT NOT NULL REFERENCES skill_run(id) ON DELETE CASCADE, seq INTEGER NOT NULL,
 type TEXT NOT NULL CHECK (type IN ('step_start','step_end','log','artifact','error','status')),
 payload JSONB NOT NULL, created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(run_id, seq)
);
CREATE TABLE skill_run_input (blob_id TEXT PRIMARY KEY, member_id TEXT NOT NULL);
