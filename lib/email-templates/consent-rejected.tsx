import { BaseEmail } from "./base";
import { Text, Section } from "@react-email/components";

interface ConsentRejectedEmailProps {
  businessName: string;
  modelName: string;
  dashboardUrl: string;
}

export function ConsentRejectedEmail({
  businessName,
  modelName,
  dashboardUrl,
}: ConsentRejectedEmailProps) {
  return (
    <BaseEmail
      preview={`${modelName} has rejected your consent request`}
      title="Consent Request Rejected"
    >
      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Hello {businessName},
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Unfortunately, <strong>{modelName}</strong> has rejected your consent request.
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "30px" }}>
        You will not be able to use this model's profile for generating fashion images.
        You can browse other available models in the marketplace.
      </Text>

      <Section
        style={{
          backgroundColor: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "6px",
          padding: "20px",
          margin: "20px 0",
        }}
      >
        <Text
          style={{
            fontSize: "14px",
            color: "#991b1b",
            margin: "0",
            textAlign: "center" as const,
          }}
        >
          You can explore other models in the marketplace to find the perfect fit for
          your fashion photography needs.
        </Text>
      </Section>
    </BaseEmail>
  );
}

