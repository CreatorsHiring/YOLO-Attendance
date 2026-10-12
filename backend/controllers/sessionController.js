const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');

// @desc    Create and start a new session
// @route   POST /api/sessions
const createSession = async (req, res, next) => {
  try {
    const { classId, subject, createdByFaculty = 'Faculty' } = req.body;

    if (!classId || !subject) {
      return res.status(400).json({
        success: false,
        message: 'classId and subject are required to start an attendance session'
      });
    }

    const session = await Session.create({
      classId: classId.trim(),
      subject: subject.trim(),
      status: 'active',
      startedAt: new Date(),
      createdByFaculty
    });

    res.status(201).json({
      success: true,
      data: session
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List sessions
// @route   GET /api/sessions
const getSessions = async (req, res, next) => {
  try {
    const { classId, status } = req.query;
    const query = {};
    if (classId) query.classId = classId;
    if (status) query.status = status;

    const sessions = await Session.find(query).sort({ startedAt: -1 }).lean();

    // Attach present count to each session
    const sessionIds = sessions.map(s => s._id);
    const counts = await Attendance.aggregate([
      { $match: { sessionId: { $in: sessionIds }, status: 'present' } },
      { $group: { _id: '$sessionId', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(counts.map(c => [String(c._id), c.count]));

    const result = sessions.map(s => ({
      ...s,
      presentCount: countMap.get(String(s._id)) || 0
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get session details
// @route   GET /api/sessions/:sessionId
const getSessionById = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId).lean();

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Get total eligible students in class
    const totalStudents = await Student.countDocuments({ classId: session.classId });
    const presentCount = await Attendance.countDocuments({ sessionId: session._id, status: 'present' });

    res.json({
      success: true,
      data: {
        ...session,
        totalStudents,
        presentCount,
        absentCount: Math.max(0, totalStudents - presentCount)
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Close an active session
// @route   POST /api/sessions/:sessionId/close
const closeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    session.status = 'closed';
    session.endedAt = new Date();
    await session.save();

    res.json({
      success: true,
      message: 'Attendance session successfully closed.',
      data: session
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSession,
  getSessions,
  getSessionById,
  closeSession
};
