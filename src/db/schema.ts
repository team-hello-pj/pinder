import { integer, jsonb, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

/**
 * 회원 테이블. 비밀번호/구글 로그인 계정이 공존할 수 있어 passwordHash/googleId 는 nullable.
 * username/nickname 도 nullable — 구글 가입은 이름만으로 계정이 만들어지고, 나중에 마이페이지에서 채운다.
 */
export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  username: text('username').unique(),
  nickname: text('nickname').unique(),
  name: text('name').notNull(),
  googleId: text('google_id').unique(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  notificationPrefs: jsonb('notification_prefs'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * 닉네임을 바꾸면 이전 닉네임이 여기 남는다 — 바뀐 뒤 7일간은 다른 사람이
 * 같은 닉네임을 다시 쓸 수 없게(reusableAt) 막기 위한 보호 기간 기록이다.
 */
export const nicknameHistory = pgTable('nickname_history', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  nickname: text('nickname').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  reusableAt: timestamp('reusable_at', { withTimezone: true }).notNull(),
});

/**
 * 이메일당 인증번호 하나만 유지한다 (재전송 시 덮어씀).
 * verifiedAt 이 채워지면 회원가입 시점에 "이 이메일은 방금 인증됐다"는 증거로 쓰고 삭제한다.
 */
export const emailVerificationCodes = pgTable('email_verification_codes', {
  email: text('email').primaryKey(),
  codeHash: text('code_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * 경로/일정. `places`/`segments` 는 `SavedRoute` 와 같은 모양의 jsonb 로 그대로 저장한다 —
 * 구간(leg) 거리/시간은 Kakao API 에서 그때그때 다시 계산하는 현재 구조를 유지한다.
 * ownerId 가 제작자(creator)다. 삭제 시 CASCADE 로 협업자/수정요청도 함께 정리된다.
 */
export const schedules = pgTable('schedules', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  places: jsonb('places').notNull(),
  segments: jsonb('segments').notNull(),
  criteria: text('criteria').notNull(),
  tripStart: text('trip_start').notNull(),
  tripEnd: text('trip_end').notNull(),
  customName: integer('custom_name').notNull().default(0),
  inviteToken: text('invite_token').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** 제작자(ownerId)를 제외한 협업자만 담는다 — editor 는 편집 가능, viewer 는 읽기 전용. */
export const scheduleCollaborators = pgTable(
  'schedule_collaborators',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    scheduleId: text('schedule_id')
      .notNull()
      .references(() => schedules.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'editor' | 'viewer'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.scheduleId, t.userId)],
);

/** viewer 가 편집 권한을 요청하면 생기고, 제작자가 승인/거절하면 사라진다. */
export const scheduleEditRequests = pgTable(
  'schedule_edit_requests',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    scheduleId: text('schedule_id')
      .notNull()
      .references(() => schedules.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.scheduleId, t.userId)],
);
