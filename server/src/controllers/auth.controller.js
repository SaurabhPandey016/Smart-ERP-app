import { authService } from '../services/auth.service.js';

export const authController = {
  async register(req, res) {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  },
  async login(req, res) {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result });
  },
  async profile(req, res) {
    const user = await authService.getProfile(req.userId);
    res.json({ success: true, data: user });
  },
};
