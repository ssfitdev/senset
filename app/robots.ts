import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/(protected)/",
        "/exam/",
      ],
    },
    sitemap: "https://sensorium.ssfkerala.org/sitemap.xml",
  };
}
