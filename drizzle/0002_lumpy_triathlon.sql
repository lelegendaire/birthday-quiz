CREATE TABLE "game_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"nickname" varchar(20) NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_game_sessions_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_players_game_nickname_unique" ON "game_players" USING btree ("game_id","nickname");