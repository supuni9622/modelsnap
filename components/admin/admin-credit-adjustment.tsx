"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Minus, History, User as UserIcon, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string[];
  credits: number;
}

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
  userId: {
    id: string;
    firstName?: string;
    lastName?: string;
    emailAddress?: string[];
  };
  adminUserId?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
}

export function AdminCreditAdjustment() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter an email or user ID");
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (data.status === "success") {
        setUsers(data.data.users || []);
        if (data.data.users.length === 0) {
          toast.info("No users found");
        }
      } else {
        toast.error(data.message || "Failed to search users");
      }
    } catch (error) {
      toast.error("Failed to search users");
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdjust = async () => {
    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }

    const adjustmentAmount = parseFloat(amount);
    if (isNaN(adjustmentAmount) || adjustmentAmount === 0) {
      toast.error("Please enter a valid non-zero amount");
      return;
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for this adjustment");
      return;
    }

    setIsAdjusting(true);
    try {
      const response = await fetch("/api/admin/credits/adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          amount: adjustmentAmount,
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        toast.success(
          `Credits ${adjustmentAmount > 0 ? "added" : "deducted"} successfully. New balance: ${data.data.newBalance}`
        );
        // Update selected user's credits
        setSelectedUser({
          ...selectedUser,
          credits: data.data.newBalance,
        });
        // Reset form
        setAmount("");
        setReason("");
        // Refresh history if showing
        if (showHistory) {
          loadTransactionHistory();
        }
      } else {
        toast.error(data.message || "Failed to adjust credits");
      }
    } catch (error) {
      toast.error("Failed to adjust credits");
      console.error(error);
    } finally {
      setIsAdjusting(false);
    }
  };

  const loadTransactionHistory = async () => {
    if (!selectedUser) return;

    setLoadingHistory(true);
    try {
      const response = await fetch(
        `/api/admin/credits/transactions?userId=${selectedUser.id}&limit=50`
      );
      const data = await response.json();

      if (data.status === "success") {
        setTransactions(data.data.transactions || []);
      } else {
        toast.error(data.message || "Failed to load transaction history");
      }
    } catch (error) {
      toast.error("Failed to load transaction history");
      console.error(error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistory && selectedUser) {
      loadTransactionHistory();
    }
  }, [showHistory, selectedUser]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Credit Adjustment</h2>
        <p className="text-muted-foreground mt-2">
          Manually adjust user credits with transaction history tracking
        </p>
      </div>

      {/* User Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search User</CardTitle>
          <CardDescription>Find user by email or user ID</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter email or user ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  searchUsers();
                }
              }}
            />
            <Button onClick={searchUsers} disabled={isSearching}>
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          {/* User Results */}
          {users.length > 0 && (
            <div className="space-y-2">
              <Label>Select User:</Label>
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedUser?.id === user.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => {
                    setSelectedUser(user);
                    setShowHistory(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.emailAddress?.[0]}</p>
                      </div>
                    </div>
                    <Badge variant="outline">Credits: {user.credits || 0}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Adjustment Form */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle>Adjust Credits</CardTitle>
            <CardDescription>
              Current balance: <strong>{selectedUser.credits || 0} credits</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Adjustment Amount</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const current = parseFloat(amount) || 0;
                    setAmount((current + 10).toString());
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount (positive to add, negative to deduct)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const current = parseFloat(amount) || 0;
                    setAmount((current - 10).toString());
                  }}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use positive numbers to add credits, negative to deduct
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for this adjustment (required)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAdjust} disabled={isAdjusting || !amount || !reason.trim()}>
                {isAdjusting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Apply Adjustment"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowHistory(!showHistory);
                }}
              >
                <History className="h-4 w-4 mr-2" />
                {showHistory ? "Hide" : "Show"} History
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      {showHistory && selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Credit adjustment history for this user</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transaction history found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance After</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Admin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx._id}>
                        <TableCell>{format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{tx.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={tx.amount >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}
                          >
                            {tx.amount >= 0 ? "+" : ""}
                            {tx.amount}
                          </span>
                        </TableCell>
                        <TableCell>{tx.balanceAfter}</TableCell>
                        <TableCell className="max-w-xs truncate">{tx.reason}</TableCell>
                        <TableCell>
                          {tx.adminUserId
                            ? `${tx.adminUserId.firstName || ""} ${tx.adminUserId.lastName || ""}`.trim() || "Admin"
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

