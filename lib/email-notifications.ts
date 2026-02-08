import { Resend } from "resend";
import { ConsentRequestEmail } from "./email-templates/consent-request";
import { ConsentApprovedEmail } from "./email-templates/consent-approved";
import { ConsentRejectedEmail } from "./email-templates/consent-rejected";
import { PayoutApprovedEmail } from "./email-templates/payout-approved";
import { PayoutCompletedEmail } from "./email-templates/payout-completed";
import { PayoutFailedEmail } from "./email-templates/payout-failed";
import { RenderCompletionEmail } from "./email-templates/render-completion";
import { InvoiceNotificationEmail } from "./email-templates/invoice-notification";
import { LowCreditWarningEmail } from "./email-templates/low-credit-warning";
import { render } from "@react-email/render";
import { createLogger } from "./utils/logger";
import React from "react";

const logger = createLogger({ component: "email-notifications" });

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@modelsnap.ai";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Send consent request email to model
 */
export async function sendConsentRequestEmail(
  modelEmail: string,
  modelName: string,
  businessName: string,
  consentRequestId: string
): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn("RESEND_API_KEY not configured, skipping email");
      return;
    }

    const emailHtml = await render(
      ConsentRequestEmail({
        modelName,
        businessName,
        consentRequestId,
        dashboardUrl: APP_URL,
      })
    );

    await resend.emails.send({
      from: FROM_EMAIL,
      to: modelEmail,
      subject: `New Consent Request from ${businessName} - ModelSnapper.ai`,
      html: emailHtml,
    });

    logger.info("Consent request email sent", {
      modelEmail,
      businessName,
      consentRequestId,
    });
  } catch (error) {
    logger.error("Failed to send consent request email", error as Error, {
      modelEmail,
      businessName,
    });
    // Don't throw - email failures shouldn't break the flow
  }
}

/**
 * Send consent approved email to business
 */
export async function sendConsentApprovedEmail(
  businessEmail: string,
  businessName: string,
  modelName: string
): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn("RESEND_API_KEY not configured, skipping email");
      return;
    }

    const emailHtml = await render(
      ConsentApprovedEmail({
        businessName,
        modelName,
        dashboardUrl: APP_URL,
      })
    );

    await resend.emails.send({
      from: FROM_EMAIL,
      to: businessEmail,
      subject: `Consent Request Approved by ${modelName} - ModelSnapper.ai`,
      html: emailHtml,
    });

    logger.info("Consent approved email sent", {
      businessEmail,
      modelName,
    });
  } catch (error) {
    logger.error("Failed to send consent approved email", error as Error, {
      businessEmail,
      modelName,
    });
  }
}

/**
 * Send consent rejected email to business
 */
export async function sendConsentRejectedEmail(
  businessEmail: string,
  businessName: string,
  modelName: string
): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn("RESEND_API_KEY not configured, skipping email");
      return;
    }

    const emailHtml = await render(
      ConsentRejectedEmail({
        businessName,
        modelName,
        dashboardUrl: APP_URL,
      })
    );

    await resend.emails.send({
      from: FROM_EMAIL,
      to: businessEmail,
      subject: `Consent Request Rejected by ${modelName} - ModelSnapper.ai`,
      html: emailHtml,
    });

    logger.info("Consent rejected email sent", {
      businessEmail,
      modelName,
    });
  } catch (error) {
    logger.error("Failed to send consent rejected email", error as Error, {
      businessEmail,
      modelName,
    });
  }
}

/**
 * Send payout approved email to model
 */
export async function sendPayoutApprovedEmail(
  modelEmail: string,
  modelName: string,
  amount: number,
  payoutRequestId: string
): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn("RESEND_API_KEY not configured, skipping email");
      return;
    }

    const emailHtml = await render(
      PayoutApprovedEmail({
        modelName,
        amount,
        payoutRequestId,
        dashboardUrl: APP_URL,
      })
    );

    await resend.emails.send({
      from: FROM_EMAIL,
      to: modelEmail,
      subject: `Payout Request Approved - $${amount.toFixed(2)} - ModelSnapper.ai`,
      html: emailHtml,
    });

    logger.info("Payout approved email sent", {
      modelEmail,
      amount,
      payoutRequestId,
    });
  } catch (error) {
    logger.error("Failed to send payout approved email", error as Error, {
      modelEmail,
      payoutRequestId,
    });
  }
}

/**
 * Send payout completed email to model
 */
export async function sendPayoutCompletedEmail(
  modelEmail: string,
  modelName: string,
  amount: number,
  transactionRef: string,
  paymentMethod: string
): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn("RESEND_API_KEY not configured, skipping email");
      return;
    }

    const emailHtml = await render(
      PayoutCompletedEmail({
        modelName,
        amount,
        transactionRef,
        paymentMethod,
        dashboardUrl: APP_URL,
      })
    );

    await resend.emails.send({
      from: FROM_EMAIL,
      to: modelEmail,
      subject: `Payout Completed - $${amount.toFixed(2)} - ModelSnapper.ai`,
      html: emailHtml,
    });

    logger.info("Payout completed email sent", {
      modelEmail,
      amount,
      transactionRef,
    });
  } catch (error) {
    logger.error("Failed to send payout completed email", error as Error, {
      modelEmail,
      transactionRef,
    });
  }
}

/**
 * Send payout failed/rejected email to model
 */
export async function sendPayoutFailedEmail(
  modelEmail: string,
  modelName: string,
  amount: number,
  payoutRequestId: string,
  failureReason: string
): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn("RESEND_API_KEY not configured, skipping email");
      return;
    }

    const supportUrl = `${APP_URL}/support`; // TODO: Update with actual support URL

    const emailHtml = await render(
      PayoutFailedEmail({
        modelName,
        amount,
        payoutRequestId,
        failureReason,
        supportUrl,
        dashboardUrl: APP_URL,
      })
    );

    await resend.emails.send({
      from: FROM_EMAIL,
      to: modelEmail,
      subject: `Payout Processing Failed - $${amount.toFixed(2)} - ModelSnapper.ai`,
      html: emailHtml,
    });

    logger.info("Payout failed email sent", {
      modelEmail,
      amount,
      payoutRequestId,
      failureReason,
    });
  } catch (error) {
    logger.error("Failed to send payout failed email", error as Error, {
      modelEmail,
      payoutRequestId,
    });
  }
}

/**
 * Send render completion email to user
 */
export async function sendRenderCompletionEmail(
  userEmail: string,
  userName: string,
  imageUrl: string,
  downloadUrl: string,
  modelType: "AI_AVATAR" | "HUMAN_MODEL",
  modelName?: string
): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn("RESEND_API_KEY not configured, skipping email");
      return;
    }

    const emailHtml = await render(
      RenderCompletionEmail({
        userName,
        imageUrl,
        downloadUrl,
        modelType,
        modelName,
        dashboardUrl: APP_URL,
      })
    );

    await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `Your Fashion Image is Ready! - ModelSnapper.ai`,
      html: emailHtml,
    });

    logger.info("Render completion email sent", {
      userEmail,
      modelType,
      modelName,
    });
  } catch (error) {
    logger.error("Failed to send render completion email", error as Error, {
      userEmail,
      modelType,
    });
  }
}

/**
 * Send invoice notification email to user
 */
export async function sendInvoiceNotificationEmail(
  userEmail: string,
  userName: string,
  invoiceNumber: string,
  amount: number,
  currency: string,
  invoiceUrl: string,
  pdfUrl?: string
): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn("RESEND_API_KEY not configured, skipping email");
      return;
    }

    const emailHtml = await render(
      InvoiceNotificationEmail({
        userName,
        invoiceNumber,
        amount,
        currency,
        invoiceUrl,
        pdfUrl,
        dashboardUrl: APP_URL,
      })
    );

    await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `Invoice ${invoiceNumber} - ${currency.toUpperCase()} ${amount.toFixed(2)} - ModelSnapper.ai`,
      html: emailHtml,
    });

    logger.info("Invoice notification email sent", {
      userEmail,
      invoiceNumber,
      amount,
    });
  } catch (error) {
    logger.error("Failed to send invoice notification email", error as Error, {
      userEmail,
      invoiceNumber,
    });
  }
}

/**
 * Send low credit warning email to user
 */
export async function sendLowCreditWarningEmail(
  userEmail: string,
  userName: string,
  currentCredits: number,
  threshold: number = 5
): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn("RESEND_API_KEY not configured, skipping email");
      return;
    }

    const upgradeUrl = `${APP_URL}/app/billing`;

    const emailHtml = await render(
      LowCreditWarningEmail({
        userName,
        currentCredits,
        threshold,
        upgradeUrl,
        dashboardUrl: APP_URL,
      })
    );

    await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `Low Credit Warning - ${currentCredits} Credits Remaining - ModelSnapper.ai`,
      html: emailHtml,
    });

    logger.info("Low credit warning email sent", {
      userEmail,
      currentCredits,
      threshold,
    });
  } catch (error) {
    logger.error("Failed to send low credit warning email", error as Error, {
      userEmail,
      currentCredits,
    });
  }
}

