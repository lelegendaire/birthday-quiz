CREATE TABLE "game_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"answer_id" varchar(100) NOT NULL,
	"is_correct" boolean NOT NULL,
	"points_awarded" integer DEFAULT 0 NOT NULL,
	"answered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_answers" ADD CONSTRAINT "game_answers_game_id_game_sessions_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_answers" ADD CONSTRAINT "game_answers_player_id_game_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."game_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_answers" ADD CONSTRAINT "game_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_answers_once_per_question" ON "game_answers" USING btree ("game_id","player_id","question_id");