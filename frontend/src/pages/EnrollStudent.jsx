import { useState, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { createStudent, enrollStudentFace } from '../services/api';

export default function EnrollStudent() {
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    classId: 'CS-401',
    section: 'A',
  });

  const [consentGiven, setConsentGiven] = useState(true);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [enrollmentDetails, setEnrollmentDetails] = useState(null);

  const {
    videoRef,
    isReady,
    permissionState,
    errorMessage: cameraError,
    startCamera,
    stopCamera,
    toggleFacingMode,
    capturePhotoBlob,
  } = useCamera();

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = async () => {
    const photo = await capturePhotoBlob();
    if (photo) {
      setCapturedPhoto(photo);
      setStatusMessage(null);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setStatusMessage(null);
    setEnrollmentDetails(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.studentId || !formData.name || !formData.classId || !formData.section) {
      setStatusMessage({ type: 'error', text: 'Please fill in all student details.' });
      return;
    }

    if (!capturedPhoto) {
      setStatusMessage({ type: 'error', text: 'Please capture a student face photo using the camera.' });
      return;
    }

    if (!consentGiven) {
      setStatusMessage({
        type: 'error',
        text: 'Biometric enrollment requires student/faculty consent before template storage.'
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      // 1. Ensure student profile exists or is created
      try {
        await createStudent({
          studentId: formData.studentId.trim(),
          name: formData.name.trim(),
          classId: formData.classId.trim(),
          section: formData.section.trim(),
        });
      } catch (err) {
        // If 409 conflict, student already exists; continue to enroll face
        if (err.response?.status !== 409) {
          throw new Error(err.response?.data?.message || 'Failed to create student record');
        }
      }

      // 2. Submit photo to Express -> ML Service for validation and 512-D ArcFace embedding
      const enrollForm = new FormData();
      enrollForm.append('file', capturedPhoto.blob, `${formData.studentId}_face.jpg`);
      enrollForm.append('consentGiven', 'true');

      const res = await enrollStudentFace(formData.studentId.trim(), enrollForm);

      setStatusMessage({
        type: 'success',
        text: `Student ${formData.name} successfully enrolled with ArcFace biometrics!`
      });
      setEnrollmentDetails(res.data.data);
    } catch (err) {
      console.error('Enrollment error:', err);
      const msg = err.response?.data?.message || err.message || 'Face enrollment failed.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Biometric Enrollment</h1>
        <p className="text-sm text-gray-500 mt-1">
          Register student profile and extract ArcFace 512-D facial feature embeddings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left: Camera Capture Box */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-800 flex items-center">
              <Camera className="w-4 h-4 mr-1.5 text-emerald-600" /> Face Camera
            </span>
            <button
              type="button"
              onClick={toggleFacingMode}
              className="text-xs px-2.5 py-1 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg"
            >
              Flip Camera
            </button>
          </div>

          <div className="relative aspect-4/3 bg-gray-950 rounded-xl overflow-hidden flex items-center justify-center">
            {capturedPhoto ? (
              <img
                src={capturedPhoto.dataUrl}
                alt="Captured Face"
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                {!isReady && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-white text-xs">
                    Initializing camera stream...
                  </div>
                )}
                {/* Face Alignment Overlay Guide */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-56 border-2 border-dashed border-emerald-400/80 rounded-full flex items-center justify-center">
                    <span className="text-[10px] text-emerald-200 bg-black/40 px-2 py-0.5 rounded-full mt-24">
                      Fit face inside oval
                    </span>
                  </div>
                </div>
              </>
            )}

            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/90 text-white p-4 text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                <p className="text-xs">{cameraError}</p>
                <button
                  onClick={() => startCamera()}
                  className="mt-3 px-3 py-1 bg-red-800 rounded-lg text-xs hover:bg-red-700"
                >
                  Retry Camera
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!capturedPhoto ? (
              <button
                type="button"
                onClick={handleCapture}
                disabled={!isReady}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl font-medium text-sm transition flex items-center justify-center shadow-xs"
              >
                <Camera className="w-4 h-4 mr-2" />
                Capture Face Photo
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRetake}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retake Photo
              </button>
            )}
          </div>

          <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-1">
            <p className="font-semibold text-gray-700">Quality Checklist:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Exactly one face centered in frame</li>
              <li>Good lighting, no glare or deep shadows</li>
              <li>Neutral expression facing forward</li>
            </ul>
          </div>
        </div>

        {/* Right: Student Information & Consent Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
            Student Profile Details
          </h2>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Student ID / Roll Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. STU-2026-001"
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Full Legal Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Johnson"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Class / Course *
              </label>
              <input
                type="text"
                required
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Section *
              </label>
              <input
                type="text"
                required
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              />
            </div>
          </div>

          {/* Biometric Privacy & Consent Notice */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5">
            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-0.5 rounded-sm border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-emerald-950 leading-relaxed">
                <strong>Biometric Consent:</strong> I verify student permission to capture face features. Facial features are converted to numerical ArcFace embeddings (512 dimensions) solely for university attendance matching.
              </span>
            </label>
          </div>

          {/* Feedback Messages */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start space-x-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-red-50 text-red-900 border border-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Enrollment Success Details Card */}
          {enrollmentDetails && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 space-y-1">
              <div className="font-semibold text-emerald-700 flex items-center">
                <UserCheck className="w-4 h-4 mr-1.5" /> Biometric Record Stored
              </div>
              <p>Model Version: <span className="font-mono">{enrollmentDetails.modelVersion}</span></p>
              <p>Stored Samples: {enrollmentDetails.sampleCount}</p>
              <p>Status: <span className="capitalize font-semibold text-emerald-600">{enrollmentDetails.enrollmentStatus}</span></p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !capturedPhoto}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl font-medium text-sm shadow-xs transition flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Validating & Extracting Embedding...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Enroll & Save Student
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
