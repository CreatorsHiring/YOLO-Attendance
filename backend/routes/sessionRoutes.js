const express = require('express');
const router = express.Router();
const {
  createSession,
  getSessions,
  getSessionById,
  closeSession
} = require('../controllers/sessionController');
const {
  recognizeFaceInSession,
  recordAttendance,
  getSessionAttendance
} = require('../controllers/attendanceController');
const upload = require('../middleware/upload');

router.route('/')
  .post(createSession)
  .get(getSessions);

router.route('/:sessionId')
  .get(getSessionById);

router.post('/:sessionId/close', closeSession);

// Recognition and attendance sub-routes
router.post('/:sessionId/recognitions', upload.single('file'), recognizeFaceInSession);
router.route('/:sessionId/attendance')
  .post(recordAttendance)
  .get(getSessionAttendance);

module.exports = router;
