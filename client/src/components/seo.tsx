import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: "website" | "video.movie" | "video.tv_show" | "article" | "profile";
  keywords?: string[];
  robots?: string;
  imageAlt?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const DEFAULT_IMAGE = "https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png";
const DEFAULT_ROBOTS = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";

export function SEO({ 
  title, 
  description, 
  canonical, 
  image = DEFAULT_IMAGE,
  type = "website",
  keywords,
  robots = DEFAULT_ROBOTS,
  imageAlt = `${title} | StreamVault`,
  structuredData,
}: SEOProps) {
  const fullTitle = title.includes("StreamVault") ? title : `${title} | StreamVault`;
  const url = canonical || "https://streamvault.live";
  const serializedStructuredData = structuredData
    ? JSON.stringify(Array.isArray(structuredData) ? structuredData : [structuredData])
    : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
      {keywords && keywords.length > 0 && <meta name="keywords" content={keywords.join(", ")} />}
      <link rel="canonical" href={url} />
      
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="StreamVault" />
      <meta property="og:locale" content="en_US" />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={imageAlt} />
      {serializedStructuredData && (
        <script type="application/ld+json">{serializedStructuredData}</script>
      )}
    </Helmet>
  );
}
