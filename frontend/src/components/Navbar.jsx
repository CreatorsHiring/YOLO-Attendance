import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, ScanFace, FileText, CheckCircle2 } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/scanner', label: 'Attendance Scanner', icon: ScanFace },
    { path: '/enroll', label: 'Enroll Face', icon: UserPlus },
    { path: '/students', label: 'Students', icon: Users },
    { path: '/report', label: 'Reports', icon: FileText },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <ScanFace className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900 tracking-tight">UniFace</span>
              <span className="text-xs ml-1.5 px-2 py-0.5 font-medium bg-emerald-100 text-emerald-800 rounded-full">ArcFace AI</span>
            </div>
          </div>

          <div className="hidden md:flex space-x-1 items-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex md:hidden items-center space-x-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              Faculty Mode
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-2 py-1 shadow-lg">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-1.5 px-2 rounded-md text-[10px] font-medium transition-colors ${
                  isActive ? 'text-emerald-700' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span>{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
