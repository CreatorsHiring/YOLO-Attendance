const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Student = require('./models/Student');
const Enrollment = require('./models/Enrollment');
const Session = require('./models/Session');
const Attendance = require('./models/Attendance');

let mongoServer;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test.beforeEach(async () => {
  await Student.deleteMany({});
  await Enrollment.deleteMany({});
  await Session.deleteMany({});
  await Attendance.deleteMany({});
});

test('1. Student can be registered with ID, name, classId, and section', async () => {
  const student = await Student.create({
    studentId: 'STU001',
    name: 'Alice Cooper',
    classId: 'CS-401',
    section: 'A'
  });

  assert.equal(student.studentId, 'STU001');
  assert.equal(student.name, 'Alice Cooper');
  assert.equal(student.enrollmentStatus, 'pending');
});

test('2. Duplicate student ID cannot be registered', async () => {
  await Student.create({
    studentId: 'STU001',
    name: 'Alice Cooper',
    classId: 'CS-401',
    section: 'A'
  });

  await assert.rejects(
    async () => {
      await Student.create({
        studentId: 'STU001',
        name: 'Alice Duplicate',
        classId: 'CS-401',
        section: 'B'
      });
    },
    (err) => {
      return err.code === 11000;
    }
  );
});

test('3. Enrolled face embeddings can be stored with 512 dimensions and consent', async () => {
  const dummyEmbedding = Array.from({ length: 512 }, () => Math.random());

  const enrollment = await Enrollment.create({
    studentId: 'STU001',
    embeddings: [{ vector: dummyEmbedding, sampleIndex: 1 }],
    modelVersion: 'buffalo_s-arcface-512',
    consentGiven: true,
    status: 'active'
  });

  assert.equal(enrollment.studentId, 'STU001');
  assert.equal(enrollment.embeddings.length, 1);
  assert.equal(enrollment.embeddings[0].vector.length, 512);
  assert.equal(enrollment.consentGiven, true);
});

test('4. Attendance can be recorded once for a session and student', async () => {
  const session = await Session.create({
    classId: 'CS-401',
    subject: 'AI Lab'
  });

  const attendance = await Attendance.create({
    sessionId: session._id,
    studentId: 'STU001',
    status: 'present',
    similarityScore: 0.88,
    method: 'face-recognition'
  });

  assert.equal(attendance.studentId, 'STU001');
  assert.equal(attendance.status, 'present');
});

test('5. Duplicate attendance for same session and student is prevented by unique index', async () => {
  const session = await Session.create({
    classId: 'CS-401',
    subject: 'AI Lab'
  });

  await Attendance.create({
    sessionId: session._id,
    studentId: 'STU001',
    status: 'present',
    similarityScore: 0.88
  });

  await assert.rejects(
    async () => {
      await Attendance.create({
        sessionId: session._id,
        studentId: 'STU001',
        status: 'present'
      });
    },
    (err) => {
      return err.code === 11000;
    }
  );
});

test('6. Session closure updates status to closed', async () => {
  const session = await Session.create({
    classId: 'CS-401',
    subject: 'AI Lab',
    status: 'active'
  });

  session.status = 'closed';
  session.endedAt = new Date();
  await session.save();

  const fetched = await Session.findById(session._id);
  assert.equal(fetched.status, 'closed');
  assert.ok(fetched.endedAt instanceof Date);
});
