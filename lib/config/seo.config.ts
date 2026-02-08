import { Metadata } from "next";
import { SiteSettings } from "./settings";

const SEO_CONFIG: Metadata = {
  title: {
    template: `%s | ${SiteSettings.name}`,
    default: "ModelSnapper - AI Fashion Photography",
  },
  description:
    "ModelSnapper is an AI fashion photography platform that allows you to create realistic fashion photos with AI.",
  keywords:
    "fashion photography, ai fashion photography, ai model photography, ai avatar photography, ai model photos, ai avatar photos, ai model renders, ai avatar renders, ai model render, ai avatar render",
  icons: "/static/favicon.ico",
  openGraph: {
    type: "website",
    siteName: "ModelSnapper.ai",
    locale: "en_US",
    url: "https://modelsnap-oqja41jn2-model-snap-ai.vercel.app/en",
    title: "ModelSnapper.ai - AI Fashion Photography",
    description:
      "ModelSnapper is an AI fashion photography platform that allows you to create realistic fashion photos with AI.",
    images: [
      {
        url: "/dark-logo1.png",
        width: 1200,
        height: 630,
        alt: "ModelSnapper.ai - AI Fashion Photography",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@Founderflowdev",
    title: "ModelSnapper.ai - AI Fashion Photography",
    description:
      "ModelSnapper is an AI fashion photography platform that allows you to create realistic fashion photos with AI.",
    images: ["/dark-logo1.png"],
  },
};

export default SEO_CONFIG;
