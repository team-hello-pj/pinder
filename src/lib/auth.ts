'use client';

/**
 * 목업 인증. 실제 백엔드 없이 localStorage(`pnder-users`)에 계정 목록을 두고
 * 이메일/비밀번호를 그대로 대조한다 — 프로토타입 단계에서 회원가입→로그인 흐름이
 * 실제로 동작하는 것을 보여주기 위한 것.
 * TODO(인증 담당): 실제 백엔드 연동 시 registerUser/loginUser 내부만 API 호출로 교체.
 */

import { STORAGE_KEYS, storage } from '@/lib/storage';

interface StoredUser {
  email: string;
  nickname: string;
  password: string;
}

function loadUsers(): StoredUser[] {
  return storage.read<StoredUser[]>(STORAGE_KEYS.users, []);
}

function saveUsers(users: StoredUser[]): void {
  storage.write(STORAGE_KEYS.users, users);
}

export type AuthResult = { ok: true } | { ok: false; message: string };

export function registerUser(email: string, nickname: string, password: string): AuthResult {
  const users = loadUsers();
  if (users.some((u) => u.email === email)) {
    return { ok: false, message: '이미 가입된 이메일이에요.' };
  }
  saveUsers([...users, { email, nickname, password }]);
  return { ok: true };
}

export function loginUser(email: string, password: string): AuthResult {
  const users = loadUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return { ok: false, message: '가입되지 않은 이메일이에요.' };
  if (user.password !== password) return { ok: false, message: '비밀번호가 일치하지 않아요.' };
  return { ok: true };
}
