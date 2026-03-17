import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Calendar, Clock, UserPlus, TrendingUp, CheckCircle, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { useState, useEffect, useMemo } from 'react';
import { api } from '../../utils/api';
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

type RecentActivityApiRow = {
  timestamp: string;
  account?: string;
  action?: string;
  details?: string;
  module?: string;
};

// Color map for resident types
const RESIDENT_TYPE_COLORS: Record<string, string> = {
  'Resident': '#4aa8cf',
  'Student': '#5f913f',
  'Senior Citizen': '#ffa62e',
  'PWD': '#ea4d48',
  'Indigenous': '#2957a1',
};

export function DashboardHome({
  adminName,
  onNavigate,
  registrationCutoffDate = getDefaultCutoffDate(),
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
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Voters total for pie label calculation
  const totalVoters = useMemo(
    () => voterData.reduce((sum, v) => sum + (Number(v.value) || 0), 0),
    [voterData]
  );

  const hasResidentChart = residentData.length > 0;
  const hasVoterChart = voterData.length > 0;
  const hasTrendChart = weeklyTrendData.length > 0;

  // Default weekly trend data (used when backend returns nothing)
  const defaultWeeklyTrend = [
    { week: 'Week 1', count: 12 },
    { week: 'Week 2', count: 18 },
    { week: 'Week 3', count: 15 },
    { week: 'Week 4', count: 22 },
  ];

  // ===== RECENT ACTIVITIES (DYNAMIC, POLLING) =====
  const fetchRecentActivities = async () => {
    setLoadingActivities(true);
    try {
      const res = await api.get<RecentActivityApiRow[]>('/api/transactions/recent?limit=5');
      const rows = Array.isArray(res.data) ? res.data : [];

      const mapped = rows.map((r) => ({
        action: `${r.account ?? 'Someone'} ${String(r.action ?? '').toLowerCase().trim()} ${r.module ?? ''}`.trim(),
        name: r.details,
        time: r.timestamp
          ? new Date(r.timestamp).toLocaleString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
          : '',
      }));

      setActivities(mapped);
    } catch (e) {
      console.error('Failed to fetch recent activities:', e);
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    fetchRecentActivities();
    const interval = setInterval(fetchRecentActivities, 10000);
    return () => clearInterval(interval);
  }, []);

  // ===== CLOCK =====
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const date = now.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      const time = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setCurrentDateTime(`${date} | ${time}`);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // ===== DASHBOARD STATS =====
  useEffect(() => {
    let isMounted = true;

    const fetchDashboardStats = async () => {
      setLoadingStats(true);

      try {
        const res = await api.get<DashboardStatsResponse>(
          `/api/dashboard/stats?cutoff=${registrationCutoffDate}`
        );
        const data = res.data || {};

        if (!isMounted) return;

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

        // Fetch resident types breakdown
        try {
          const typeRes = await api.get<{ data: { type: string; count: number }[] }>('/api/stats/resident-types');
          const rows = Array.isArray(typeRes.data?.data) ? typeRes.data.data : [];
          if (rows.length > 0) {
            const chart = rows.map((r) => ({
              category: String(r.type ?? '').trim(),
              value: Number(r.count ?? 0),
              fill: RESIDENT_TYPE_COLORS[String(r.type ?? '').trim()] ?? '#949494',
            }));
            setResidentData(chart);
          } else {
            setResidentData([
              { category: 'Total Residents', value: Number(data.totalResidents ?? 0), fill: '#4aa8cf' },
            ]);
          }
        } catch {
          setResidentData([
            { category: 'Total Residents', value: Number(data.totalResidents ?? 0), fill: '#4aa8cf' },
          ]);
        }

        if (Array.isArray(data.weeklyTrend) && data.weeklyTrend.length > 0) {
          setWeeklyTrendData(data.weeklyTrend);
        } else {
          setWeeklyTrendData(defaultWeeklyTrend);
        }

        setActivities(data.activities || []);

        const residentsRes = await api.get('/residents');
        const residentRows: ResidentRow[] = Array.isArray(residentsRes.data)
          ? residentsRes.data
          : residentsRes.data?.residents ?? [];

        if (!isMounted) return;
        setResidentData(buildResidentTypeChartData(residentRows));
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        if (!isMounted) return;

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
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    };

    fetchDashboardStats();

    return () => {
      isMounted = false;
    };
  }, [registrationCutoffDate]);

  const statText = (n: number) => (loadingStats ? '—' : String(n));

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">

        {/* Total Registered Residents */}
        <Card className="border-[#2957a1] bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-700 mb-2">Total Registered Residents</p>

            <p className="text-[20px] font-semibold text-[#2957a1]">
              {statText(stats.totalResidents)}
            </p>

            <p
              onClick={() => onNavigate?.('residents', 'all')}
              className="text-[14px] text-black mt-2 cursor-pointer hover:underline hover:text-[#2957a1]"
            >
              → View all residents
            </p>
          </CardContent>
        </Card>

        {/* New Residents */}
        <Card className="border-[#51c55f] bg-gradient-to-br from-green-50 to-white border-2">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs text-gray-700 font-semibold">New Residents</p>
              <UserPlus className="w-4 h-4 text-green-600" />
            </div>

            <p className="text-[20px] font-semibold text-green-600">
              {statText(stats.newResidents)}
            </p>

            <p className="text-[9px] text-gray-500 mt-2">
              Since {dayjs(registrationCutoffDate).format('MM/DD/YYYY')}
            </p>

            <p
              onClick={() => onNavigate?.('residents', 'new')}
              className="text-[14px] text-black mt-2 cursor-pointer hover:underline hover:text-[#16a34a]"
            >
              → View new residents
            </p>
          </CardContent>
        </Card>

        {/* Total Barangay Officials */}
        <Card className="border-[#ffa62e] bg-white">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs text-gray-700">Total Barangay Officials</p>
              <Users className="w-4 h-4 text-orange-500" />
            </div>

            <p className="text-[20px] font-semibold text-[#2957a1]">
              {statText(stats.totalOfficials)}
            </p>

            <p
              onClick={() => onNavigate?.('officials')}
              className="text-[14px] text-black mt-2 cursor-pointer hover:underline hover:text-[#f97316]"
            >
              → Manage officials
            </p>
          </CardContent>
        </Card>

        {/* Total Pending Requests */}
        <Card className="border-[#ea4d48] bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-700 mb-2">Total Pending Requests</p>

            <p className="text-[20px] font-semibold text-[#2957a1]">
              {statText(stats.pendingRequests)}
            </p>

            <p
              onClick={() => onNavigate?.('requests', 'pending')}
              className="text-[14px] text-black mt-2 cursor-pointer hover:underline hover:text-[#ef4444]"
            >
              → View pending
            </p>
          </CardContent>
        </Card>

        {/* Total Documents to Pickup */}
        <Card className="border-[#2957a1] bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-700 mb-2">Total Documents to Pickup</p>

            <p className="text-[20px] font-semibold text-[#2957a1]">
              {statText(stats.documentsToPickup)}
            </p>

            <p
              onClick={() => onNavigate?.('requests', 'pickup')}
              className="text-[14px] text-black mt-2 cursor-pointer hover:underline hover:text-[#2957a1]"
            >
              → View documents
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        <Card className="border-[#5ce36c] bg-white">
          <CardHeader>
            <CardTitle className="text-center text-base">Residents by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              {hasResidentChart ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={residentData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
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

        {/* Growth Trend + Voters Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          {/* Voters Distribution */}
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
                  {voterData.map((item, index) => {
                    const percent =
                      totalVoters > 0 ? Math.round((Number(item.value) / totalVoters) * 100) : 0;

                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-[11px] text-gray-600">
                          {item.name} ({percent}%)
                        </span>
                      </div>
                    );
                  })}
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
          {loadingActivities ? (
            <div className="text-sm text-gray-500">Loading recent activities…</div>
          ) : activities.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">No recent activities yet.</div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
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
                  {activity.time && (
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {activity.time}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}