const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, 'Student ID / Roll number is required'],
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Student full name is required'],
      trim: true
    },
    classId: {
      type: String,
      required: [true, 'Class ID is required'],
      trim: true,
      index: true
    },
    section: {
      type: String,
      required: [true, 'Section is required'],
      trim: true
    },
    enrollmentStatus: {
      type: String,
      enum: ['pending', 'enrolled', 'suspended'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Student', studentSchema);
