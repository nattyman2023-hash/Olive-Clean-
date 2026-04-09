import { Helmet } from "react-helmet-async";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/seo";

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  canonicalPath?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  noindex?: boolean;
}

export default function SEOHead({ title, description, keywords, ogImage, canonicalPath, jsonLd, noindex }: SEOHeadProps) {
  const image = ogImage || DEFAULT_OG_IMAGE;
  const canonical = canonicalPath ? `${SITE_URL}${canonicalPath}` : undefined;
  const jsonLdArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {canonical && <link rel="canonical" href={canonical} />}
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      {canonical && <meta property="og:url" content={canonical} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {jsonLdArray.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
}
