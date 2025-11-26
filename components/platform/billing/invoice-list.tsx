"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, FileText, ExternalLink } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  amountDue: number;
  currency: string;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
  pdfUrl?: string;
  hostedInvoiceUrl?: string;
  createdAt: string;
  paidAt?: string;
  periodStart?: string;
  periodEnd?: string;
}

export function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices?page=${page}&limit=10`);
      const data = await response.json();

      if (data.status === "success") {
        setInvoices(data.data.invoices || []);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const getStatusBadge = (status: Invoice["status"]) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      open: "secondary",
      draft: "outline",
      uncollectible: "destructive",
      void: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Convert from cents
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
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground mt-2">
          View and download your payment invoices
        </p>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No invoices found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Invoices will appear here after you make a payment
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>
                {pagination.total} invoice{pagination.total !== 1 ? "s" : ""} total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div
                    key={invoice._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(invoice.status)}
                        <span className="font-semibold">
                          {invoice.invoiceNumber || `INV-${invoice._id.slice(-8)}`}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          Amount: {formatCurrency(invoice.amountDue, invoice.currency)}
                        </p>
                        <p>
                          Date: {format(new Date(invoice.createdAt), "MMM dd, yyyy")}
                        </p>
                        {invoice.paidAt && (
                          <p>
                            Paid: {format(new Date(invoice.paidAt), "MMM dd, yyyy")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {invoice.pdfUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" />
                            PDF
                          </a>
                        </Button>
                      )}
                      {invoice.hostedInvoiceUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/app/invoices/${invoice._id}`}>
                          Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={!pagination.hasPrevPage}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={!pagination.hasNextPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

