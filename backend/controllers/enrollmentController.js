const Student = require('../models/Student');
const Enrollment = require('../models/Enrollment');
const { sendEnrollmentImage } = require('../services/mlService');

// @desc    Generate or append enrollment embeddings for a student
// @route   POST /api/students/:studentId/enrollment
const enrollStudentFace = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { consentGiven = 'true', appendSample = 'false' } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded. Please capture a clear face image.'
      });
    }

    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student '${studentId}' does not exist. Please register the student profile first.`
      });
    }


    // Call internal FastAPI ML service to detect face and compute ArcFace embedding
    let mlResponse;
    try {
      mlResponse = await sendEnrollmentImage(req.file.buffer, req.file.originalname || 'enroll.jpg');
    } catch (mlErr) {
      const status = mlErr.response?.status || 502;
      const detail = mlErr.response?.data?.detail || mlErr.message;
      return res.status(status).json({
        success: false,
        message: `ML Service Error: ${detail}`,
        serviceUnavailable: status >= 500
      });
    }

    if (!mlResponse.success) {
      return res.status(422).json({
        success: false,
        faceCount: mlResponse.face_count,
        message: mlResponse.message
      });
    }

    const embeddingVector = mlResponse.embedding;
    const modelVersion = mlResponse.model_version;

    let enrollment = await Enrollment.findOne({ studentId });

    if (enrollment && appendSample === 'true') {
      enrollment.embeddings.push({
        vector: embeddingVector,
        sampleIndex: enrollment.embeddings.length + 1,
        capturedAt: new Date()
      });
      enrollment.modelVersion = modelVersion;
      enrollment.consentGiven = true;
      enrollment.status = 'active';
      await enrollment.save();
    } else {
      // Create new or overwrite existing enrollment
      if (enrollment) {
        enrollment.embeddings = [{
          vector: embeddingVector,
          sampleIndex: 1,
          capturedAt: new Date()
        }];
        enrollment.modelVersion = modelVersion;
        enrollment.consentGiven = true;
        enrollment.status = 'active';
        enrollment.enrolledAt = new Date();
        await enrollment.save();
      } else {
        enrollment = await Enrollment.create({
          studentId,
          embeddings: [{
            vector: embeddingVector,
            sampleIndex: 1,
            capturedAt: new Date()
          }],
          modelVersion,
          status: 'active',
          consentGiven: true,
          enrolledAt: new Date()
        });
      }
    }

    // Update student enrollment status
    student.enrollmentStatus = 'enrolled';
    await student.save();

    res.status(200).json({
      success: true,
      message: 'Student face successfully enrolled and ArcFace embedding stored.',
      data: {
        studentId: student.studentId,
        name: student.name,
        enrollmentStatus: student.enrollmentStatus,
        sampleCount: enrollment.embeddings.length,
        modelVersion: enrollment.modelVersion,
        box: mlResponse.box,
        enrolledAt: enrollment.enrolledAt
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  enrollStudentFace
};
