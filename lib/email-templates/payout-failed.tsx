import { BaseEmail } from "./base";
import { Text, Button, Section, Row } from "@react-email/components";

interface PayoutFailedEmailProps {
  modelName: string;
  amount: number;
  payoutRequestId: string;
  failureReason: string;
  supportUrl: string;
  dashboardUrl: string;
}

export function PayoutFailedEmail({
  modelName,
  amount,
  payoutRequestId,
  failureReason,
  supportUrl,
  dashboardUrl,
}: PayoutFailedEmailProps) {
  return (
    <BaseEmail
      preview={`Payout request of $${amount.toFixed(2)} could not be processed`}
      title="Payout Processing Failed"
    >
      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Hello {modelName},
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        We encountered an issue processing your payout request of{" "}
        <strong>${amount.toFixed(2)}</strong>.
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Payout Request ID: <strong>{payoutRequestId}</strong>
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        <strong>Reason:</strong> {failureReason}
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Your funds remain in your account balance and you can submit a new payout request once the
        issue is resolved.
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "30px" }}>
        If you need assistance, please contact our support team.
      </Text>

      <Row>
        <Section style={{ textAlign: "center" as const, margin: "30px 0" }}>
          <Button
            href={supportUrl}
            style={{
              backgroundColor: "#ef4444",
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
            Contact Support
          </Button>
          <Button
            href={`${dashboardUrl}/app/model/dashboard`}
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
            View Dashboard
          </Button>
        </Section>
      </Row>
    </BaseEmail>
  );
}

