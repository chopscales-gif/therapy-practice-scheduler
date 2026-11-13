import type { MetadataRoute } from "next";

/** A demo with sample data has no business in search results. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
