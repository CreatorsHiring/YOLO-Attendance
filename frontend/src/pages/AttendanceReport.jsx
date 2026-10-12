import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, CheckCircle2, XCircle, Clock, Calendar, Users, FileSpreadsheet } from 'lucide-react';
import { getSessions, getSessionAttendance, recordAttendance } from '../services/api';

export default function AttendanceReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(searchParams.get('sessionId') || '');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await getSessions();
        const list = res.data.data || [];
        setSessions(list);
        if (!selectedSessionId && list.length > 0) {
          setSelectedSessionId(list[0]._id);
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
      }
    }
    fetchSessions();
  }, []);

  const fetchReport = async (sessionId) => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const res = await getSessionAttendance(sessionId);
      setReportData(res.data.data);
    } catch (err) {
      console.error('Failed to load attendance report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      setSearchParams({ sessionId: selectedSessionId });
      fetchReport(selectedSessionId);
    }
  }, [selectedSessionId]);

  // Manual Attendance Toggle (Faculty override)
  const handleManualToggle = async (studentId, currentStatus) => {
    if (!selectedSessionId) return;
    const newStatus = currentStatus === 'present' ? 'absent' : 'present';
    try {
      await recordAttendance(selectedSessionId, {
        studentId,
        status: newStatus,
        method: 'manual',
        reviewStatus: 'overridden'
      });
      fetchReport(selectedSessionId);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update attendance');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!reportData || !reportData.roster) return;

    const session = reportData.session;
    const rows = [
      ['Session Subject', session.subject],
      ['Class ID', session.classId],
      ['Started At', new Date(session.startedAt).toLocaleString()],
      ['Status', session.status],
      [],
      ['Student ID', 'Student Name', 'Section', 'Status', 'Marked At', 'Method', 'Similarity Score', 'Review Status']
    ];

    reportData.roster.forEach((item) => {
      rows.push([
        item.studentId,
        item.name,
        item.section,
        item.status.toUpperCase(),
        item.markedAt ? new Date(item.markedAt).toLocaleTimeString() : 'N/A',
        item.method || 'N/A',
        item.similarityScore || 'N/A',
        item.reviewStatus || 'N/A'
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${session.classId}_${session.subject.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Session Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Audit logs, student roster presence, and CSV export for institutional records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="px-3.5 py-2 text-sm border border-gray-300 rounded-xl bg-white font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-hidden"
          >
            <option value="">-- Choose Session --</option>
            {sessions.map((s) => (
              <option key={s._id} value={s._id}>
                {s.classId}: {s.subject} ({new Date(s.startedAt).toLocaleDateString()})
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            disabled={!reportData}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-semibold transition flex items-center shadow-xs"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {reportData && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase text-gray-500">Enrolled In Roster</span>
              <div className="mt-2 text-2xl font-bold text-gray-900">{reportData.counts.total}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase text-gray-500">Present</span>
              <div className="mt-2 text-2xl font-bold text-emerald-600">{reportData.counts.present}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
              <span className="text-xs font-semibold uppercase text-gray-500">Absent</span>
              <div className="mt-2 text-2xl font-bold text-amber-600">{reportData.counts.absent}</div>
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">
                Session Roster: {reportData.session.subject} ({reportData.session.classId})
              </h2>
              <span className="text-xs text-gray-500">
                Date: {new Date(reportData.session.startedAt).toLocaleString()}
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-gray-500">Loading attendance roster...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="px-5 py-3.5">Student ID</th>
                      <th className="px-5 py-3.5">Name</th>
                      <th className="px-5 py-3.5">Section</th>
                      <th className="px-5 py-3.5">Attendance</th>
                      <th className="px-5 py-3.5">Method</th>
                      <th className="px-5 py-3.5">Similarity</th>
                      <th className="px-5 py-3.5">Timestamp</th>
                      <th className="px-5 py-3.5 text-right">Faculty Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reportData.roster.map((item) => (
                      <tr key={item.studentId} className="hover:bg-gray-50/70 transition">
                        <td className="px-5 py-3.5 font-mono text-xs font-bold text-gray-900">
                          {item.studentId}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-gray-900">{item.name}</td>
                        <td className="px-5 py-3.5">{item.section}</td>
                        <td className="px-5 py-3.5">
                          {item.status === 'present' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Present
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Absent
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs capitalize text-gray-600">
                          {item.method || '-'}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono">
                          {item.similarityScore ? item.similarityScore.toFixed(3) : '-'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-500">
                          {item.markedAt ? new Date(item.markedAt).toLocaleTimeString() : '-'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleManualToggle(item.studentId, item.status)}
                            className="text-xs font-semibold px-2.5 py-1 text-gray-700 hover:text-emerald-700 bg-gray-100 hover:bg-emerald-50 rounded-lg border border-gray-200 transition"
                          >
                            Toggle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
