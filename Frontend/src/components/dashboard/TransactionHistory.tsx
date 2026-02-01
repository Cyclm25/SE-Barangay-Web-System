import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { History, Search, User, Shield, Calendar } from 'lucide-react';

interface Transaction {
  id: string;
  timestamp: string;
  account: string;
  accountType: 'Admin' | 'Resident';
  action: string;
  details: string;
  module: string;
}

export function TransactionHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const [transactions] = useState<Transaction[]>([
    {
      id: '1',
      timestamp: '2025-01-25 14:30:45',
      account: 'Maria Santos (AD2026-0001)',
      accountType: 'Admin',
      action: 'Added New Resident',
      details: 'Added resident: Gabriel Siang Chua (2025-0002)',
      module: 'Resident Records'
    },
    {
      id: '2',
      timestamp: '2025-01-25 13:15:20',
      account: 'Maria Santos (AD2026-0001)',
      accountType: 'Admin',
      action: 'Processed Document Request',
      details: 'Approved Barangay Clearance request #REQ-2025-001',
      module: 'Online Requests'
    },
    {
      id: '3',
      timestamp: '2025-01-25 11:45:30',
      account: 'Gabriel Chua (2025-0002)',
      accountType: 'Resident',
      action: 'Submitted Document Request',
      details: 'Requested Barangay Clearance',
      module: 'Online Requests'
    },
    {
      id: '4',
      timestamp: '2025-01-24 16:20:15',
      account: 'Maria Santos (AD2026-0001)',
      accountType: 'Admin',
      action: 'Added Barangay Official',
      details: 'Added official: Juan Dela Cruz - Kagawad',
      module: 'Barangay Officials'
    },
    {
      id: '5',
      timestamp: '2025-01-24 10:05:00',
      account: 'Maria Santos (AD2026-0001)',
      accountType: 'Admin',
      action: 'Posted Announcement',
      details: 'Posted: Community Meeting Schedule',
      module: 'Announcements'
    },
    {
      id: '6',
      timestamp: '2025-01-23 09:30:00',
      account: 'Juan Dela Cruz (2025-0001)',
      accountType: 'Resident',
      action: 'Document Request Submitted',
      details: 'Requested Certificate of Indigency',
      module: 'Online Requests'
    },
    {
      id: '7',
      timestamp: '2025-01-22 15:45:30',
      account: 'Maria Santos (AD2026-0001)',
      accountType: 'Admin',
      action: 'Updated Resident Profile',
      details: 'Modified profile information for Ana Reyes (2025-0003)',
      module: 'Resident Records'
    },
    {
      id: '8',
      timestamp: '2025-01-22 11:20:00',
      account: 'Maria Santos (AD2026-0001)',
      accountType: 'Admin',
      action: 'Inactivated Resident',
      details: 'Inactivated resident: Pedro Garcia (2025-0004)',
      module: 'Resident Records'
    },
  ]);

  const filteredTransactions = transactions.filter(t =>
    t.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.module.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-12 space-y-12 bg-gray-50 min-h-full max-w-[1920px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-6xl font-bold text-gray-900 flex items-center gap-4">
          <History className="w-12 h-12" />
          Transaction History
        </h1>
        <p className="text-gray-600 mt-4 text-2xl">View all completed document requests and transactions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-semibold text-gray-900">{transactions.length}</p>
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
                  {transactions.filter(t => t.accountType === 'Admin').length}
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
                  {transactions.filter(t => t.accountType === 'Resident').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              All Transactions
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Search:</Label>
              <div className="relative w-72">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by account, action, details..."
                  className="pr-8"
                />
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#2957a1]">
                <TableRow className="hover:bg-[#2957a1] border-b-0">
                  <TableHead className="text-white font-bold text-xs">TIMESTAMP</TableHead>
                  <TableHead className="text-white font-bold text-xs">ACCOUNT</TableHead>
                  <TableHead className="text-white font-bold text-xs">TYPE</TableHead>
                  <TableHead className="text-white font-bold text-xs">ACTION</TableHead>
                  <TableHead className="text-white font-bold text-xs">DETAILS</TableHead>
                  <TableHead className="text-white font-bold text-xs">MODULE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction, index) => (
                  <TableRow 
                    key={transaction.id}
                    className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                  >
                    <TableCell className="text-xs py-3 font-mono">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {transaction.timestamp}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs py-3 font-medium">{transaction.account}</TableCell>
                    <TableCell className="text-xs py-3">
                      {transaction.accountType === 'Admin' ? (
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
                    <TableCell className="text-xs py-3 text-gray-700">{transaction.details}</TableCell>
                    <TableCell className="text-xs py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                        transaction.accountType === 'Admin' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {transaction.module}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredTransactions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No transactions found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}