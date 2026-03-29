import express from 'express';
import sequelize from './config/db.js';
import bookingRoutes from './routes/bookingRoutes.js';
import serviceCenterRoutes from './routes/serviceCenterRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/booking', bookingRoutes);
app.use('/api/service-center', serviceCenterRoutes);

app.get('/', (req, res) => res.send('📅 Booking Service is running'));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5002; // Lấy port từ .env hoặc mặc định 5002

(async () => {
  try {
    await sequelize.authenticate();
    // await sequelize.sync(); // Mở dòng này nếu bạn muốn tự động tạo bảng
    console.log('✅ Database connected for Booking Service.');

    // THÊM ĐOẠN NÀY VÀO:
    app.listen(PORT, () => {
      console.log(`🚀 Booking Service running on port ${PORT}`);
    });

  } catch (err) {
    console.error('❌ Database connection failed:', err);
  }
})();

export default app;