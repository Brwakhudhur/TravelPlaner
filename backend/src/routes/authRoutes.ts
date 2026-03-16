import express from 'express';
import { register, login, getCurrentUser, registerValidation, loginValidation } from '../controllers/authController';
import { updateProfile, updateProfileValidation } from '../controllers/userController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.get('/me', authenticate, getCurrentUser);
router.put('/update-profile', authenticate, updateProfileValidation, updateProfile);

export default router;
