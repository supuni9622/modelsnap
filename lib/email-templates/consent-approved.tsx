import { BaseEmail } from "./base";
import { Text, Button, Section, Row } from "@react-email/components";

interface ConsentApprovedEmailProps {
  businessName: string;
  modelName: string;
  dashboardUrl: string;
}

export function ConsentApprovedEmail({
  businessName,
  modelName,
  dashboardUrl,
}: ConsentApprovedEmailProps) {
  return (
    <BaseEmail
      preview={`${modelName} has approved your consent request`}
      title="Consent Request Approved"
    >
      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Hello {businessName},
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Great news! <strong>{modelName}</strong> has approved your consent request.
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "30px" }}>
        You can now use this model's profile for generating fashion images. Each
        generation will cost $2.00, which will be paid as a royalty to the model.
      </Text>

      <Row>
        <Section style={{ textAlign: "center" as const, margin: "30px 0" }}>
          <Button
            href={`${dashboardUrl}/models`}
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
            Browse Models
          </Button>
        </Section>
      </Row>
    </BaseEmail>
  );
}

