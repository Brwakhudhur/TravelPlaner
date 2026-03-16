import express from 'express';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  createUserValidation,
  updateUserValidation,
} from '../controllers/adminController';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate, authorizeAdmin);

router.get('/users', listUsers);
router.get('/users/:id', getUser);
router.post('/users', createUserValidation, createUser);
router.put('/users/:id', updateUserValidation, updateUser);
router.delete('/users/:id', deleteUser);

export default router;
