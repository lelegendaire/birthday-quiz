ALTER TABLE "game_sessions" ADD COLUMN "host_token_hash" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "current_question_index" integer DEFAULT 0 NOT NULL;