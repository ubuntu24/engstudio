const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều lượt đăng nhập/đăng ký. Vui lòng thử lại sau 15 phút.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 registrations per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bạn đã đăng ký quá nhiều lần. Vui lòng thử lại sau 1 giờ.' }
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bạn đã đạt giới hạn sử dụng AI. Vui lòng thử lại sau 15 phút.' }
});

const sessionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 sessions per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bạn đang tạo quá nhiều phiên học. Vui lòng thử lại sau 1 phút.', is_guest: true }
});

const reviewLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // limit each IP to 120 review submissions per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bạn đang gửi đánh giá quá nhanh. Vui lòng thử lại sau.' }
});

module.exports = {
  apiLimiter,
  authLimiter,
  registerLimiter,
  aiLimiter,
  sessionLimiter,
  reviewLimiter
};
