const Student = require('../models/Student');
const Enrollment = require('../models/Enrollment');
const Attendance = require('../models/Attendance');

// @desc    Create a new student
// @route   POST /api/students
const createStudent = async (req, res, next) => {
  try {
    const { studentId, name, classId, section } = req.body;

    if (!studentId || !name || !classId || !section) {
      return res.status(400).json({
        success: false,
        message: 'studentId, name, classId, and section are required'
      });
    }

    const existing = await Student.findOne({ studentId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Student with ID '${studentId}' already exists.`
      });
    }

    const student = await Student.create({
      studentId: studentId.trim(),
      name: name.trim(),
      classId: classId.trim(),
      section: section.trim(),
      enrollmentStatus: 'pending'
    });

    res.status(201).json({
      success: true,
      data: student
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all students
// @route   GET /api/students
const getStudents = async (req, res, next) => {
  try {
    const { classId, section, search } = req.query;
    const query = {};

    if (classId) query.classId = classId;
    if (section) query.section = section;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.find(query).sort({ studentId: 1 }).lean();
    
    // Attach enrollment info
    const studentIds = students.map(s => s.studentId);
    const enrollments = await Enrollment.find({ studentId: { $in: studentIds } }).lean();
    const enrollmentMap = new Map(enrollments.map(e => [e.studentId, e]));

    const result = students.map(s => {
      const enr = enrollmentMap.get(s.studentId);
      return {
        ...s,
        enrollmentCount: enr ? enr.embeddings.length : 0,
        enrolledAt: enr ? enr.enrolledAt : null,
        modelVersion: enr ? enr.modelVersion : null
      };
    });

    res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get student by ID
// @route   GET /api/students/:studentId
const getStudentById = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findOne({ studentId }).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student '${studentId}' not found.`
      });
    }

    const enrollment = await Enrollment.findOne({ studentId }).lean();

    res.json({
      success: true,
      data: {
        ...student,
        enrollment: enrollment ? {
          sampleCount: enrollment.embeddings.length,
          modelVersion: enrollment.modelVersion,
          status: enrollment.status,
          enrolledAt: enrollment.enrolledAt
        } : null
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createStudent,
  getStudents,
  getStudentById
};
