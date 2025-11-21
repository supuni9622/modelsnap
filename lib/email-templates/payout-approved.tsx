import { BaseEmail } from "./base";
import { Text, Button, Section, Row } from "@react-email/components";

interface PayoutApprovedEmailProps {
  modelName: string;
  amount: number;
  payoutRequestId: string;
  dashboardUrl: string;
}

export function PayoutApprovedEmail({
  modelName,
  amount,
  payoutRequestId,
  dashboardUrl,
}: PayoutApprovedEmailProps) {
  return (
    <BaseEmail
      preview={`Your payout request of $${amount.toFixed(2)} has been approved`}
      title="Payout Request Approved"
    >
      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Hello {modelName},
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Great news! Your payout request of <strong>${amount.toFixed(2)}</strong> has been approved
        and is now being processed.
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Payout Request ID: <strong>{payoutRequestId}</strong>
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "30px" }}>
        You will receive payment according to your selected payment method. Processing typically
        takes 3-5 business days.
      </Text>

      <Row>
        <Section style={{ textAlign: "center" as const, margin: "30px 0" }}>
          <Button
            href={`${dashboardUrl}/app/model/dashboard`}
            style={{
              backgroundColor: "#10b981",
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

