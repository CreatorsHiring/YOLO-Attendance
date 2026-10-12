import { useState, useEffect, useRef } from 'react';
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Play,
  Square,
  Users,
  Check,
  UserX,
  Volume2
} from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import {
  getSessions,
  createSession,
  closeSession,
  recognizeFace,
  recordAttendance,
  getSessionAttendance
} from '../services/api';

export default function AttendanceScanner() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [sessionStats, setSessionStats] = useState({ total: 0, present: 0, absent: 0 });
  const [recognizedStudentsList, setRecognizedStudentsList] = useState([]);

  // Session Creation Modal/Form state
  const [newClassId, setNewClassId] = useState('CS-401');
  const [newSubject, setNewSubject] = useState('Computer Vision & AI');
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Recognition States
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // Result from ML service
  const [isMarking, setIsMarking] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Threshold configurations
  const [threshold, setThreshold] = useState(0.45);
  const [autoMarkEnabled, setAutoMarkEnabled] = useState(false);

  const {
    videoRef,
    isReady,
    errorMessage: cameraError,
    startCamera,
    stopCamera,
    toggleFacingMode,
    capturePhotoBlob
  } = useCamera();

  // Load Sessions
  const loadSessions = async () => {
    try {
      const res = await getSessions();
      const all = res.data.data || [];
      setSessions(all);
      // Auto-select first active session if available
      const active = all.find((s) => s.status === 'active');
      if (active && !selectedSessionId) {
        setSelectedSessionId(active._id);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  useEffect(() => {
    loadSessions();
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Load Session details & attendance when selectedSessionId changes
  const loadActiveSessionData = async (id) => {
    if (!id) return;
    try {
      const res = await getSessionAttendance(id);
      const data = res.data.data;
      setActiveSession(data.session);
      setSessionStats(data.counts);
      setRecognizedStudentsList(data.records || []);
    } catch (err) {
      console.error('Failed to load session attendance data:', err);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      loadActiveSessionData(selectedSessionId);
    }
  }, [selectedSessionId]);

  // Create New Session
  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      const res = await createSession({
        classId: newClassId,
        subject: newSubject,
        createdByFaculty: 'Prof. Miller'
      });
      const created = res.data.data;
      await loadSessions();
      setSelectedSessionId(created._id);
      setIsCreatingSession(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start session');
    }
  };

  // Close Active Session
  const handleCloseSession = async () => {
    if (!selectedSessionId) return;
    if (!window.confirm('Are you sure you want to close this attendance session? No more scans will be accepted.')) return;
    try {
      await closeSession(selectedSessionId);
      await loadSessions();
      await loadActiveSessionData(selectedSessionId);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close session');
    }
  };

  // Trigger Face Scan & Match
  const handleScanFace = async () => {
    if (!selectedSessionId) {
      setFeedbackMessage({ type: 'error', text: 'Please select or start an active attendance session first.' });
      return;
    }
    if (activeSession?.status !== 'active') {
      setFeedbackMessage({ type: 'error', text: 'Selected session is closed. Start a new session to record attendance.' });
      return;
    }

    setIsScanning(true);
    setScanResult(null);
    setFeedbackMessage(null);

    const photo = await capturePhotoBlob();
    if (!photo) {
      setIsScanning(false);
      setFeedbackMessage({ type: 'error', text: 'Camera capture failed. Please check camera access.' });
      return;
    }

    try {
      const form = new FormData();
      form.append('file', photo.blob, 'scan.jpg');
      form.append('similarityThreshold', String(threshold));

      const res = await recognizeFace(selectedSessionId, form);
      const data = res.data.data;
      setScanResult(data);

      // Automatic marking if policy enabled and candidate is reliable
      if (
        autoMarkEnabled &&
        data.status === 'candidate' &&
        data.candidate &&
        !data.alreadyMarked &&
        !data.requiresReview
      ) {
        await handleConfirmAttendance(data.candidate.studentId, data.similarityScore, 'auto-approved');
      }
    } catch (err) {
      console.error('Scan error:', err);
      const msg = err.response?.data?.message || 'Face recognition service failed.';
      setFeedbackMessage({ type: 'error', text: msg });
    } finally {
      setIsScanning(false);
    }
  };

  // Confirm and Commit Attendance Record
  const handleConfirmAttendance = async (studentId, score, reviewStatus = 'faculty-confirmed') => {
    if (!selectedSessionId || !studentId) return;
    setIsMarking(true);
    try {
      const res = await recordAttendance(selectedSessionId, {
        studentId,
        similarityScore: score,
        reviewStatus,
        method: 'face-recognition'
      });
      setFeedbackMessage({
        type: 'success',
        text: `Attendance recorded for ${res.data.data.studentName || studentId}!`
      });
      // Refresh counts and scan result
      setScanResult((prev) => (prev ? { ...prev, alreadyMarked: true } : null));
      await loadActiveSessionData(selectedSessionId);
    } catch (err) {
      console.error('Confirm attendance error:', err);
      const msg = err.response?.data?.message || 'Failed to record attendance.';
      setFeedbackMessage({ type: 'error', text: msg });
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Top Header & Session Controls */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Live Attendance Scanner</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Instant ArcFace facial recognition with duplicate protection
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Session Selector */}
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-xl bg-white font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-hidden"
            >
              <option value="">-- Choose Attendance Session --</option>
              {sessions.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.classId}: {s.subject} ({s.status.toUpperCase()})
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsCreatingSession(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center shadow-xs"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" /> Start New Session
            </button>

            {activeSession && activeSession.status === 'active' && (
              <button
                onClick={handleCloseSession}
                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center"
              >
                <Square className="w-3.5 h-3.5 mr-1" /> End Session
              </button>
            )}
          </div>
        </div>

        {/* Live Counters */}
        {activeSession && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-900">{activeSession.subject}</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-mono text-xs">
                {activeSession.classId}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  activeSession.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {activeSession.status}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div>
                <span className="text-gray-500 text-xs">Total Roster:</span>{' '}
                <strong className="text-gray-900">{sessionStats.total}</strong>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Present:</span>{' '}
                <strong className="text-emerald-600">{sessionStats.present}</strong>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Remaining:</span>{' '}
                <strong className="text-amber-600">{sessionStats.absent}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Scanner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Camera & Trigger (Mobile First) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Live Camera Feed</span>
              </div>
              <button
                onClick={toggleFacingMode}
                className="text-xs px-2.5 py-1 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg"
              >
                Flip Front/Back
              </button>
            </div>

            {/* Video Viewport */}
            <div className="relative aspect-4/3 sm:aspect-16/10 bg-gray-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Scanning Target Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div
                  className={`w-52 h-64 border-2 rounded-3xl transition-colors duration-300 flex items-center justify-center ${
                    isScanning
                      ? 'border-emerald-400 bg-emerald-500/10 animate-pulse'
                      : scanResult?.status === 'candidate'
                      ? 'border-emerald-500 bg-emerald-500/5'
                      : scanResult?.status === 'unknown'
                      ? 'border-amber-500'
                      : 'border-white/40'
                  }`}
                >
                  {isScanning && (
                    <div className="text-xs text-white bg-black/60 px-3 py-1 rounded-full font-medium flex items-center">
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Matching ArcFace vector...
                    </div>
                  )}
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 text-white p-4 text-center">
                  <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                  <p className="text-xs">{cameraError}</p>
                  <button
                    onClick={() => startCamera()}
                    className="mt-3 px-3.5 py-1.5 bg-emerald-700 rounded-xl text-xs hover:bg-emerald-600"
                  >
                    Reconnect Camera
                  </button>
                </div>
              )}
            </div>

            {/* Primary Action Controls */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleScanFace}
                disabled={isScanning || !isReady || activeSession?.status !== 'active'}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl font-bold text-sm sm:text-base shadow-sm transition flex items-center justify-center"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing Face...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    Scan Student Face
                  </>
                )}
              </button>
            </div>

            {/* Recognition Threshold & Auto-Confirm Tuning */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Cosine Match Threshold:</span>
                <span className="font-mono font-bold text-emerald-700">{threshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.80"
                step="0.02"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoMarkEnabled}
                    onChange={(e) => setAutoMarkEnabled(e.target.checked)}
                    className="rounded-sm border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-gray-700 font-medium">Auto-confirm matches above threshold</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recognition Result Card & Live Session Attendance */}
        <div className="lg:col-span-5 space-y-4">
          {/* Recognition Result Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600 border-b border-gray-100 pb-2.5">
              Recognition Inspection
            </h2>

            {!scanResult ? (
              <div className="py-8 text-center text-gray-400">
                <Camera className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-xs">No scan performed yet. Position student face and click "Scan Student Face".</p>
              </div>
            ) : (
              <div className="mt-3 space-y-3.5">
                {/* Result Status Banner */}
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start space-x-2.5 ${
                    scanResult.status === 'candidate'
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
                      : scanResult.status === 'ambiguous'
                      ? 'bg-amber-50 text-amber-950 border-amber-200'
                      : 'bg-red-50 text-red-950 border-red-200'
                  }`}
                >
                  {scanResult.status === 'candidate' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : scanResult.status === 'ambiguous' ? (
                    <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="capitalize font-bold">{scanResult.status}: </strong>
                    <span>{scanResult.message}</span>
                  </div>
                </div>

                {/* Candidate details if found */}
                {scanResult.candidate && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">Candidate Match</span>
                      <span className="font-mono text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                        Cosine Sim: {scanResult.similarityScore}
                      </span>
                    </div>

                    <div className="text-base font-bold text-gray-900">
                      {scanResult.candidate.name || scanResult.candidate.studentId}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      Student ID: {scanResult.candidate.studentId}
                    </div>

                    {scanResult.secondBest && (
                      <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-200">
                        Second-best: <span className="font-semibold">{scanResult.secondBest.name}</span> (score: {scanResult.secondBest.similarity})
                      </div>
                    )}

                    {/* Duplicate Status Feedback */}
                    {scanResult.alreadyMarked && (
                      <div className="p-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold">
                        Already Marked Present for this session.
                      </div>
                    )}

                    {/* Commit Attendance Action Button */}
                    {!scanResult.alreadyMarked && (
                      <button
                        type="button"
                        onClick={() =>
                          handleConfirmAttendance(
                            scanResult.candidate.studentId,
                            scanResult.similarityScore,
                            'faculty-confirmed'
                          )
                        }
                        disabled={isMarking}
                        className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center shadow-xs"
                      >
                        {isMarking ? (
                          <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-1.5" />
                        )}
                        Confirm Attendance for {scanResult.candidate.name || scanResult.candidate.studentId}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* General Feedback Alert */}
            {feedbackMessage && (
              <div
                className={`mt-3 p-3 rounded-xl text-xs font-medium ${
                  feedbackMessage.type === 'success'
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-red-100 text-red-900'
                }`}
              >
                {feedbackMessage.text}
              </div>
            )}
          </div>

          {/* Session Attendance List (Latest Scans) */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center justify-between">
              <span>Scanned During Session ({recognizedStudentsList.length})</span>
              <Users className="w-4 h-4 text-gray-400" />
            </h3>

            {recognizedStudentsList.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No students scanned yet.</p>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 text-xs">
                {recognizedStudentsList.map((rec) => (
                  <div key={rec._id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-900">{rec.studentId}</span>
                      <span className="text-[10px] text-gray-400 ml-2">
                        {new Date(rec.markedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-[10px] text-gray-500">
                        {rec.similarityScore ? `sim: ${rec.similarityScore}` : rec.method}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                        Present
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Start New Attendance Session */}
      {isCreatingSession && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSession}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4"
          >
            <h2 className="text-lg font-bold text-gray-900">Start Attendance Session</h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Class / Course ID</label>
              <input
                type="text"
                required
                value={newClassId}
                onChange={(e) => setNewClassId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Subject / Session Topic</label>
              <input
                type="text"
                required
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingSession(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
              >
                Create & Begin Scanning
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
