import { Request } from 'express';

export interface AuthUser {
  userId: string;
  email: string;
  roles: string[];
}

export interface AuthRequest extends Request {
  user: AuthUser;
}