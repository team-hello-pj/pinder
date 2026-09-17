import { boolean, integer, jsonb, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

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
  /** 프로필 사진. 별도 스토리지 없이 리사이즈된 data URL 문자열 그대로 저장한다. */
  avatarUrl: text('avatar_url'),
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
 * 경로/일정. `places`/`segments` 는 `SavedRoute` 와 같은 모양의 jsonb 로 그대로 저장한다.
 * `routeCache` 는 "경로 계산"/"경로 검색"으로 실제 조회한 구간(leg) 결과를 방문지 id쌍+
 * 이동수단+기준별로 캐시해 둔 것 — 저장할 때 같이 저장해서, 나중에 다시 불러왔을 때 매번
 * 새로 검색하지 않고 계산해 둔 결과가 그대로 남아있게 한다.
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
  routeCache: jsonb('route_cache'),
  customName: integer('custom_name').notNull().default(0),
  /** 보기전용/편집가능 초대 링크는 서로 다른 토큰을 쓴다 — 하나가 새면 그 권한만 노출된다. */
  inviteTokenViewer: text('invite_token_viewer').unique(),
  inviteTokenEditor: text('invite_token_editor').unique(),
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

/** 커뮤니티 게시글. 좋아요/북마크 개수는 저장하지 않고 매번 관련 테이블에서 집계한다. */
export const posts = pgTable('posts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  place: text('place').notNull(),
  region: text('region').notNull(),
  caption: text('caption').notNull(),
  tags: jsonb('tags').notNull(),
  /** 리사이즈된 data URL 문자열 배열 — avatarUrl 과 같은 방식으로 별도 스토리지 없이 저장한다. */
  images: jsonb('images').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const postLikes = pgTable(
  'post_likes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.postId, t.userId)],
);

export const postBookmarks = pgTable(
  'post_bookmarks',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.postId, t.userId)],
);

/** 댓글 1단계. 답글(post_comment_replies)은 댓글 밑에 한 단계만 더 달린다 (대댓글의 대댓글 없음). */
export const postComments = pgTable('post_comments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  postId: text('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const postCommentLikes = pgTable(
  'post_comment_likes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    commentId: text('comment_id')
      .notNull()
      .references(() => postComments.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.commentId, t.userId)],
);

export const postCommentReplies = pgTable('post_comment_replies', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  commentId: text('comment_id')
    .notNull()
    .references(() => postComments.id, { onDelete: 'cascade' }),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const postReplyLikes = pgTable(
  'post_reply_likes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    replyId: text('reply_id')
      .notNull()
      .references(() => postCommentReplies.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.replyId, t.userId)],
);

/**
 * 탐색 화면의 큐레이션 여행지. 관리자 화면이 없어서 지금은 시드 스크립트로만 채운다 —
 * sectionTitle/sectionSubtitle 을 각 행에 그대로 들고 있어(비정규화) 섹션 테이블을 따로 두지 않는다.
 */
export const destinations = pgTable('destinations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sectionTitle: text('section_title').notNull(),
  sectionSubtitle: text('section_subtitle').notNull(),
  sectionOrder: integer('section_order').notNull(),
  itemOrder: integer('item_order').notNull(),
  name: text('name').notNull(),
  region: text('region').notNull(),
  badge: text('badge').notNull(),
  desc: text('desc').notNull(),
  tags: jsonb('tags').notNull(),
});

/**
 * 헤더 알림벨. type 은 legacy(main(home).dc.html)와 맞춰 'comment'|'schedule'|'feature' 세 가지만 쓴다.
 * "내일 출발" 같은 일정 임박 알림은 여기 저장하지 않고 조회 시점에 schedules 에서 계산해 합쳐 보여준다.
 */
export const notifications = pgTable('notifications', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'comment' | 'schedule' | 'feature'
  text: text('text').notNull(),
  read: boolean('read').notNull().default(false),
  /** 편집 권한 요청 알림처럼 알림 자체에서 승인/거절할 수 있어야 하는 경우에만 채워진다. */
  relatedScheduleId: text('related_schedule_id'),
  relatedRequestId: text('related_request_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
