import { BaseEmail } from "./base";
import { Text, Button, Section, Row } from "@react-email/components";

interface InvoiceNotificationEmailProps {
  userName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  invoiceUrl: string;
  pdfUrl?: string;
  dashboardUrl: string;
}

export function InvoiceNotificationEmail({
  userName,
  invoiceNumber,
  amount,
  currency,
  invoiceUrl,
  pdfUrl,
  dashboardUrl,
}: InvoiceNotificationEmailProps) {
  return (
    <BaseEmail
      preview={`Invoice ${invoiceNumber} for ${currency.toUpperCase()} ${amount.toFixed(2)}`}
      title="Invoice Available"
    >
      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Hello {userName},
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Your invoice <strong>{invoiceNumber}</strong> is now available.
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        <strong>Amount:</strong> {currency.toUpperCase()} {amount.toFixed(2)}
      </Text>

      <Row>
        <Section style={{ textAlign: "center" as const, margin: "30px 0" }}>
          <Button
            href={invoiceUrl}
            style={{
              backgroundColor: "#3b82f6",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "6px",
              textDecoration: "none",
              display: "inline-block",
              fontSize: "16px",
              fontWeight: "600",
              marginRight: "10px",
            }}
          >
            View Invoice
          </Button>
          {pdfUrl && (
            <Button
              href={pdfUrl}
              style={{
                backgroundColor: "#6b7280",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "6px",
                textDecoration: "none",
                display: "inline-block",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              Download PDF
            </Button>
          )}
        </Section>
      </Row>

      <Text style={{ fontSize: "14px", color: "#6b7280", marginTop: "30px" }}>
        You can also view all your invoices in your billing dashboard.
      </Text>
    </BaseEmail>
  );
}

