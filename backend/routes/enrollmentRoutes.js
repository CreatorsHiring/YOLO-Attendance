const express = require('express');
const router = express.Router();
const { enrollStudentFace } = require('../controllers/enrollmentController');
const upload = require('../middleware/upload');

router.post('/:studentId', upload.single('file'), enrollStudentFace);

module.exports = router;
