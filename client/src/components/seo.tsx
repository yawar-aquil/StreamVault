import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: "website" | "video.movie" | "video.tv_show";
}

export function SEO({ 
  title, 
  description, 
  canonical, 
  image = "https://i.ibb.co/N2jssrLd/17e34644-29fb-4a5d-a2e8-e96bee27756f.png",
  type = "website" 
}: SEOProps) {
  const fullTitle = title.includes("StreamVault") ? title : `${title} | StreamVault`;
  const url = canonical || "https://streamvault.live";

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      
      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
