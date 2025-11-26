import { BaseEmail } from "./base";
import { Text, Button, Section, Row } from "@react-email/components";

interface ConsentRequestEmailProps {
  modelName: string;
  businessName: string;
  consentRequestId: string;
  dashboardUrl: string;
}

export function ConsentRequestEmail({
  modelName,
  businessName,
  consentRequestId,
  dashboardUrl,
}: ConsentRequestEmailProps) {
  const consentUrl = `${dashboardUrl}/model/consent/${consentRequestId}`;

  return (
    <BaseEmail
      preview={`${businessName} has requested your consent to use your model profile`}
      title="New Consent Request"
    >
      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Hello {modelName},
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        <strong>{businessName}</strong> has requested your consent to use your model
        profile for their fashion photography needs.
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "30px" }}>
        Please review their request and decide whether to approve or reject it. Once
        approved, they will be able to use your model profile for generating fashion
        images.
      </Text>

      <Row>
        <Section style={{ textAlign: "center" as const, margin: "30px 0" }}>
          <Button
            href={consentUrl}
            style={{
              backgroundColor: "#3b82f6",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "6px",
              textDecoration: "none",
              display: "inline-block",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            Review Request
          </Button>
        </Section>
      </Row>

      <Text style={{ fontSize: "14px", color: "#6b7280", marginTop: "30px" }}>
        You can also view all your consent requests in your{" "}
        <a
          href={`${dashboardUrl}/model/consent`}
          style={{ color: "#3b82f6", textDecoration: "underline" }}
        >
          consent dashboard
        </a>
        .
      </Text>
    </BaseEmail>
  );
}

