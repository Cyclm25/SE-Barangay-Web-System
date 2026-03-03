import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Calendar, Clock } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
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
};

type ResidentTypeStatsRow = {
  type: string;
  count: number | string;
};

type ResidentTypeStatsResponse = {
  data?: ResidentTypeStatsRow[];
};

type RecentActivityApiRow = {
  timestamp: string;
  account?: string;
  action?: string;
  details?: string;
  module?: string;
};

// Color map for resident types
const RESIDENT_TYPE_COLOR: Record<string, string> = {
  Resident: "#4aa8cf",
  Student: "#5f913f",
  "Senior Citizen": "#ffa62e",
  PWD: "#ea4d48",
  Indigenous: "#2957a1",
};

export function DashboardHome({ adminName }: DashboardHomeProps) {
  const [currentDateTime, setCurrentDateTime] = useState("");

  // cards
  const [stats, setStats] = useState({
    totalResidents: 0,
    totalOfficials: 0,
    pendingRequests: 0,
    documentsToPickup: 0,
  });

  // Residents bar chart (by resident type)
  const [residentData, setResidentData] = useState<
    { category: string; value: number }[]
  >([]);

  // Voters pie chart
  const [voterData, setVoterData] = useState<
    { name: string; value: number; fill: string }[]
  >([]);

  // recent activities
  const [activities, setActivities] = useState<
    Array<{ action: string; name?: string; time?: string }>
  >([]);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // ===== VOTERS UI ENHANCEMENTS (TOTAL + % LABELS) =====
  const totalVoters = useMemo(
    () => voterData.reduce((sum, v) => sum + (Number(v.value) || 0), 0),
    [voterData]
  );

  const renderPieLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;

    // avoid clutter for tiny slices
    if (!percent || percent < 0.05) return null;

    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={700}
        fill="#111827"
      >
        {(percent * 100).toFixed(0)}%
      </text>
    );
  };

  // ===== RECENT ACTIVITIES (DYNAMIC) =====
  const fetchRecentActivities = async () => {
    setLoadingActivities(true);
    try {
      const res = await api.get<RecentActivityApiRow[]>(
        "/api/transactions/recent?limit=5"
      );

      const rows = Array.isArray(res.data) ? res.data : [];

      const mapped = rows.map((r) => ({
        action: `${r.account ?? "Someone"} ${String(r.action ?? "")
          .toLowerCase()
          .trim()} ${r.module ?? ""}`.trim(),
        name: r.details,
        time: r.timestamp
          ? new Date(r.timestamp).toLocaleString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          : "",
      }));

      setActivities(mapped);
    } catch (e) {
      console.error("Failed to fetch recent activities:", e);
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    fetchRecentActivities(); // first load
    const interval = setInterval(fetchRecentActivities, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Update time every second
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const date = now.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      const time = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setCurrentDateTime(`${date} | ${time}`);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch dashboard stats + resident type stats
  useEffect(() => {
    let isMounted = true;

    const fetchDashboardStats = async () => {
      setLoadingStats(true);

      try {
        // 1) Cards + voters
        const res = await api.get<DashboardStatsResponse>("/api/dashboard/stats");
        const data = res.data || {};

        const totalResidents = Number(data.totalResidents ?? 0);
        const totalOfficials = Number(data.totalOfficials ?? 0);
        const pendingRequests = Number(data.pendingRequests ?? 0);
        const documentsToPickup = Number(
          data.readyPickup ?? data.documentsToPickup ?? 0
        );

        if (!isMounted) return;

        setStats({
          totalResidents,
          totalOfficials,
          pendingRequests,
          documentsToPickup,
        });

        // Voters
        const registered = Number(data?.voters?.registered ?? 0);
        const notRegistered = Number(
          data?.voters?.not_registered ?? data?.voters?.notRegistered ?? 0
        );

        setVoterData([
          { name: "Registered", value: registered, fill: "#2dadfc" },
          { name: "Not Registered", value: notRegistered, fill: "#ffa62e" },
        ]);

        // 2) Residents bar chart by type
        try {
          const typeRes = await api.get<ResidentTypeStatsResponse>(
            "/api/stats/resident-types"
          );

          const rows = Array.isArray(typeRes.data?.data) ? typeRes.data.data : [];

          const chart = rows
            .map((r) => ({
              category: String(r.type ?? "").trim(),
              value: Number(r.count ?? 0),
            }))
            .filter((r) => r.category.length > 0);

          if (!isMounted) return;

          if (chart.length > 0) {
            setResidentData(chart);
          } else {
            setResidentData([{ category: "Total Residents", value: totalResidents }]);
          }
        } catch (e) {
          console.error("Failed to fetch resident type stats:", e);
          if (!isMounted) return;
          setResidentData([{ category: "Total Residents", value: totalResidents }]);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        if (!isMounted) return;

        setStats({
          totalResidents: 0,
          totalOfficials: 0,
          pendingRequests: 0,
          documentsToPickup: 0,
        });
        setResidentData([]);
        setVoterData([]);
        // IMPORTANT: don't setActivities([]) here (prevents flicker/override)
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    };

    fetchDashboardStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const statText = (n: number) => (loadingStats ? "—" : String(n));
  const hasResidentChart = residentData.length > 0;
  const hasVoterChart = voterData.length > 0;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {/* Header */}
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
            <p className="text-xs text-gray-700 mb-2">
              Total Registered Barangay Officials
            </p>
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

      {/* Charts */}
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
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value">
                      {residentData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={RESIDENT_TYPE_COLOR[entry.category] ?? "#949494"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-sm text-gray-500">
                  No resident chart data available.
                </div>
              )}
            </div>

            {hasResidentChart && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                {residentData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3"
                      style={{
                        backgroundColor:
                          RESIDENT_TYPE_COLOR[item.category] ?? "#949494",
                      }}
                    />
                    <span className="text-[11px] text-gray-600">{item.category}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voters Pie Chart (Enhanced: Total + % Labels) */}
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
                      innerRadius={55}
                      outerRadius={90}
                      labelLine={false}
                      label={renderPieLabel}
                      dataKey="value"
                    >
                      {voterData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>

                    {/* Center total */}
                    <text
                      x="50%"
                      y="48%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={18}
                      fontWeight={800}
                      fill="#111827"
                    >
                      {totalVoters.toLocaleString()}
                    </text>
                    <text
                      x="50%"
                      y="58%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={11}
                      fontWeight={500}
                      fill="#6B7280"
                    >
                      Total Voters
                    </text>

                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-sm text-gray-500">
                  No voter chart data available.
                </div>
              )}
            </div>

            {/* Legend with count + percent */}
            {hasVoterChart && totalVoters > 0 && (
              <div className="flex justify-center gap-6 mt-4 flex-wrap">
                {voterData.map((item, index) => {
                  const value = Number(item.value) || 0;
                  const pct = (value / totalVoters) * 100;
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-[11px] text-gray-600">
                        {item.name}:{" "}
                        <span className="font-semibold text-gray-900">
                          {value.toLocaleString()}
                        </span>{" "}
                        <span className="text-gray-500">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities (Dynamic) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Activities
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loadingActivities ? (
            <div className="text-sm text-gray-500">Loading recent activities…</div>
          ) : activities.length === 0 ? (
            <div className="text-sm text-gray-500">No recent activities yet.</div>
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
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {activity.time}
                    </span>
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