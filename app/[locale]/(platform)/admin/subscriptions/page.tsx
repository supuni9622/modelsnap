import { Metadata } from "next";
import { connectDB } from "@/lib/db";
import User from "@/models/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Subscription Management | Admin | ModelSnap.ai",
};

async function getSubscriptions(page = 1, limit = 10) {
  await connectDB();
  const skip = (page - 1) * limit;

  const query = {
    "plan.type": { $ne: "free" },
  };

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(query),
  ]);

  return { subscriptions: users, total, page, limit };
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = parseInt(searchParams.page || "1", 10);
  const { subscriptions, total } = await getSubscriptions(page, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage subscriptions and process bank transfer payments
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions</CardTitle>
          <CardDescription>
            {total} active subscription{total !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub: any) => (
                  <TableRow key={sub._id}>
                    <TableCell>{sub.emailAddress?.[0] || "N/A"}</TableCell>
                    <TableCell>
                      {sub.firstName} {sub.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.plan?.isPremium ? "default" : "secondary"}>
                        {sub.plan?.name || sub.plan?.type || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub.plan?.price ? `LKR ${sub.plan.price}` : "N/A"}
                    </TableCell>
                    <TableCell>{sub.credits || 0}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        Update
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {subscriptions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No active subscriptions found.</p>
            </div>
          )}

          {/* Pagination */}
          {total > 10 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(total / 10)}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`?page=${page - 1}`}>Previous</a>
                  </Button>
                )}
                {page < Math.ceil(total / 10) && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`?page=${page + 1}`}>Next</a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank Transfer Workflow</CardTitle>
          <CardDescription>
            Manually approve bank transfer payments and update user subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Instructions:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Receive bank transfer payment notification</li>
                <li>Verify payment in bank account</li>
                <li>Find user by email in the subscriptions table above</li>
                <li>Click "Update" to modify their plan and credits</li>
                <li>Mark payment as processed</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

