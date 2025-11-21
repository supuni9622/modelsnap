import { BaseEmail } from "./base";
import { Text, Button, Section, Row } from "@react-email/components";

interface LowCreditWarningEmailProps {
  userName: string;
  currentCredits: number;
  threshold: number;
  upgradeUrl: string;
  dashboardUrl: string;
}

export function LowCreditWarningEmail({
  userName,
  currentCredits,
  threshold,
  upgradeUrl,
  dashboardUrl,
}: LowCreditWarningEmailProps) {
  return (
    <BaseEmail
      preview={`You have ${currentCredits} credits remaining`}
      title="Low Credit Warning"
    >
      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Hello {userName},
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        This is a friendly reminder that your account balance is running low.
      </Text>

      <Text
        style={{
          fontSize: "24px",
          color: "#ef4444",
          fontWeight: "700",
          textAlign: "center" as const,
          margin: "30px 0",
        }}
      >
        {currentCredits} Credits Remaining
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        You'll need credits to generate AI avatar images. To continue using ModelSnap.ai, consider
        upgrading your plan or purchasing additional credits.
      </Text>

      <Row>
        <Section style={{ textAlign: "center" as const, margin: "30px 0" }}>
          <Button
            href={upgradeUrl}
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
            Upgrade Plan
          </Button>
          <Button
            href={`${dashboardUrl}/app/billing`}
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
            View Billing
          </Button>
        </Section>
      </Row>
    </BaseEmail>
  );
}

