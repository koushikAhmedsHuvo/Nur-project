import express from 'express'
import { login, logout, signup,onboard } from '../controller/auth.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';


const router=express.Router()

router.post('/signup',signup);
router.post('/login',login);
router.post('/logout',logout);

// Update Users Details
router.post('/onboarding', protectRoute,onboard);

//Check if you are logged in
router.get('/me', protectRoute, (req, res) =>
  // `sucess` kept alongside the corrected spelling for older clients.
  res.json({ success: true, sucess: true, user: req.user })
);

export default router;