CREATE TABLE "game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"pin" varchar(6) NOT NULL,
	"status" varchar(20) DEFAULT 'waiting' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_sessions_pin_unique" ON "game_sessions" USING btree ("pin");