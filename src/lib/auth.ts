'use client';

/**
 * 목업 인증. 실제 백엔드 없이 localStorage(`pnder-users`)에 계정 목록을 두고
 * 이메일/비밀번호를 그대로 대조한다 — 프로토타입 단계에서 회원가입→로그인 흐름이
 * 실제로 동작하는 것을 보여주기 위한 것. legacy/Login Screen.dc.html,
 * legacy/Signup Screen.dc.html 의 검증 로직을 그대로 옮겼다.
 * TODO(인증 담당): 실제 백엔드 연동 시 registerUser/loginUser 내부만 API 호출로 교체.
 */

import { STORAGE_KEYS, storage } from '@/lib/storage';

export interface StoredUser {
  email: string;
  password: string;
  username: string;
  nickname: string;
  name: string;
}

// legacy 의 TAKEN_USERNAMES / TAKEN_NICKNAMES — 데모용으로 항상 이미 사용 중인 것처럼 취급.
const TAKEN_USERNAMES = ['pnder', 'admin', 'traveler', 'test'];
const TAKEN_NICKNAMES = ['여행자', '관리자'];

function loadUsers(): StoredUser[] {
  return storage.read<StoredUser[]>(STORAGE_KEYS.users, []);
}

function saveUsers(users: StoredUser[]): void {
  storage.write(STORAGE_KEYS.users, users);
}

export type AuthResult = { ok: true } | { ok: false; message: string };

export function registerUser(profile: Omit<StoredUser, 'name'> & { name: string }): AuthResult {
  const users = loadUsers();
  if (users.some((u) => u.email === profile.email)) {
    return { ok: false, message: '이미 가입된 이메일이에요.' };
  }
  saveUsers([...users, profile]);
  return { ok: true };
}

export function loginUser(email: string, password: string): AuthResult {
  const users = loadUsers();
  const account = users.find((u) => u.email === email);
  if (!account) return { ok: false, message: '가입된 회원이 아닙니다.' };
  if (account.password !== password) return { ok: false, message: '아이디/비밀번호가 틀렸습니다.' };
  return { ok: true };
}

/** 아이디(username) 중복확인 — 데모 목록 + 이미 가입된 아이디를 함께 확인한다. */
export function isUsernameTaken(username: string): boolean {
  if (TAKEN_USERNAMES.includes(username.toLowerCase())) return true;
  return loadUsers().some((u) => u.username.toLowerCase() === username.toLowerCase());
}

/** 닉네임 중복확인 — 데모 목록 + 이미 가입된 닉네임을 함께 확인한다. */
export function isNicknameTaken(nickname: string): boolean {
  if (TAKEN_NICKNAMES.includes(nickname)) return true;
  return loadUsers().some((u) => u.nickname === nickname);
}
