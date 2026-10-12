import { useState, useEffect } from 'react';
import { Search, UserCheck, Clock, UserPlus, Filter, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getStudents } from '../services/api';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await getStudents({ search, classId: filterClass });
      setStudents(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, filterClass]);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Directory</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage student registrations, class rosters, and biometric enrollment status
          </p>
        </div>
        <Link
          to="/enroll"
          className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-xs transition"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Enroll New Student
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student ID or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white"
          >
            <option value="">All Classes</option>
            <option value="CS-401">CS-401</option>
            <option value="CS-302">CS-302</option>
            <option value="AI-101">AI-101</option>
          </select>
        </div>
      </div>

      {/* Students Table / Grid */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500">Loading student roster...</div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-sm">No students found matching current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3.5">Student ID</th>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Class & Section</th>
                  <th className="px-5 py-3.5">Biometrics</th>
                  <th className="px-5 py-3.5">Samples</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50/70 transition">
                    <td className="px-5 py-3.5 font-semibold text-gray-900 font-mono text-xs">
                      {student.studentId}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">{student.name}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg">
                        {student.classId} - {student.section}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {student.enrollmentStatus === 'enrolled' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <UserCheck className="w-3 h-3 mr-1" /> Enrolled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 mr-1" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">
                      {student.enrollmentCount || 0} sample(s)
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/enroll?studentId=${student.studentId}&name=${encodeURIComponent(student.name)}&classId=${student.classId}`}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
                      >
                        Re-enroll Face
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
