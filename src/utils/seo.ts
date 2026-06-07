/**
 * Dynamic SEO and Metadata Manager for GoalSpire
 */

export function updateSEOMetadata(meta: {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  structuredData?: object;
}) {
  if (typeof document === 'undefined') return;

  // 1. Dynamic Title
  document.title = meta.title;

  const setMetaTag = (attrName: string, attrVal: string, content: string) => {
    let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // 2. Standard Meta Description
  setMetaTag('name', 'description', meta.description);

  // 3. Open Graph Metadata
  setMetaTag('property', 'og:title', meta.ogTitle || meta.title);
  setMetaTag('property', 'og:description', meta.ogDescription || meta.description);
  setMetaTag('property', 'og:type', meta.ogType || 'website');
  setMetaTag('property', 'og:url', meta.canonicalUrl || window.location.href);
  
  if (meta.ogImage) {
    setMetaTag('property', 'og:image', meta.ogImage);
  }

  // 4. Twitter Cards
  setMetaTag('name', 'twitter:card', meta.twitterCard || 'summary_large_image');
  setMetaTag('name', 'twitter:title', meta.ogTitle || meta.title);
  setMetaTag('name', 'twitter:description', meta.ogDescription || meta.description);
  if (meta.ogImage) {
    setMetaTag('name', 'twitter:image', meta.ogImage);
  }

  // 5. Canonical URLs
  let canonicalEl = document.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', meta.canonicalUrl || window.location.href);

  // 6. Structured Schema (JSON-LD Block)
  let scriptEl = document.querySelector('script[type="application/ld+json"]');
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.setAttribute('type', 'application/ld+json');
    document.head.appendChild(scriptEl);
  }
  
  if (meta.structuredData) {
    scriptEl.textContent = JSON.stringify(meta.structuredData, null, 2);
  } else {
    const fallbackSchema = {
      "@context": "https://schema.org",
      "@type": "SportsActivityLocation",
      "name": "GoalSpire",
      "description": meta.description,
      "url": meta.canonicalUrl || window.location.href,
      "logo": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'%3E%3Crect width='36' height='36' rx='10' fill='%23E8472A'/%3E%3C/svg%3E"
    };
    scriptEl.textContent = JSON.stringify(fallbackSchema, null, 2);
  }
}
