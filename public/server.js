// server.js — Real Database + File Upload Backend
// Inspired by Nagie’s Angels Educational Centre

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve uploaded files

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// File Upload Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// MongoDB Schemas
const StudentSchema = new mongoose.Schema({
  id: String,
  name: String,
  age: Number,
  class: String,
  level: String,
  region: String,
  parent: {
    name: String,
    phone: String,
    email: String
  },
  enrollmentDate: Date,
  attendance: String,
  photo: String,
  reportCard: Array
});

const NoticeSchema = new mongoose.Schema({
  title: String,
  message: String,
  postedBy: String,
  class: String,
  category: String,
  date: Date,
  expiry: Date,
  image: String
});

const ApplicationSchema = new mongoose.Schema({
  childName: String,
  dob: Date,
  program: String,
  parentName: String,
  phone: String,
  email: String,
  address: String,
  documents: Array,
  submittedAt: Date,
  status: String,
  loginEmail: String,
  loginPassword: String
});

const Student = mongoose.model('Student', StudentSchema);
const Notice = mongoose.model('Notice', NoticeSchema);
const Application = mongoose.model('Application', ApplicationSchema);

// API: Get All Applications (Admin)
app.get('/api/applications', async (req, res) => {
  try {
    const applications = await Application.find({ status: 'Pending' });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// API: Accept Application (Admin)
app.post('/api/applications/:id/accept', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Generate credentials
    const loginPassword = Math.random().toString(36).slice(-8);
    application.status = 'Accepted';
    application.loginEmail = application.email;
    application.loginPassword = loginPassword;
    await application.save();

    // Add to Students collection
    const newStudent = new Student({
      id: 'EZ' + Date.now().toString().slice(-6),
      name: application.childName,
      age: getAgeFromDOB(application.dob),
      class: application.program,
      level: getLevelFromProgram(application.program),
      region: 'Greater Accra', // Default - can be updated later
      parent: {
        name: application.parentName,
        phone: application.phone,
        email: application.email
      },
      enrollmentDate: new Date(),
      attendance: '100%',
      photo: '', // Can be uploaded later
      reportCard: []
    });
    await newStudent.save();

    // In real app, send email here
    console.log('📧 Sending acceptance email to:', application.email);

    res.json({ success: true, message: 'Application accepted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept application' });
  }
});

// API: Upload File
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ 
      success: true, 
      filePath: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname
    });
  } catch (error) {
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Helper Functions
function getAgeFromDOB(dob) {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function getLevelFromProgram(program) {
  if (program.includes('Pre-School')) return 'Pre-School';
  if (program.includes('Primary')) return 'Primary';
  if (program.includes('JHS')) return 'JHS';
  return 'Primary';
}

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log('🌐 MongoDB + File Upload system ready');
});