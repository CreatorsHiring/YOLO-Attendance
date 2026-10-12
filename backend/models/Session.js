const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    classId: {
      type: String,
      required: [true, 'Class ID is required'],
      trim: true,
      index: true
    },
    subject: {
      type: String,
      required: [true, 'Subject or session title is required'],
      trim: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
      index: true
    },
    createdByFaculty: {
      type: String,
      default: 'Faculty'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Session', sessionSchema);
