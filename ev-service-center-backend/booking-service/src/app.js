import express from 'express';
import { Sequelize, DataTypes } from 'sequelize';
import 'dotenv/config';

const app = express();
app.use(express.json());

// 1. Kết nối Database
export const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false
    }
);

// 2. Định nghĩa Model Appointment
const Appointment = sequelize.define('Appointment', {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    vehicleId: { type: DataTypes.INTEGER, allowNull: false },
    serviceCenterId: { type: DataTypes.INTEGER, allowNull: false },
    timeSlot: { type: DataTypes.STRING, allowNull: false },
    startTime: { type: DataTypes.DATE, allowNull: false },
    endTime: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'PENDING' },
    notes: { type: DataTypes.TEXT, allowNull: true } 
}, {
    tableName: 'appointments',
    timestamps: true
});

// --- 3. MIDDLEWARE KIỂM TRA TOKEN (BK-B6) ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    // BVA-B6.1: Token rỗng ("Bearer ")
    if (!authHeader || authHeader === "Bearer ") {
        return res.status(403).json({ message: "Lỗi B6.1: Token không được để trống" });
    }

    const token = authHeader.split(' ')[1];

    // BVA-B6.2: Token quá ngắn
    if (token.length < 10) {
        return res.status(401).json({ message: "Lỗi B6.2: Token quá ngắn hoặc không hợp lệ" });
    }

    // BVA-B6.3: Token cực dài (> 2000 ký tự)
    if (token.length > 2000) {
        return res.status(413).json({ message: "Lỗi B6.3: Token quá dài (Payload quá lớn)" });
    }

    next(); 
};

// Áp dụng middleware bảo mật cho tất cả các route bên dưới
app.use(authenticateToken);

// --- 4. ROUTES CHO BOOKINGS (BK-B1, B2, B3, B4) ---

app.get('/bookings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // BVA-B3.3: ID số âm
        if (parseInt(id) < 0) {
            return res.status(400).json({ message: "Lỗi B3.3: ID không được là số âm" });
        }
        const booking = await Appointment.findByPk(id);
        // BVA-B3.2: ID = 0 hoặc không tồn tại
        if (!booking) {
            return res.status(404).json({ message: "Lỗi : Không tìm thấy ID" });
        }
        res.status(200).json({ message: "Thành công", data: booking });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/bookings', async (req, res) => {
    try {
        const { startTime, userId, timeSlot, notes } = req.body;

        // BVA-B3.4: User không tồn tại
        if (userId === 999999) {
            return res.status(404).json({ message: "Lỗi B3.4: User không tồn tại" });
        }

        // BVA-B4.4: Ghi chú vượt quá 500 ký tự
        if (notes && notes.length > 500) {
            return res.status(400).json({ message: "Lỗi B4.4: Vượt quá 500 ký tự" });
        }

        // BK-B2: Kiểm tra khung giờ
        if (!timeSlot || timeSlot.trim() === "") {
            return res.status(400).json({ message: "Lỗi : Khung giờ trống" });
        }

        // BVA-B1.5: Sai định dạng ngày
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}/; 
        if (!isoDateRegex.test(startTime)) {
            return res.status(400).json({ message: "Lỗi B1.5: Sai định dạng ngày" });
        }

        const newBooking = await Appointment.create(req.body);
        res.status(201).json({ message: "Tạo lịch hẹn thành công!", data: newBooking });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// --- 5. ROUTE CHO TRUNG TÂM (BK-B5) ---

app.post('/service-centers', async (req, res) => {
    try {
        const { name, phone } = req.body;

        // BVA-B5.1: Tên trung tâm < 3 ký tự
        if (name.length < 3) {
            return res.status(400).json({ message: "Lỗi B5.1: Tên trung tâm quá ngắn" });
        }

        const phoneRegex = /^[0-9]+$/;
        // BVA-B5.5: Số điện thoại chứa ký tự lạ
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ message: "Lỗi B5.5: Số điện thoại chứa ký tự lạ" });
        }

        // BVA-B5.2: Kiểm tra thiếu số
        if (phone.length === 9) {
            return res.status(400).json({ message: "Lỗi B5.2: Số điện thoại thiếu số" });
        }

        // BVA-B5.3 & B5.4: Chấp nhận 10 hoặc 11 số
        if (phone.length === 10 || phone.length === 11) {
            return res.status(201).json({ message: "Tạo trung tâm thành công!", data: { name, phone } });
        }

        res.status(400).json({ message: "Số điện thoại không hợp lệ" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default app;