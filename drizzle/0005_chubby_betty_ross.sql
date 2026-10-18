ALTER TABLE "game_answers" ALTER COLUMN "is_correct" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "game_answers" ADD COLUMN "answer_text" text;