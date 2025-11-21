import { BaseEmail } from "./base";
import { Text, Button, Section, Row } from "@react-email/components";

interface PayoutCompletedEmailProps {
  modelName: string;
  amount: number;
  transactionRef: string;
  paymentMethod: string;
  dashboardUrl: string;
}

export function PayoutCompletedEmail({
  modelName,
  amount,
  transactionRef,
  paymentMethod,
  dashboardUrl,
}: PayoutCompletedEmailProps) {
  return (
    <BaseEmail
      preview={`Your payout of $${amount.toFixed(2)} has been completed`}
      title="Payout Completed"
    >
      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Hello {modelName},
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Your payout of <strong>${amount.toFixed(2)}</strong> has been successfully completed and
        sent to your {paymentMethod} account.
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Transaction Reference: <strong>{transactionRef}</strong>
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "30px" }}>
        The funds should appear in your account within 1-3 business days, depending on your payment
        method.
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

