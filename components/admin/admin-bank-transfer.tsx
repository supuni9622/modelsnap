"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, DollarSign, User, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  amountDue: number;
  currency: string;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
  createdAt: string;
  paidAt?: string;
  userId: {
    id: string;
    firstName?: string;
    lastName?: string;
    emailAddress?: string[];
  };
}

export function AdminBankTransfer() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await fetch("/api/admin/invoices?status=open");
      const data = await response.json();

      if (data.status === "success") {
        setInvoices(data.data.invoices || []);
      } else {
        toast.error(data.message || "Failed to load invoices");
      }
    } catch (error) {
      toast.error("Failed to load invoices");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    setProcessing(invoice._id);
    try {
      const response = await fetch(`/api/admin/invoices/${invoice._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          markAsPaid: true,
          creditsToAdd: creditsToAdd ? parseInt(creditsToAdd) : 0,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        toast.success("Invoice marked as paid successfully");
        setSelectedInvoice(null);
        setCreditsToAdd("");
        await fetchInvoices();
      } else {
        toast.error(data.message || "Failed to mark invoice as paid");
      }
    } catch (error) {
      toast.error("Failed to mark invoice as paid");
      console.error(error);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Bank Transfer Payments</h2>
        <p className="text-muted-foreground mt-2">
          Process manual bank transfer payments and mark invoices as paid
        </p>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No pending invoices</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{invoice.invoiceNumber}</CardTitle>
                    <CardDescription>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>
                            {invoice.userId?.firstName} {invoice.userId?.lastName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(invoice.createdAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    </CardDescription>
                  </div>
                  <Badge variant={invoice.status === "open" ? "default" : "secondary"}>
                    {invoice.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-bold">
                      {invoice.currency.toUpperCase()} {invoice.amountDue.toFixed(2)}
                    </span>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="default"
                        onClick={() => setSelectedInvoice(invoice)}
                        disabled={processing === invoice._id}
                      >
                        {processing === invoice._id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Mark as Paid"
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Mark Invoice as Paid</AlertDialogTitle>
                        <AlertDialogDescription>
                          Confirm that payment has been received via bank transfer for invoice{" "}
                          <strong>{invoice.invoiceNumber}</strong>.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="credits">Credits to Add (Optional)</Label>
                          <Input
                            id="credits"
                            type="number"
                            min="0"
                            placeholder="0"
                            value={creditsToAdd}
                            onChange={(e) => setCreditsToAdd(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Add credits to the user's account when marking as paid
                          </p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm font-semibold mb-2">Invoice Details:</p>
                          <div className="space-y-1 text-sm">
                            <p>
                              <span className="text-muted-foreground">Amount:</span>{" "}
                              {invoice.currency.toUpperCase()} {invoice.amountDue.toFixed(2)}
                            </p>
                            <p>
                              <span className="text-muted-foreground">User:</span>{" "}
                              {invoice.userId?.firstName} {invoice.userId?.lastName}
                            </p>
                            <p>
                              <span className="text-muted-foreground">Email:</span>{" "}
                              {invoice.userId?.emailAddress?.[0]}
                            </p>
                          </div>
                        </div>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setCreditsToAdd("")}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleMarkAsPaid(invoice)}
                          className="bg-primary text-primary-foreground"
                        >
                          Mark as Paid
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

