import 'server-only';

import bcrypt from 'bcryptjs';

const ROUNDS = 10;

export function hash(value: string): Promise<string> {
  return bcrypt.hash(value, ROUNDS);
}

export function compareHash(value: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(value, hashed);
}
