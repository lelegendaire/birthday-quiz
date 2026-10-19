import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex 
} from "drizzle-orm/pg-core";

export const questionTypeEnum = pgEnum("question_type", [
  "multiple_choice",
  "free_text",
  "slider",
  "pin",
  "ordering",
  "image_guess",
  "audio_guess",
  "closest_wins",
]);

export const quizzes = pgTable("quizzes", {
  id: uuid("id").defaultRandom().primaryKey(),

  title: varchar("title", { length: 120 }).notNull(),

  description: text("description"),

  isPublic: boolean("is_public").default(false).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),

  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),

  type: questionTypeEnum("type").notNull(),

  title: varchar("title", { length: 500 }).notNull(),

  position: integer("position").notNull(),

  timeLimit: integer("time_limit").default(60).notNull(),

  points: integer("points").default(1000).notNull(),

  // Configuration propre à chaque type de question.
  config: jsonb("config")
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gameSessions = pgTable(
  "game_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),

    pin: varchar("pin", { length: 6 }).notNull(),

    status: varchar("status", { length: 20 })
      .default("waiting")
      .notNull(),

    hostTokenHash: varchar("host_token_hash", { length: 64 }).notNull(),

currentQuestionIndex: integer("current_question_index")
  .default(0)
  .notNull(),

    // Moment où la question courante a été lancée (sert au chrono et au bonus de rapidité).
    questionStartedAt: timestamp("question_started_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("game_sessions_pin_unique").on(table.pin),
  ],
);

export const gamePlayers = pgTable(
  "game_players",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    gameId: uuid("game_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),

    nickname: varchar("nickname", { length: 20 }).notNull(),

    score: integer("score").default(0).notNull(),

    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("game_players_game_nickname_unique").on(
      table.gameId,
      table.nickname,
    ),
  ],
);

export const gameAnswers = pgTable(
  "game_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    gameId: uuid("game_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),

    playerId: uuid("player_id")
      .notNull()
      .references(() => gamePlayers.id, { onDelete: "cascade" }),

    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),

    answerId: varchar("answer_id", { length: 100 }),
   // Utilisé pour les réponses libres
    answerText: text("answer_text"),

    // null = en attente de correction
    isCorrect: boolean("is_correct"),

    pointsAwarded: integer("points_awarded").default(0).notNull(),

    // Temps de réponse mesuré côté serveur, en millisecondes.
    responseTimeMs: integer("response_time_ms"),

    answeredAt: timestamp("answered_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("game_answers_once_per_question")
      .on(table.gameId, table.playerId, table.questionId),
  ],
);