CREATE TYPE "public"."question_type" AS ENUM('multiple_choice', 'free_text', 'slider', 'pin', 'ordering', 'image_guess', 'closest_wins');--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"type" "question_type" NOT NULL,
	"title" varchar(500) NOT NULL,
	"position" integer NOT NULL,
	"time_limit" integer DEFAULT 20 NOT NULL,
	"points" integer DEFAULT 1000 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;