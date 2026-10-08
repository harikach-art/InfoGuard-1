import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { UserSession } from '../src/types';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

function getSafeDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpData = path.join('/tmp', 'infoguard_data');
    if (!fs.existsSync(tmpData)) {
      try {
        fs.mkdirSync(tmpData, { recursive: true });
        const localData = path.resolve(process.cwd(), 'data');
        if (fs.existsSync(localData)) {
          const files = fs.readdirSync(localData);
          for (const f of files) {
            const src = path.join(localData, f);
            const dst = path.join(tmpData, f);
            if (!fs.existsSync(dst)) {
              fs.copyFileSync(src, dst);
            }
          }
        }
      } catch (err) {
        console.warn('Could not initialize /tmp data directory on serverless:', err);
      }
    }
    return tmpData;
  }
  const localDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {
      return path.join('/tmp', 'infoguard_data');
    }
  }
  return localDir;
}

const DATA_DIR = getSafeDataDir();
const USERS_FILE = path.join(DATA_DIR, 'users.json');

let inMemoryUsers: StoredUser[] = [];

function loadUsers(): StoredUser[] {
  if (inMemoryUsers.length > 0) {
    return inMemoryUsers;
  }
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      inMemoryUsers = JSON.parse(data);
      return inMemoryUsers;
    }
  } catch (err) {
    console.error('Error loading users:', err);
  }
  return [];
}

function saveUsers(users: StoredUser[]) {
  inMemoryUsers = users;
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving users to file:', err);
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// In-memory token store for sessions
const sessions = new Map<string, UserSession>();

export function registerUser(name: string, email: string, password: string): { user: UserSession; token: string } {
  const users = loadUsers();
  const normalizedEmail = email.trim().toLowerCase();

  if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error('An account with this email address already exists.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const newUser: StoredUser = {
    id,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    salt,
    createdAt,
  };

  users.push(newUser);
  saveUsers(users);

  const token = crypto.randomBytes(32).toString('hex');
  const session: UserSession = { id, name: newUser.name, email: newUser.email, createdAt };
  sessions.set(token, session);

  return { user: session, token };
}

export function loginUser(email: string, password: string): { user: UserSession; token: string } {
  const users = loadUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    throw new Error('Invalid email or password.');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const session: UserSession = { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
  sessions.set(token, session);

  return { user: session, token };
}

export function loginWithGoogle(email: string, name: string): { user: UserSession; token: string } {
  const users = loadUsers();
  const normalizedEmail = email.trim().toLowerCase();
  let user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(crypto.randomBytes(16).toString('hex'), salt);
    user = {
      id: crypto.randomUUID(),
      name: name || 'Google User',
      email: normalizedEmail,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    saveUsers(users);
  }

  const token = crypto.randomBytes(32).toString('hex');
  const session: UserSession = { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
  sessions.set(token, session);

  return { user: session, token };
}

export function verifySession(token?: string): UserSession | null {
  if (!token) return null;
  return sessions.get(token) || null;
}
