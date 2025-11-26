import { BaseEmail } from "./base";
import { Text, Button, Section, Row, Img } from "@react-email/components";

interface RenderCompletionEmailProps {
  userName: string;
  imageUrl: string;
  downloadUrl: string;
  modelType: "AI_AVATAR" | "HUMAN_MODEL";
  modelName?: string;
  dashboardUrl: string;
}

export function RenderCompletionEmail({
  userName,
  imageUrl,
  downloadUrl,
  modelType,
  modelName,
  dashboardUrl,
}: RenderCompletionEmailProps) {
  return (
    <BaseEmail
      preview="Your fashion image generation is complete!"
      title="Generation Complete"
    >
      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Hello {userName},
      </Text>

      <Text style={{ fontSize: "16px", color: "#374151", marginBottom: "20px" }}>
        Your fashion image generation is complete!{" "}
        {modelType === "HUMAN_MODEL" && modelName && (
          <>The image was generated using <strong>{modelName}</strong>'s model profile.</>
        )}
      </Text>

      <Row>
        <Section style={{ textAlign: "center" as const, margin: "30px 0" }}>
          <Img
            src={imageUrl}
            alt="Generated fashion image"
            style={{
              maxWidth: "100%",
              height: "auto",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
            }}
          />
        </Section>
      </Row>

      <Row>
        <Section style={{ textAlign: "center" as const, margin: "30px 0" }}>
          <Button
            href={downloadUrl}
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
            Download Image
          </Button>
          <Button
            href={`${dashboardUrl}/app/history`}
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
            View History
          </Button>
        </Section>
      </Row>
    </BaseEmail>
  );
}

