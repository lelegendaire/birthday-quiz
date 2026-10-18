ALTER TABLE "game_answers" ADD COLUMN "response_time_ms" integer;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "question_started_at" timestamp;