const axios = require('axios');
const FormData = require('form-data');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
const ML_SERVICE_TOKEN = process.env.ML_SERVICE_TOKEN || 'internal_secret_token_face_rec';

const checkMLHealth = async () => {
  try {
    const res = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 3000 });
    return { isOnline: true, data: res.data };
  } catch (err) {
    return { isOnline: false, error: err.message };
  }
};

const sendEnrollmentImage = async (fileBuffer, originalName = 'face.jpg') => {
  const form = new FormData();
  form.append('file', fileBuffer, { filename: originalName, contentType: 'image/jpeg' });

  const response = await axios.post(`${ML_SERVICE_URL}/internal/enroll`, form, {
    headers: {
      ...form.getHeaders(),
      'x-service-token': ML_SERVICE_TOKEN
    },
    timeout: 10000
  });

  return response.data;
};

const sendRecognitionImage = async (
  fileBuffer,
  candidates,
  similarityThreshold = 0.45,
  ambiguityMargin = 0.08,
  originalName = 'query.jpg'
) => {
  const form = new FormData();
  form.append('file', fileBuffer, { filename: originalName, contentType: 'image/jpeg' });
  form.append('candidates', JSON.stringify(candidates));
  form.append('similarity_threshold', String(similarityThreshold));
  form.append('ambiguity_margin', String(ambiguityMargin));

  const response = await axios.post(`${ML_SERVICE_URL}/internal/recognize`, form, {
    headers: {
      ...form.getHeaders(),
      'x-service-token': ML_SERVICE_TOKEN
    },
    timeout: 10000
  });

  return response.data;
};

module.exports = {
  checkMLHealth,
  sendEnrollmentImage,
  sendRecognitionImage
};
