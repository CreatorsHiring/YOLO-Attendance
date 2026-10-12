import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, CalendarDays, ScanFace, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';
import { getStudents, getSessions, checkHealth } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    enrolledStudents: 0,
    activeSessions: 0,
    totalSessions: 0,
  });
  const [recentSessions, setRecentSessions] = useState([]);
  const [healthInfo, setHealthInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [studentsRes, sessionsRes, healthRes] = await Promise.all([
          getStudents(),
          getSessions(),
          checkHealth().catch(() => ({ data: { status: 'offline', mlService: { isOnline: false } } }))
        ]);

        const students = studentsRes.data.data || [];
        const sessions = sessionsRes.data.data || [];

        const enrolledCount = students.filter((s) => s.enrollmentStatus === 'enrolled').length;
        const activeCount = sessions.filter((s) => s.status === 'active').length;

        setStats({
          totalStudents: students.length,
          enrolledStudents: enrolledCount,
          activeSessions: activeCount,
          totalSessions: sessions.length,
        });

        setRecentSessions(sessions.slice(0, 5));
        setHealthInfo(healthRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Hero Welcome */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Faculty Attendance Portal
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              ArcFace biometrics & instant classroom attendance matching
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/scanner"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm shadow-sm hover:bg-emerald-700 transition"
            >
              <ScanFace className="w-4 h-4 mr-2" />
              Launch Scanner
            </Link>
            <Link
              to="/enroll"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition"
            >
              Enroll Student
            </Link>
          </div>
        </div>

        {/* System Health Status Indicator */}
        <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-gray-800">Express Backend:</span>
            <span>Online (5000)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                healthInfo?.mlService?.isOnline ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            ></span>
            <span className="font-semibold text-gray-800">ML Engine (ArcFace):</span>
            <span>{healthInfo?.mlService?.isOnline ? 'Ready (8000)' : 'Connecting...'}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-gray-500">
            <Cpu className="w-3.5 h-3.5 text-emerald-600" />
            <span>Detector: RetinaFace / ArcFace 512-D</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Students</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-gray-900">
            {loading ? '-' : stats.totalStudents}
          </div>
          <p className="mt-1 text-xs text-gray-500">Registered in directory</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Biometrics Enrolled</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-gray-900">
            {loading ? '-' : stats.enrolledStudents}
          </div>
          <p className="mt-1 text-xs text-emerald-600 font-medium">
            {stats.totalStudents > 0
              ? `${Math.round((stats.enrolledStudents / stats.totalStudents) * 100)}% coverage`
              : '0% coverage'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Sessions</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-gray-900">
            {loading ? '-' : stats.activeSessions}
          </div>
          <p className="mt-1 text-xs text-amber-600 font-medium">Ready for live scans</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Sessions</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-gray-900">
            {loading ? '-' : stats.totalSessions}
          </div>
          <p className="mt-1 text-xs text-gray-500">Conducted to date</p>
        </div>
      </div>

      {/* Active & Recent Sessions */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Recent Attendance Sessions</h2>
          <Link to="/scanner" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center">
            New Session <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CalendarDays className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm">No attendance sessions recorded yet.</p>
            <Link
              to="/scanner"
              className="mt-3 inline-block px-4 py-2 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100"
            >
              Start First Attendance Session
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentSessions.map((session) => (
              <div key={session._id} className="py-3.5 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">{session.subject}</span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                      Class: {session.classId}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        session.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Started: {new Date(session.startedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-medium text-gray-600">
                    <strong className="text-emerald-600 font-bold">{session.presentCount || 0}</strong> marked present
                  </span>
                  <Link
                    to={`/report?sessionId=${session._id}`}
                    className="text-xs font-semibold px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                  >
                    View Report
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
