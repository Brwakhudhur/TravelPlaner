import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/authMiddleware';
import { userModel } from '../config/dataStore';

export const updateProfileValidation = [
  body('displayName').optional().trim().isLength({ min: 2 }).withMessage('Display name must be at least 2 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array().map((e) => e.msg).join(', ') });
      return;
    }

    const userId = req.userId!;
    const { displayName, email, password } = req.body;

    const updateData: any = {};
    if (displayName) updateData.displayName = displayName;
    if (email) updateData.email = email;
    if (password) updateData.password = password;

    const updatedUser = await userModel.update(userId, updateData);

    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        displayName: updatedUser.displayName,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.includes('UNIQUE constraint failed: users.email')) {
      res.status(400).json({ error: 'Email already in use by another account' });
      return;
    }
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error while updating profile' });
  }
};
