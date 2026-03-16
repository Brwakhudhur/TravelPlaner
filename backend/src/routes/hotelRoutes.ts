import { Router } from 'express';
import { search, getBest } from '../controllers/hotelController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

/**
 * POST /api/hotels/search
 * Search for hotels with check-in and check-out dates
 * @body {string} location - City or destination name
 * @body {string} checkInDate - Check-in date (YYYY-MM-DD)
 * @body {string} checkOutDate - Check-out date (YYYY-MM-DD)
 */
router.post('/search', authenticate, search);

/**
 * POST /api/hotels/best
 * Get the best-rated hotel with good pricing
 * @body {string} location - City or destination name
 * @body {string} checkInDate - Check-in date (YYYY-MM-DD)
 * @body {string} checkOutDate - Check-out date (YYYY-MM-DD)
 */
router.post('/best', authenticate, getBest);

export default router;
