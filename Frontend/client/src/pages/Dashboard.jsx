import { useState } from 'react';
import { LayoutDashboard, FileText, Info, LogOut, User } from 'lucide-react';

const Dashboard = ({ onLogout }) => {
  // Sample data para sa requests - sa susunod kukunin na natin ito sa Database
  const [requests] = useState([
    { 
      id: 1, 
      type: "Barangay Clearance", 
      name: "Juan Dela Cruz", 
      status: "Pending",
      date: "2026-01-23"
    }
  ]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Kagaya ng kulay sa Figma mo */}
      <div className="w-72 bg-[#1e3a8a] text-white flex flex-col">
        <div className="p-8 border-b border-blue-800">
          <h2 className="text-2xl font-bold tracking-tight">BARANGAY 160</h2>
          <p className="text-xs text-blue-300 mt-1">Zone 14, District 2, Tondo</p>
        </div>
        
        <nav className="flex-1 p-6">
          <ul className="space-y-4">
            <li className="flex items-center gap-3 p-3 bg-blue-800 rounded-lg cursor-pointer">
              <LayoutDashboard size={20} />
              <span className="font-medium">Home</span>
            </li>
            <li className="flex items-center gap-3 p-3 hover:bg-blue-800 rounded-lg transition cursor-pointer">
              <FileText size={20} />
              <span className="font-medium">Services</span>
            </li>
            <li className="flex items-center gap-3 p-3 hover:bg-blue-800 rounded-lg transition cursor-pointer">
              <Info size={20} />
              <span className="font-medium">About</span>
            </li>
          </ul>
        </nav>

        <div className="p-6 border-t border-blue-800">
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 w-full p-3 bg-red-600 hover:bg-red-700 rounded-lg transition"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b flex items-center justify-between px-10 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-800">Welcome, Juan!</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Juan Dela Cruz</span>
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="text-gray-500" size={24} />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-10">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">My Requests</h2>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                  New Request
                </button>
              </div>

              <div className="p-6">
                {requests.length > 0 ? (
                  requests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition mb-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                          <FileText size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{req.type}</h3>
                          <p className="text-sm text-gray-500">For: {req.name}</p>
                          <p className="text-xs text-gray-400 mt-1">Filed on: {req.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          req.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-10">No requests found.</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;