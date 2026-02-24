import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Calendar, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useState, useEffect } from 'react';
import { api } from "../../utils/api";

interface DashboardHomeProps {
  adminName: string;
}

type DashboardStatsResponse = {
  totalResidents?: number | string;
  totalOfficials?: number | string;
  pendingRequests?: number | string;
  readyPickup?: number | string;
  documentsToPickup?: number | string;
  voters?: {
    registered?: number | string;
    not_registered?: number | string;
    notRegistered?: number | string;
  };
  // If you later add an activities endpoint, you can return it here.
  activities?: Array<{
    action: string;
    name?: string;
    time?: string;
  }>;
};

export function DashboardHome({ adminName }: DashboardHomeProps) {
  const [currentDateTime, setCurrentDateTime] = useState('');

  // stats (from backend)
  const [stats, setStats] = useState({
    totalResidents: 0,
    totalOfficials: 0,
    pendingRequests: 0,
    documentsToPickup: 0,
  });

  // chart data (from backend)
  const [residentData, setResidentData] = useState<{ category: string; value: number; fill: string }[]>([]);
  const [voterData, setVoterData] = useState<{ name: string; value: number; fill: string }[]>([]);

  // recent activities (placeholder until backend provides it)
  const [activities, setActivities] = useState<
    Array<{ action: string; name?: string; time?: string }>
  >([]);

  const [loadingStats, setLoadingStats] = useState(true);

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

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch dashboard stats from backend
  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoadingStats(true);
      try {
        const res = await api.get<DashboardStatsResponse>("/api/dashboard/stats");
        const data = res.data || {};

        const totalResidents = Number(data.totalResidents ?? 0);
        const totalOfficials = Number(data.totalOfficials ?? 0);
        const pendingRequests = Number(data.pendingRequests ?? 0);

        // backend currently returns "readyPickup"
        const documentsToPickup = Number(
          data.readyPickup ?? data.documentsToPickup ?? 0
        );

        setStats({
          totalResidents,
          totalOfficials,
          pendingRequests,
          documentsToPickup,
        });

        // Voters (backend returns voters.registered and voters.not_registered)
        const registered = Number(data?.voters?.registered ?? 0);
        const notRegistered = Number(
          data?.voters?.not_registered ?? data?.voters?.notRegistered ?? 0
        );

        setVoterData([
          { name: 'Registered', value: registered, fill: '#2dadfc' },
          { name: 'Not Registered', value: notRegistered, fill: '#ffa62e' },
        ]);

        // Residents bar chart
        setResidentData([
          { category: 'Total Residents', value: totalResidents, fill: '#4aa8cf' },
        ]);

        // Activities: only use backend if it exists; otherwise keep empty => placeholder UI
        if (Array.isArray(data.activities)) {
          setActivities(data.activities);
        } else {
          setActivities([]);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        // If backend is unreachable, show placeholders (zeros + empty charts)
        setStats({
          totalResidents: 0,
          totalOfficials: 0,
          pendingRequests: 0,
          documentsToPickup: 0,
        });
        setResidentData([]);
        setVoterData([]);
        setActivities([]);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const statText = (n: number) => (loadingStats ? "—" : String(n));

  const hasResidentChart = residentData.length > 0;
  const hasVoterChart = voterData.length > 0;

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
            <p className="text-[20px] font-semibold text-[#2957a1]">
              {statText(stats.totalResidents)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#ffa62e] bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-700 mb-2">Total Registered Barangay Officials</p>
            <p className="text-[20px] font-semibold text-[#2957a1]">
              {statText(stats.totalOfficials)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#ea4d48] bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-700 mb-2">Total Pending Requests</p>
            <p className="text-[20px] font-semibold text-[#2957a1]">
              {statText(stats.pendingRequests)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#2957a1] bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-700 mb-2">Total Documents to Pickup</p>
            <p className="text-[20px] font-semibold text-[#2957a1]">
              {statText(stats.documentsToPickup)}
            </p>
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
              {hasResidentChart ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={residentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-sm text-gray-500">
                  No resident chart data available.
                </div>
              )}
            </div>

            {hasResidentChart && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {residentData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3" style={{ backgroundColor: item.fill }} />
                    <span className="text-[11px] text-gray-600">{item.category}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voters Pie Chart */}
        <Card className="border-[#5ce36c] bg-white">
          <CardHeader>
            <CardTitle className="text-center text-base">Voters</CardTitle>
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
                  No voter chart data available.
                </div>
              )}
            </div>

            {hasVoterChart && (
              <div className="flex justify-center gap-6 mt-4">
                {voterData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3" style={{ backgroundColor: item.fill }} />
                    <span className="text-[11px] text-gray-600">{item.name}</span>
                  </div>
                ))}
              </div>
            )}
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
          {activities.length === 0 ? (
            <div className="text-sm text-gray-500">
              No recent activities yet.
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    {activity.name ? (
                      <p className="text-xs text-gray-600">{activity.name}</p>
                    ) : null}
                  </div>
                  {activity.time ? (
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}