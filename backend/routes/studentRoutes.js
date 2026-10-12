const express = require('express');
const router = express.Router();
const {
  createStudent,
  getStudents,
  getStudentById
} = require('../controllers/studentController');
const { enrollStudentFace } = require('../controllers/enrollmentController');
const upload = require('../middleware/upload');

router.route('/')
  .post(createStudent)
  .get(getStudents);

router.route('/:studentId')
  .get(getStudentById);

router.route('/:studentId/enrollment')
  .post(upload.single('file'), enrollStudentFace);

module.exports = router;
