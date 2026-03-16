import express from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
	getCheapestFlights,
	cheapestFlightsValidation,
	searchAirportsHandler,
	airportSearchValidation,
} from '../controllers/flightController';

const router = express.Router();

router.use(authenticate);

router.get('/airports', airportSearchValidation, searchAirportsHandler);
router.post('/cheapest', cheapestFlightsValidation, getCheapestFlights);

export default router;
