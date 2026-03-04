import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Calendar, Clock, UserPlus, TrendingUp, CheckCircle, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { useState, useEffect } from 'react';
import { api } from "../../utils/api";
import dayjs from 'dayjs';

// Helper: Get default cutoff date (30 days ago)
const getDefaultCutoffDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
};

interface DashboardHomeProps {
  adminName: string;
  onNavigate?: (tab: string, filter?: string) => void;
  registrationCutoffDate?: string;
}

type DashboardStatsResponse = {
  totalResidents?: number | string;
  totalOfficials?: number | string;
  pendingRequests?: number | string;
  readyPickup?: number | string;
  documentsToPickup?: number | string;
  newResidents?: number | string;
  voters?: {
    registered?: number | string;
    not_registered?: number | string;
    notRegistered?: number | string;
  };
  activities?: Array<{
    action: string;
    name?: string;
    time?: string;
  }>;
  weeklyTrend?: Array<{
    week: string;
    count: number;
  }>;
};

export function DashboardHome({ 
  adminName, 
  onNavigate,
  registrationCutoffDate = getDefaultCutoffDate()
}: DashboardHomeProps) {
  const [currentDateTime, setCurrentDateTime] = useState('');

  const [stats, setStats] = useState({
    totalResidents: 0,
    totalOfficials: 0,
    pendingRequests: 0,
    documentsToPickup: 0,
    newResidents: 0,
  });

  const [residentData, setResidentData] = useState<{ category: string; value: number; fill: string }[]>([]);
  const [voterData, setVoterData] = useState<{ name: string; value: number; fill: string }[]>([]);
  const [weeklyTrendData, setWeeklyTrendData] = useState<{ week: string; count: number }[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Default weekly trend data (will be replaced by backend data if available)
  const defaultWeeklyTrend = [
    { week: 'Week 1', count: 12 },
    { week: 'Week 2', count: 18 },
    { week: 'Week 3', count: 15 },
    { week: 'Week 4', count: 22 },
  ];

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

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoadingStats(true);
      try {
        // Pass the admin's cutoff date to the backend
        const res = await api.get<DashboardStatsResponse>(`/api/dashboard/stats?cutoff=${registrationCutoffDate}`);
        const data = res.data || {};

        setStats({
          totalResidents: Number(data.totalResidents ?? 0),
          totalOfficials: Number(data.totalOfficials ?? 0),
          pendingRequests: Number(data.pendingRequests ?? 0),
          documentsToPickup: Number(data.readyPickup ?? data.documentsToPickup ?? 0),
          newResidents: Number(data.newResidents ?? 0),
        });

        const registered = Number(data?.voters?.registered ?? 0);
        const notRegistered = Number(
          data?.voters?.not_registered ?? data?.voters?.notRegistered ?? 0
        );

        setVoterData([
          { name: 'Registered', value: registered, fill: '#2dadfc' },
          { name: 'Not Registered', value: notRegistered, fill: '#ffa62e' },
        ]);

        setResidentData([
          { category: 'Total Residents', value: Number(data.totalResidents ?? 0), fill: '#4aa8cf' },
        ]);

        // Set weekly trend data from backend or use default
        if (Array.isArray(data.weeklyTrend) && data.weeklyTrend.length > 0) {
          setWeeklyTrendData(data.weeklyTrend);
        } else {
          setWeeklyTrendData(defaultWeeklyTrend);
        }

        setActivities(data.activities || []);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        setStats({
          totalResidents: 0,
          totalOfficials: 0,
          pendingRequests: 0,
          documentsToPickup: 0,
          newResidents: 0,
        });
        setResidentData([]);
        setVoterData([]);
        setWeeklyTrendData(defaultWeeklyTrend);
        setActivities([]);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchDashboardStats();
  }, [registrationCutoffDate]);

  const statText = (n: number) => (loadingStats ? "—" : String(n));

  const hasResidentChart = residentData.length > 0;
  const hasVoterChart = voterData.length > 0;
  const hasTrendChart = weeklyTrendData.length > 0;

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

      {/* Stats Cards - All Clickable with Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Registered Residents */}
        <Card 
          className="border-[#51c55f] bg-white cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" 
          onClick={() => onNavigate?.('residents', 'all')}
        >
          <CardContent className="p-4">
            <p className="text-xs text-gray-700 mb-2">Total Registered Residents</p>
            <p className="text-[20px] font-semibold text-[#2957a1]">
              {statText(stats.totalResidents)}
            </p>
            <p className="text-[9px] text-gray-500 mt-2 italic">→ View all residents</p>
          </CardContent>
        </Card>

        {/* New Residents - Green Card */}
        <Card 
          className="border-[#4ade80] bg-gradient-to-br from-green-50 to-white cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 border-2" 
          onClick={() => onNavigate?.('residents', 'new')}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs text-gray-700 font-semibold">New Residents</p>
              <UserPlus className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-[20px] font-semibold text-green-600">
              {statText(stats.newResidents)}
            </p>
            <p className="text-[9px] text-gray-500 mt-2">Since {dayjs(registrationCutoffDate).format('MM/DD/YYYY')}</p>
            <p className="text-[9px] text-green-600 mt-1 italic">→ View new residents</p>
          </CardContent>
        </Card>

        {/* Total Barangay Officials */}
        <Card 
          className="border-[#ffa62e] bg-white cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" 
          onClick={() => onNavigate?.('officials')}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs text-gray-700">Total Barangay Officials</p>
              <Users className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-[20px] font-semibold text-[#2957a1]">
              {statText(stats.totalOfficials)}
            </p>
            <p className="text-[9px] text-gray-500 mt-2 italic">→ Manage officials</p>
          </CardContent>
        </Card>

        {/* Total Pending Requests */}
        <Card 
          className="border-[#ea4d48] bg-white cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" 
          onClick={() => onNavigate?.('requests', 'pending')}
        >
          <CardContent className="p-4">
            <p className="text-xs text-gray-700 mb-2">Total Pending Requests</p>
            <p className="text-[20px] font-semibold text-[#2957a1]">
              {statText(stats.pendingRequests)}
            </p>
            <p className="text-[9px] text-gray-500 mt-2 italic">→ View pending</p>
          </CardContent>
        </Card>

        {/* Total Documents to Pickup */}
        <Card 
          className="border-[#2957a1] bg-white cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" 
          onClick={() => onNavigate?.('requests', 'pickup')}
        >
          <CardContent className="p-4">
            <p className="text-xs text-gray-700 mb-2">Total Documents to Pickup</p>
            <p className="text-[20px] font-semibold text-[#2957a1]">
              {statText(stats.documentsToPickup)}
            </p>
            <p className="text-[9px] text-gray-500 mt-2 italic">→ View documents</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section - Reordered */}
      <div className="space-y-6">
        {/* Residents Bar Chart */}
        <Card className="border-[#5ce36c] bg-white">
          <CardHeader>
            <CardTitle className="text-center text-base">Total Residents Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              {hasResidentChart ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={residentData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {residentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-sm text-gray-500">
                  No resident data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Charts Grid - Growth Trend and Voters */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* New Residents Growth Trend */}
          <Card className="border-[#4ade80] bg-white">
            <CardHeader>
              <CardTitle className="text-center text-base flex items-center justify-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                New Residents Growth Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                {hasTrendChart ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={weeklyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip cursor={{ fill: 'rgba(74, 222, 128, 0.1)' }} />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#4ade80" 
                        strokeWidth={2} 
                        dot={{ fill: '#16a34a', r: 4 }} 
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-sm text-gray-500">
                    No trend data available.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Voters Pie Chart */}
          <Card className="border-[#5ce36c] bg-white">
            <CardHeader>
              <CardTitle className="text-center text-base">Voters Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full flex items-center justify-center">
                {hasVoterChart ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={voterData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {voterData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-sm text-gray-500">
                    No voter data available.
                  </div>
                )}
              </div>

              {hasVoterChart && (
                <div className="flex justify-center gap-6 mt-4">
                  {voterData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.fill }} />
                      <span className="text-[11px] text-gray-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-5 h-5" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">No recent activities yet.</div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="mt-1">
                    {activity.action.toLowerCase().includes('resident') ? (
                      <UserPlus className="w-4 h-4 text-green-500" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    {activity.name && <p className="text-xs text-gray-600">{activity.name}</p>}
                  </div>
                  {activity.time && <span className="text-xs text-gray-500">{activity.time}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}