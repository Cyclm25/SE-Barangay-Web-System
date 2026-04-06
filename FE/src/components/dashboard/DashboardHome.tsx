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
  userRole?: 'admin' | 'official' | 'resident' | 'sk_kagawad';
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

function formatRecentActivity(row: RecentActivityApiRow) {
  const account = String(row.account ?? 'Someone').trim();
  const action = String(row.action ?? '').trim();
  const module = String(row.module ?? '').trim();
  const details = String(row.details ?? '').trim();

  const createdResidentMatch = details.match(/^Resident Records\s*-\s*Created resident:\s*(.+?)\s*\(([^)]+)\)\s*$/i);
  if (/created resident account/i.test(action) && createdResidentMatch) {
    return {
      action: `${account} created resident account`,
      name: `${createdResidentMatch[1]} (${createdResidentMatch[2]})`,
    };
  }

  const isRequestActivity =
    /request/i.test(module) ||
    /clearance|certificate|cedula|barangay id|business permit|document/i.test(action) ||
    /\(pending\)|\bbarangay clearance\b|\bcertificate\b|\bcedula\b|\bbarangay id\b|\bbusiness permit\b/i.test(details);

  if (isRequestActivity && /\bcreated\b/i.test(action)) {
    return {
      action: [account, action.replace(/\bcreated\b/gi, 'Requested'), module].filter(Boolean).join(' '),
      name: details && details !== action ? details : '',
    };
  }

  const primary = [account, action, module].filter(Boolean).join(' ') || account;
  const secondary = details && details !== primary ? details : '';

  return {
    action: primary,
    name: secondary,
  };
}

type AdminRequestRow = {
  RequestStatus?: string;
  RequestType?: string;
};

type DashboardResidentRow = {
  ResidentType?: string | null;
  residentType?: string | null;
  resident_type?: string | null;
  dateRegistered?: string | null;
  DateRegistered?: string | null;
  DateCreated?: string | null;
  datecreated?: string | null;
  CreatedAt?: string | null;
  created_at?: string | null;
  VoterStatus?: boolean | null;
  status?: string | null;
};

// Color map for resident types
const RESIDENT_TYPE_COLORS: Record<string, string> = {
  'Resident': '#4aa8cf',
  'Student': '#5f913f',
  'Senior Citizen': '#ffa62e',
  'PWD': '#ea4d48',
  'Indigenous': '#2957a1',
};

function normalizeResidentTypeCategory(value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'pwd') return 'PWD';
  if (normalized === 'senior citizen' || normalized === 'senior') return 'Senior Citizen';
  if (normalized === 'indigenous') return 'Indigenous';
  if (normalized === 'student') return 'Student';
  if (normalized === 'resident') return 'Resident';
  return value.trim();
}

function buildResidentTypeChartData(rows: DashboardResidentRow[]) {
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    const residentStatus = String(row?.status ?? 'Active').trim();
    if (residentStatus && residentStatus !== 'Active') {
      return acc;
    }

    const category = normalizeResidentTypeCategory(
      String(row?.ResidentType ?? row?.residentType ?? row?.resident_type ?? '')
    );
    if (!category) {
      return acc;
    }

    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([category, value]) => ({
      category,
      value,
      fill: RESIDENT_TYPE_COLORS[category] ?? '#949494',
    }))
    .sort((a, b) => b.value - a.value);
}

function getResidentRegisteredDate(row: DashboardResidentRow) {
  const raw =
    row?.dateRegistered ??
    row?.DateRegistered ??
    row?.DateCreated ??
    row?.datecreated ??
    row?.CreatedAt ??
    row?.created_at ??
    null;

  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function buildWeeklyTrendFromResidents(rows: DashboardResidentRow[]) {
  const startOfCurrentWeek = dayjs().startOf('week');

  return Array.from({ length: 4 }, (_, index) => {
    const weekStart = startOfCurrentWeek.subtract(3 - index, 'week');
    const weekEnd = weekStart.add(1, 'week');

    const count = rows.filter((row) => {
      const residentStatus = String(row?.status ?? 'Active').trim();
      if (residentStatus && residentStatus !== 'Active') {
        return false;
      }

      const registeredDate = getResidentRegisteredDate(row);
      if (!registeredDate) {
        return false;
      }

      const d = dayjs(registeredDate);
      return d.isAfter(weekStart.subtract(1, 'millisecond')) && d.isBefore(weekEnd);
    }).length;

    return {
      week: `Week ${index + 1}`,
      count,
    };
  });
}

export function DashboardHome({
  adminName,
  onNavigate,
  registrationCutoffDate = getDefaultCutoffDate(),
  userRole = 'admin',
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
  const hasVoterChart = voterData.length > 0 && totalVoters > 0;
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

      const mapped = rows.map((r) => {
        const formatted = formatRecentActivity(r);
        return {
          action: formatted.action,
          name: formatted.name,
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
        };
      });

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
        const [statsResult, requestsResult, residentsResult, officialsResult] = await Promise.allSettled([
          api.get<DashboardStatsResponse>(
            `/api/dashboard/stats?cutoff=${registrationCutoffDate}`
          ),
          api.get<AdminRequestRow[]>('/requests/admin/all'),
          api.get<DashboardResidentRow[] | { residents?: DashboardResidentRow[] }>('/residents'),
          api.get<any[]>('/api/officials'),
        ]);
        const data =
          statsResult.status === 'fulfilled' ? statsResult.value.data || {} : {};
        const requestRows =
          requestsResult.status === 'fulfilled' && Array.isArray(requestsResult.value.data)
            ? requestsResult.value.data
            : [];
        const residentRows =
          residentsResult.status === 'fulfilled'
            ? Array.isArray(residentsResult.value.data)
              ? residentsResult.value.data
              : residentsResult.value.data?.residents ?? []
            : [];
        const officialRows =
          officialsResult.status === 'fulfilled' && Array.isArray(officialsResult.value.data)
            ? officialsResult.value.data
            : [];
        const pendingRequestsCount = requestRows.filter(
          (row) => String(row?.RequestStatus ?? '').trim().toLowerCase() === 'pending'
        ).length;
        const readyForPickupCount = requestRows.filter(
          (row) => String(row?.RequestStatus ?? '').trim().toLowerCase() === 'ready for pickup'
        ).length;
        const totalResidentsCount =
          residentRows.length > 0 ? residentRows.length : Number(data.totalResidents ?? 0);
        const totalOfficialsCount =
          officialRows.length > 0 ? officialRows.length : Number(data.totalOfficials ?? 0);
        const activeResidentRows = residentRows.filter(
          (row) => String(row?.status ?? 'Active').trim() === 'Active'
        );
        const residentsWithDates = activeResidentRows.filter((row) => getResidentRegisteredDate(row));
        const registeredVoters = activeResidentRows.filter((row) => row?.VoterStatus === true).length;
        const notRegisteredVoters = activeResidentRows.filter((row) => row?.VoterStatus !== true).length;
        const residentChartData = buildResidentTypeChartData(residentRows);
        const cutoffDate = dayjs(registrationCutoffDate);
        const frontendNewResidentsCount = activeResidentRows.filter((row) => {
          const registeredDate = getResidentRegisteredDate(row);
          return registeredDate ? dayjs(registeredDate).isAfter(cutoffDate.subtract(1, 'millisecond')) : false;
        }).length;
        const frontendWeeklyTrend = buildWeeklyTrendFromResidents(activeResidentRows);

        if (!isMounted) return;

        setStats({
          totalResidents: totalResidentsCount,
          totalOfficials: totalOfficialsCount,
          pendingRequests: pendingRequestsCount,
          documentsToPickup:
            readyForPickupCount > 0
              ? readyForPickupCount
              : Number(data.readyPickup ?? data.documentsToPickup ?? 0),
          newResidents:
            residentsWithDates.length > 0
              ? frontendNewResidentsCount
              : Number(data.newResidents ?? 0),
        });

        const registered =
          residentRows.length > 0
            ? registeredVoters
            : Number(data?.voters?.registered ?? 0);
        const notRegistered =
          residentRows.length > 0
            ? notRegisteredVoters
            : Number(data?.voters?.not_registered ?? data?.voters?.notRegistered ?? 0);

        setVoterData([
          { name: 'VOTER', value: registered, fill: '#2dadfc' },
          { name: 'NON-VOTER', value: notRegistered, fill: '#ffa62e' },
        ]);

        setResidentData(residentChartData);

        if (residentsWithDates.length > 0) {
          setWeeklyTrendData(frontendWeeklyTrend);
        } else if (Array.isArray(data.weeklyTrend) && data.weeklyTrend.length > 0) {
          setWeeklyTrendData(data.weeklyTrend);
        } else {
          setWeeklyTrendData(defaultWeeklyTrend);
        }
        if (statsResult.status === 'rejected') {
          console.error('Failed to fetch dashboard stats:', statsResult.reason);
        }

        if (requestsResult.status === 'rejected') {
          console.error('Failed to fetch pending requests:', requestsResult.reason);
        }

        if (residentsResult.status === 'rejected') {
          console.error('Failed to fetch residents for dashboard:', residentsResult.reason);
        }

        if (officialsResult.status === 'rejected') {
          console.error('Failed to fetch officials for dashboard:', officialsResult.reason);
        }
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
    const interval = setInterval(fetchDashboardStats, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [registrationCutoffDate]);

  const statText = (n: number) => (loadingStats ? '—' : String(n));

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">Welcome back, {adminName}!</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-gray-600">
          <Clock className="w-5 h-5" />
          <span className="font-semibold">{currentDateTime}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">

        {/* Total Registered Residents */}
        <Card className="border-[#2957a1] bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex h-full min-h-[190px] flex-col p-4">
            <p className="text-md font-bold text-gray-700 mb-2">Total Registered Residents</p>

            <p className="text-[20px] font-semibold text-[#2957a1]">
              {statText(stats.totalResidents)}
            </p>

            <button
              type="button"
              onClick={() => onNavigate?.('residents', 'all')}
              className="mt-auto inline-flex w-full items-center justify-center rounded-md border border-[#2957a1] px-3 py-1.5 text-[13px] font-semibold text-[#2957a1] transition-all duration-200 hover:bg-[#2957a1] hover:text-white hover:shadow-sm sm:w-auto"
            >
              View all residents
            </button>
          </CardContent>
        </Card>

        {/* New Residents */}
        <Card className="border-[#51c55f] bg-gradient-to-br from-green-50 to-white border-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex h-full min-h-[190px] flex-col p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-md font-bold text-gray-700 mb-2">New Residents</p>
              <UserPlus className="w-4 h-4 text-green-600" />
            </div>

            <p className="text-[20px] font-semibold text-green-600">
              {statText(stats.newResidents)}
            </p>

            <p className="text-[9px] text-gray-500 mt-2">
              Since {dayjs(registrationCutoffDate).format('MM/DD/YYYY')}
            </p>

            <button
              type="button"
              onClick={() => onNavigate?.('residents', 'new')}
              className="mt-auto inline-flex w-full items-center justify-center rounded-md border border-[#16a34a] px-3 py-1.5 text-[13px] font-semibold text-[#16a34a] transition-all duration-200 hover:bg-[#16a34a] hover:text-white hover:shadow-sm sm:w-auto"
            >
              View new residents
            </button>
          </CardContent>
        </Card>

        {/* Total Barangay Officials */}
        {userRole === 'admin' && (
        <Card className="border-[#ffa62e] bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex h-full min-h-[190px] flex-col p-4">
            <div className="flex justify-between items-start mb-2">
              <p className="text-md font-bold text-gray-700">Total Barangay Officials</p>
              <Users className="w-4 h-4 text-orange-500" />
            </div>

            <p className="text-[20px] font-semibold text-[#2957a1]">
              {statText(stats.totalOfficials)}
            </p>

            <button
              type="button"
              onClick={() => onNavigate?.('officials')}
              className="mt-auto inline-flex w-full items-center justify-center rounded-md border border-[#f97316] px-3 py-1.5 text-[13px] font-semibold text-[#f97316] transition-all duration-200 hover:bg-[#f97316] hover:text-white hover:shadow-sm sm:w-auto"
            >
              Manage officials
            </button>
          </CardContent>
        </Card>
        )}

        {/* Total Pending Requests */}
        <Card className="border-[#f4b400] bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex h-full min-h-[190px] flex-col p-4">
            <p className="text-md font-bold text-gray-700 mb-2">Total Pending Requests</p>

            <p className="text-[20px] font-semibold text-[#2957a1]">
              {statText(stats.pendingRequests)}
            </p>

            <button
              type="button"
              onClick={() => onNavigate?.('requests', 'pending')}
              className="mt-auto inline-flex w-full items-center justify-center rounded-md border border-[#f4b400] px-3 py-1.5 text-[13px] font-semibold text-[#f4b400] transition-all duration-200 hover:bg-[#f4b400] hover:text-white hover:shadow-sm sm:w-auto"
            >
              View pending
            </button>
          </CardContent>
        </Card>

        {/* Total Documents to Pickup */}
        <Card className="border-[#2957a1] bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex h-full min-h-[190px] flex-col p-4">
            <p className="text-md font-bold text-gray-700 mb-2">Total Documents to Pickup</p>

            <p className="text-[20px] font-semibold text-[#2957a1]">
              {statText(stats.documentsToPickup)}
            </p>

            <button
              type="button"
              onClick={() => onNavigate?.('requests', 'pickup')}
              className="mt-auto inline-flex w-full items-center justify-center rounded-md border border-[#2957a1] px-3 py-1.5 text-[13px] font-semibold text-[#2957a1] transition-all duration-200 hover:bg-[#2957a1] hover:text-white hover:shadow-sm sm:w-auto"
            >
              View documents
            </button>
          </CardContent>
        </Card>

      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        <Card className="border-[#5ce36c] bg-white">
          <CardHeader>
            <CardTitle className="text-center text-base text-md font-bold">Residents by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              {hasResidentChart ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={residentData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="category" tick={{ fontSize: 14, fill: "#000000" }} />
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
                <div className="h-[250px] flex items-center justify-center text-sm text-black-500">
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
              <CardTitle className="text-md font-bold text-center text-base flex items-center justify-center gap-2">
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
              <CardTitle className="text-md font-bold text-center text-base">Voters Distribution</CardTitle>
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
          <CardTitle className="flex items-center gap-2 text-base text-md font-bold">
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
                    {activity.name && <p className="text-md text-gray-600">{activity.name}</p>}
                  </div>
                  {activity.time && (
                    <span className="text-md text-gray-500 whitespace-nowrap">
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
