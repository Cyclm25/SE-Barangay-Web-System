import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { History, Search, User, Shield, Calendar, FileCheck, ShieldAlert, UserX } from "lucide-react";

interface Transaction {
  id: string;
  timestamp: string;
  account: string;
  accountType: string;
  action: string;
  details: string;
  module: string;
}

interface ApiResponse {
  transactions: Transaction[];
}

type ResidentLookupRow = {
  ResidentID: string;
  FirstName?: string | null;
  MiddleName?: string | null;
  LastName?: string | null;
};

type ActivityKind =
  | "resident_created"
  | "account_deactivated"
  | "request_approved"
  | "failed_login"
  | "general";

function formatTimestamp(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function buildResidentDisplayName(row: ResidentLookupRow) {
  return [row.FirstName, row.MiddleName, row.LastName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function formatTransactionDetails(details: string, residentNames: Record<string, string>) {
  const raw = String(details ?? "").trim();
  const createdResidentMatch = raw.match(
    /^Resident Records\s*-\s*Created resident:\s*([A-Z0-9-]+)\s*\(([^)]+)\)\s*$/i
  );

  if (createdResidentMatch) {
    const residentId = createdResidentMatch[1];
    const status = createdResidentMatch[2];
    const residentName = residentNames[residentId];

    if (residentName) {
      return `Resident Records - Created resident: ${residentName} ${residentId} (${status})`;
    }
  }

  return raw;
}

export function TransactionHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<'all' | '1' | '7' | '30' | 'custom'>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [residentNames, setResidentNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("http://localhost:5001/api/transactions", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `Request failed: ${res.status}`);
        }

        const data = (await res.json()) as ApiResponse;

        const residentsRes = await fetch("http://localhost:5001/residents", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        let residentNameMap: Record<string, string> = {};
        if (residentsRes.ok) {
          const residentsData = (await residentsRes.json()) as {
            residents?: ResidentLookupRow[];
          };
          residentNameMap = Object.fromEntries(
            (residentsData.residents ?? [])
              .map((resident) => [resident.ResidentID, buildResidentDisplayName(resident)])
              .filter((entry) => entry[0] && entry[1])
          );
        }

        if (!alive) return;
        setTransactions(data.transactions ?? []);
        setResidentNames(residentNameMap);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load transactions");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    const q = searchTerm.toLowerCase();
    const now = new Date();

    return transactions.filter((t) => {
      const matchesSearch =
        (t.account ?? "").toLowerCase().includes(q) ||
        (t.action ?? "").toLowerCase().includes(q) ||
        formatTransactionDetails(t.details ?? "", residentNames).toLowerCase().includes(q) ||
        (t.module ?? "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (dateFilter === 'all') return true;

      const ts = new Date(t.timestamp);
      if (Number.isNaN(ts.getTime())) return true;

      if (dateFilter === 'custom') {
        const from = customFrom ? new Date(customFrom + 'T00:00:00') : null;
        const to = customTo ? new Date(customTo + 'T23:59:59') : null;
        if (from && ts < from) return false;
        if (to && ts > to) return false;
        return true;
      }

      const days = parseInt(dateFilter);
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - days);
      return ts >= cutoff;
    });
  }, [transactions, searchTerm, residentNames, dateFilter, customFrom, customTo]);

  const computedStats = useMemo(() => {
    const total = transactions.length;

    const adminActions = transactions.filter(
      (t) => (t.accountType || "").toLowerCase() === "admin"
    ).length;

    const residentActions = total - adminActions;

    return { total, adminActions, residentActions };
  }, [transactions]);

  const recentActivityFeed = useMemo(() => {
    const classifyActivity = (transaction: Transaction): ActivityKind => {
      const action = String(transaction.action ?? "").toLowerCase();
      const details = String(transaction.details ?? "").toLowerCase();
      const module = String(transaction.module ?? "").toLowerCase();
      const combined = `${action} ${details} ${module}`;

      if (combined.includes("created resident account") || combined.includes("created resident")) {
        return "resident_created";
      }
      if (combined.includes("deactivate") || combined.includes("inactive")) {
        return "account_deactivated";
      }
      if (combined.includes("approved")) {
        return "request_approved";
      }
      if (combined.includes("failed login") || combined.includes("login failed")) {
        return "failed_login";
      }
      return "general";
    };

    const buildLabel = (transaction: Transaction, kind: ActivityKind) => {
      switch (kind) {
        case "resident_created":
          return `${transaction.account} created a resident account`;
        case "account_deactivated":
          return `${transaction.account} deactivated an account`;
        case "request_approved":
          return `${transaction.account} approved a request`;
        case "failed_login":
          return `${transaction.account} had a failed login attempt`;
        default:
          return `${transaction.account} ${String(transaction.action ?? "").toLowerCase()}`.trim();
      }
    };

    return transactions
      .map((transaction) => {
        const kind = classifyActivity(transaction);
        return {
          ...transaction,
          kind,
          label: buildLabel(transaction, kind),
        };
      })
      .filter(
        (transaction) =>
          transaction.kind === "resident_created" ||
          transaction.kind === "account_deactivated" ||
          transaction.kind === "request_approved" ||
          transaction.kind === "failed_login"
      )
      .slice(0, 6);
  }, [transactions]);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <History className="w-7 h-7" />
          Transaction History
        </h1>
        <p className="text-gray-600 mt-1">
          View all system activities and actions performed
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? "…" : computedStats.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <History className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Admin Actions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? "…" : computedStats.adminActions}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resident Actions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {loading ? "…" : computedStats.residentActions}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              All Transactions
            </CardTitle>

            <div className="flex flex-wrap items-center gap-3">
              {/* Date Filter Buttons */}
              <div className="flex items-center gap-1">
                {(['all', '1', '7', '30'] as const).map((val) => (
                  <button
                    key={val}
                    onClick={() => { setDateFilter(val); setCustomFrom(''); setCustomTo(''); }}
                    className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
                      dateFilter === val
                        ? 'bg-[#2957a1] text-white border-[#2957a1]'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                    disabled={loading}
                  >
                    {val === 'all' ? 'All' : val === '1' ? 'Today' : val === '7' ? 'Last 7 Days' : 'Last 30 Days'}
                  </button>
                ))}
                <button
                  onClick={() => setDateFilter('custom')}
                  className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
                    dateFilter === 'custom'
                      ? 'bg-[#2957a1] text-white border-[#2957a1]'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                  disabled={loading}
                >
                  Custom
                </button>
              </div>

              {/* Custom Date Range */}
              {dateFilter === 'custom' && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-gray-500">From</Label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    max={customTo || undefined}
                    className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white"
                  />
                  <Label className="text-xs text-gray-500">To</Label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    min={customFrom || undefined}
                    className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white"
                  />
                </div>
              )}

              {/* Search */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Search:</Label>
                <div className="relative w-64">
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by account, action, details..."
                    className="pr-8"
                    disabled={loading}
                  />
                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#2957a1]">
                <TableRow className="hover:bg-[#2957a1] border-b-0">
                  <TableHead className="text-white font-bold text-xs">
                    TIMESTAMP
                  </TableHead>
                  <TableHead className="text-white font-bold text-xs">
                    ACCOUNT
                  </TableHead>
                  <TableHead className="text-white font-bold text-xs">
                    TYPE
                  </TableHead>
                  <TableHead className="text-white font-bold text-xs">
                    ACTION
                  </TableHead>
                  <TableHead className="text-white font-bold text-xs">
                    DETAILS
                  </TableHead>
                  <TableHead className="text-white font-bold text-xs">
                    MODULE
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm py-6 text-gray-500">
                      Loading transactions…
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction, index) => {
                    const isAdmin =
                      transaction.accountType?.toLowerCase() === "admin";

                    return (
                      <TableRow
                        key={transaction.id}
                        className={`hover:bg-gray-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                          }`}
                      >
                        <TableCell className="text-xs py-3 font-mono">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {formatTimestamp(transaction.timestamp)}
                          </div>
                        </TableCell>

                        <TableCell className="text-xs py-3 font-medium">
                          {transaction.account}
                        </TableCell>

                        <TableCell className="text-xs py-3">
                          {isAdmin ? (
                            <span className="flex items-center gap-1 text-purple-700">
                              <Shield className="w-3 h-3" />
                              Admin
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-green-700">
                              <User className="w-3 h-3" />
                              Resident
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs py-3 font-semibold text-[#2957a1]">
                          {transaction.action}
                        </TableCell>

                        <TableCell className="text-xs py-3 text-gray-700">
                          {formatTransactionDetails(transaction.details, residentNames)}
                        </TableCell>

                        <TableCell className="text-xs py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-[10px] font-semibold ${isAdmin
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                              }`}
                          >
                            {transaction.module}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {!loading && filteredTransactions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No transactions found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div >
  );
}
