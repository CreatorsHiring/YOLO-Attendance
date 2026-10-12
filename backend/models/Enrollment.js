const mongoose = require('mongoose');

const embeddingSampleSchema = new mongoose.Schema({
  vector: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length === 512;
      },
      message: 'Embedding vector must be a 512-dimensional array'
    }
  },
  sampleIndex: {
    type: Number,
    default: 1
  },
  capturedAt: {
    type: Date,
    default: Date.now
  }
});

const enrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      ref: 'Student',
      unique: true,
      index: true
    },
    embeddings: [embeddingSampleSchema],
    modelVersion: {
      type: String,
      required: true,
      default: 'buffalo_s-arcface-512'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'revoked'],
      default: 'active'
    },
    consentGiven: {
      type: Boolean,
      required: true,
      default: true
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Enrollment', enrollmentSchema);
