import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Users, User, FileText, Calendar, Clock, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useState, useEffect } from 'react';

interface DashboardHomeProps {
  adminName: string;
}

export function DashboardHome({ adminName }: DashboardHomeProps) {
  const [currentDateTime, setCurrentDateTime] = useState('');

  // Update time every second
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const date = now.toLocaleDateString('en-US', { 
        month: 'long',
        day: 'numeric', 
        year: 'numeric' 
      });
      const time = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
      });
      setCurrentDateTime(`${date} | ${time}`);
    };

    updateDateTime(); // Initial update
    const interval = setInterval(updateDateTime, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  const stats = {
    totalResidents: 10,
    totalOfficials: 5,
    pendingRequests: 10,
    documentsToPickup: 5
  };

  const residentData = [
    { category: 'Category 1', value: 20, fill: '#ffa62e' },
    { category: 'Category 2', value: 15, fill: '#5f913f' },
    { category: 'Category 3', value: 25, fill: '#e44d44' },
    { category: 'Category 4', value: 30, fill: '#4aa8cf' },
    { category: 'Category 5', value: 10, fill: '#949494' },
  ];

  const voterData = [
    { name: 'Registered', value: 65, fill: '#2dadfc' },
    { name: 'Not Registered', value: 35, fill: '#ffa62e' },
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {/* Header with Date/Time */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">Welcome back, {adminName}!</p>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="w-5 h-5" />
          <span className="font-semibold">{currentDateTime}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#51c55f] bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-700 mb-2">Total Registered Residents</p>
            <p className="text-[20px] font-semibold text-[#2957a1]">{stats.totalResidents}</p>
          </CardContent>
        </Card>

        <Card className="border-[#ffa62e] bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-700 mb-2">Total Registered Barangay Officials</p>
            <p className="text-[20px] font-semibold text-[#2957a1]">{stats.totalOfficials}</p>
          </CardContent>
        </Card>

        <Card className="border-[#ea4d48] bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-700 mb-2">Total Pending Requests</p>
            <p className="text-[20px] font-semibold text-[#2957a1]">{stats.pendingRequests}</p>
          </CardContent>
        </Card>

        <Card className="border-[#2957a1] bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-700 mb-2">Total Documents to Pickup</p>
            <p className="text-[20px] font-semibold text-[#2957a1]">{stats.documentsToPickup}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Residents Bar Chart */}
        <Card className="border-[#5ce36c] bg-white">
          <CardHeader>
            <CardTitle className="text-center text-base">Residents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={residentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {residentData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3" style={{ backgroundColor: item.fill }} />
                  <span className="text-[11px] text-gray-600">{item.category}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Voters Pie Chart */}
        <Card className="border-[#5ce36c] bg-white">
          <CardHeader>
            <CardTitle className="text-center text-base">Voters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={voterData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {voterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {voterData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3" style={{ backgroundColor: item.fill }} />
                  <span className="text-[11px] text-gray-600">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { action: 'New resident registered', name: 'Gabriel Siang Chua', time: '2 hours ago', type: 'success' },
              { action: 'Document request approved', name: 'Barangay Clearance #2025-001', time: '4 hours ago', type: 'info' },
              { action: 'Official profile updated', name: 'Kagawad Juan Dela Cruz', time: '1 day ago', type: 'warning' },
              { action: 'Announcement posted', name: 'Community Meeting Schedule', time: '2 days ago', type: 'default' },
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                <div className="mt-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-gray-600">{activity.name}</p>
                </div>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}