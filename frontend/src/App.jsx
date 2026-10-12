import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import EnrollStudent from './pages/EnrollStudent';
import AttendanceScanner from './pages/AttendanceScanner';
import AttendanceReport from './pages/AttendanceReport';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scanner" element={<AttendanceScanner />} />
            <Route path="/enroll" element={<EnrollStudent />} />
            <Route path="/students" element={<Students />} />
            <Route path="/report" element={<AttendanceReport />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
