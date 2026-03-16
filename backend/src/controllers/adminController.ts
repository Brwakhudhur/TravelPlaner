import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/authMiddleware';
import { userModel } from '../config/dataStore';

export const createUserValidation = [
  body('displayName').trim().isLength({ min: 2 }).withMessage('Display name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin'),
];

export const updateUserValidation = [
  body('displayName').optional().trim().isLength({ min: 2 }).withMessage('Display name must be at least 2 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin'),
];

export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await userModel.findAll();
    res.json({ count: users.length, users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await userModel.findById(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array().map((e) => e.msg).join(', ') });
      return;
    }

    const { displayName, email, password, role = 'user' } = req.body;
    const existing = await userModel.findByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    const user = await userModel.create({ id: uuidv4(), displayName, email, password, role });

    res.status(201).json({
      message: 'User created',
      user,
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array().map((e) => e.msg).join(', ') });
      return;
    }

    const { displayName, email, password, role } = req.body;
    const userId = req.params.id;

    const existing = await userModel.findById(userId);
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Prevent an admin from removing their own admin role unintentionally
    if (req.userId === userId && role && role !== 'admin') {
      res.status(400).json({ error: 'You cannot downgrade your own admin role.' });
      return;
    }

    const updated = await userModel.update(userId, {
      displayName,
      email,
      password,
      role,
    });

    res.json({ message: 'User updated', user: updated });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.includes('UNIQUE constraint failed: users.email')) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    if (req.userId === userId) {
      res.status(400).json({ error: 'You cannot delete your own account while signed in as admin.' });
      return;
    }

    const existing = await userModel.findById(userId);
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await userModel.remove(userId);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
