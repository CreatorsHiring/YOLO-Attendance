const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Enrollment = require('../models/Enrollment');
const { sendRecognitionImage } = require('../services/mlService');

// @desc    Process a face scan for an active session and return recognition candidate
// @route   POST /api/sessions/:sessionId/recognitions
const recognizeFaceInSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const similarityThreshold = parseFloat(req.body.similarityThreshold || '0.45');
    const ambiguityMargin = parseFloat(req.body.ambiguityMargin || '0.08');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No query face image provided. Please capture a clear image.'
      });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Attendance session not found.'
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This attendance session has already been closed. Scans cannot be accepted.'
      });
    }

    // Retrieve active students for this session's class
    const studentsInClass = await Student.find({ classId: session.classId }).lean();
    if (studentsInClass.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No students registered for class ${session.classId}.`
      });
    }

    const studentMap = new Map(studentsInClass.map(s => [s.studentId, s]));
    const studentIds = studentsInClass.map(s => s.studentId);

    // Retrieve their active enrolled embeddings
    const enrollments = await Enrollment.find({
      studentId: { $in: studentIds },
      status: 'active'
    }).lean();

    if (enrollments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No enrolled students with face biometric templates found for this class roster.'
      });
    }

    // Format candidates for ML matching: [{ studentId, name, embeddings: [...] }]
    const candidates = enrollments.map(enr => {
      const student = studentMap.get(enr.studentId);
      return {
        studentId: enr.studentId,
        name: student ? student.name : enr.studentId,
        embeddings: enr.embeddings.map(e => e.vector)
      };
    });

    // Send query image to ML service
    let mlResponse;
    try {
      mlResponse = await sendRecognitionImage(
        req.file.buffer,
        candidates,
        similarityThreshold,
        ambiguityMargin,
        req.file.originalname || 'query.jpg'
      );
    } catch (mlErr) {
      const status = mlErr.response?.status || 502;
      const detail = mlErr.response?.data?.detail || mlErr.message;
      return res.status(status).json({
        success: false,
        message: `ML Service Error: ${detail}`,
        serviceUnavailable: status >= 500
      });
    }

    // Check if the candidate has already been marked attendance in this session
    let alreadyMarked = false;
    let existingAttendance = null;
    if (mlResponse.candidate && mlResponse.candidate.studentId) {
      existingAttendance = await Attendance.findOne({
        sessionId: session._id,
        studentId: mlResponse.candidate.studentId
      }).lean();
      if (existingAttendance) {
        alreadyMarked = true;
      }
    }

    res.json({
      success: true,
      data: {
        status: mlResponse.status, // candidate, unknown, ambiguous, invalid_face
        candidate: mlResponse.candidate,
        secondBest: mlResponse.second_best,
        similarityScore: mlResponse.similarity_score,
        threshold: mlResponse.threshold,
        ambiguityMargin: mlResponse.ambiguity_margin,
        message: mlResponse.message,
        requiresReview: mlResponse.requires_review,
        modelVersion: mlResponse.model_version,
        faceCount: mlResponse.face_count,
        alreadyMarked,
        existingAttendance
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Record attendance for a student in a session
// @route   POST /api/sessions/:sessionId/attendance
const recordAttendance = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const {
      studentId,
      status = 'present',
      method = 'face-recognition',
      similarityScore,
      reviewStatus = 'faculty-confirmed'
    } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'studentId is required to record attendance'
      });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Attendance session not found.'
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Attendance cannot be recorded because this session is closed.'
      });
    }

    // Verify student is enrolled in the session's class
    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student '${studentId}' not found.`
      });
    }

    if (student.classId !== session.classId) {
      return res.status(400).json({
        success: false,
        message: `Student '${studentId}' belongs to class '${student.classId}', not session class '${session.classId}'.`
      });
    }

    // Check duplicate attendance gracefully
    const existing = await Attendance.findOne({ sessionId: session._id, studentId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Attendance already recorded for student ${student.name} (${studentId}) at ${existing.markedAt.toLocaleTimeString()}.`,
        data: existing
      });
    }

    try {
      const attendance = await Attendance.create({
        sessionId: session._id,
        studentId,
        status,
        markedAt: new Date(),
        method,
        similarityScore: similarityScore !== undefined ? Number(similarityScore) : undefined,
        reviewStatus,
        auditMetadata: {
          clientIp: req.ip,
          userAgent: req.headers['user-agent']
        }
      });

      res.status(201).json({
        success: true,
        message: `Attendance successfully marked for ${student.name} (${studentId}).`,
        data: {
          ...attendance.toObject(),
          studentName: student.name
        }
      });
    } catch (err) {
      // Handle MongoDB duplicate key error (code 11000) gracefully
      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: `Attendance already recorded for student ${studentId}.`
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Get session attendance list and counts
// @route   GET /api/sessions/:sessionId/attendance
const getSessionAttendance = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId).lean();

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Fetch all students in the class roster
    const allStudents = await Student.find({ classId: session.classId }).lean();
    
    // Fetch marked attendance records
    const attendanceRecords = await Attendance.find({ sessionId }).sort({ markedAt: -1 }).lean();
    const attendanceMap = new Map(attendanceRecords.map(a => [a.studentId, a]));

    const roster = allStudents.map(student => {
      const att = attendanceMap.get(student.studentId);
      return {
        studentId: student.studentId,
        name: student.name,
        classId: student.classId,
        section: student.section,
        status: att ? att.status : 'absent',
        markedAt: att ? att.markedAt : null,
        method: att ? att.method : null,
        similarityScore: att ? att.similarityScore : null,
        reviewStatus: att ? att.reviewStatus : null
      };
    });

    const presentCount = roster.filter(s => s.status === 'present').length;
    const absentCount = roster.filter(s => s.status === 'absent').length;

    res.json({
      success: true,
      data: {
        session,
        counts: {
          total: roster.length,
          present: presentCount,
          absent: absentCount
        },
        roster,
        records: attendanceRecords
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  recognizeFaceInSession,
  recordAttendance,
  getSessionAttendance
};
