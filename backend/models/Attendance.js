const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true
    },
    studentId: {
      type: String,
      ref: 'Student',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'present'
    },
    markedAt: {
      type: Date,
      default: Date.now
    },
    method: {
      type: String,
      enum: ['face-recognition', 'manual'],
      default: 'face-recognition'
    },
    similarityScore: {
      type: Number,
      min: 0,
      max: 1
    },
    reviewStatus: {
      type: String,
      enum: ['auto-approved', 'faculty-confirmed', 'overridden'],
      default: 'faculty-confirmed'
    },
    auditMetadata: {
      clientIp: String,
      userAgent: String,
      modelVersion: String
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index to prevent duplicate attendance within the same session
attendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
