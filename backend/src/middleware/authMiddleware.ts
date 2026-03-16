import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { userModel } from '../config/dataStore';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: 'user' | 'admin';
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please login or register.' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role?: 'user' | 'admin' };
    const user = await userModel.findById(decoded.userId);

    if (!user) {
      res.status(401).json({ error: 'User no longer exists. Please login again.' });
      return;
    }

    req.userId = user.id;
    req.userRole = user.role as 'user' | 'admin';

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token. Please login again.' });
  }
};

export const authorizeAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }

  next();
};

