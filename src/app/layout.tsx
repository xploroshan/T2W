import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  metadataBase: new URL("https://taleson2wheels.com"),
  title: {
    default:
      "T2W - Tales on 2 Wheels | Motorcycle Rides in Bangalore & India",
    template: "%s | T2W - Tales on 2 Wheels",
  },
  description:
    "India’s premier motorcycle riding community based in Bangalore, Karnataka. Group rides to Ladakh, Nepal, Thailand, Dhanushkodi, Munnar, Goa, Rajasthan across India. Every ride tells a story.. Tales on 2 Wheels - where every ride tells a story.",
  keywords: [
    "motorcycle rides Bangalore",
    "group riding Bangalore",
    "motorcycle rides India",
    "bike tours India",
    "motorcycle community Bangalore",
    "Bangalore biking group",
    "Nandi Hills bike ride",
    "Coorg motorcycle ride",
    "Chikmagalur bike tour",
    "weekend bike rides Bangalore",
    "motorcycle touring India",
    "Royal Enfield group rides",
    "KTM adventure rides India",
    "motorcycle club Karnataka",
    "Tales on 2 Wheels",
    "T2W rides",
    "BMW GS travel India",
    "riding community India",
    "bike trips from Bangalore",
    "motorcycle rides near me",
    "group motorcycle tours",
    "Hampi bike ride",
    "Western Ghats motorcycle ride",
    "South India bike tours",
    "Bengaluru Motorcycle Club",
    "Bangalore Motorcycle Club",
    "Ladakh bike trip",
    "Spiti Valley motorcycle ride",
    "best motorcycle rides India",
    "biker community India",
    "moto vlog India",
    "motorcycle adventure India",
    "ride with us India",
    "two wheeler tours Bangalore",
    "moto touring Karnataka",
    "biker gang Bangalore",
    "motorcycle expedition India",
    "biker club registration India",
    "bike ride registration online",
  ],
  authors: [{ name: "Tales on 2 Wheels" }],
  creator: "T2W Team",
  publisher: "Tales on 2 Wheels",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://taleson2wheels.com",
    siteName: "Tales on 2 Wheels",
    title:
      "T2W - Tales on 2 Wheels | Motorcycle Rides in Bangalore & Across India",
    description:
      "Join India's premier motorcycle riding community. Discover epic group rides from Bangalore & across India. Register for upcoming tours and connect with passionate riders.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Tales on 2 Wheels - Motorcycle Riding Community India",
      },
      {
        url: "/og-image-square.jpg",
        width: 1080,
        height: 1080,
        alt: "Tales on 2 Wheels - Motorcycle Riding Community India",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "T2W - Tales on 2 Wheels | Motorcycle Rides India",
    description:
      "India's premier motorcycle riding community. Group rides from Bangalore & across India. Every ride tells a story.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "https://taleson2wheels.com",
  },
  category: "Sports & Recreation",
  other: {
    "msapplication-TileColor": "#0f0f0f",
    "theme-color": "#e94560",
    "pinterest-rich-pin": "true",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://taleson2wheels.com/#organization",
  name: "Tales on 2 Wheels",
  alternateName: ["T2W", "Tales on Two Wheels", "T2W Rides"],
  url: "https://taleson2wheels.com",
  logo: {
    "@type": "ImageObject",
    url: "https://taleson2wheels.com/logo.png",
    width: 512,
    height: 512,
  },
  image: "https://taleson2wheels.com/og-image.jpg",
  description:
    "India's premier motorcycle riding community based in Bangalore. Organizing group rides, motorcycle tours, and building a passionate riding community across India since 2023.",
  foundingDate: "2023",
  foundingLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bangalore",
      addressRegion: "Karnataka",
      addressCountry: "IN",
    },
  },
  areaServed: [
    { "@type": "Country", name: "India" },
    { "@type": "State", name: "Karnataka" },
    { "@type": "City", name: "Bangalore" },
    { "@type": "City", name: "Mysore" },
    { "@type": "City", name: "Mangalore" },
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "taleson2wheels.official@gmail.com",
    contactType: "customer service",
    availableLanguage: ["English", "Hindi", "Kannada"],
  },
  sameAs: [
    "https://instagram.com/taleson2wheels",
    "https://youtube.com/@taleson2wheels",
    "https://facebook.com/taleson2wheels",
  ],
  knowsAbout: [
    "Motorcycle touring",
    "Group motorcycle rides",
    "Motorcycle safety",
    "Adventure motorcycling",
    "Motorcycle travel India",
    "Bike tours Karnataka",
    "Long distance motorcycle rides",
    "Ladakh bike trip",
    "Royal Enfield touring",
    "KTM adventure riding",
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Motorcycle Rides & Tours",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Group Motorcycle Rides",
          description: "Organised group motorcycle rides across India",
        },
      },
    ],
  },
  speakable: {
    "@type": "SpeakableSpecification",
    cssSelector: ["h1", "h2", ".hero-description"],
  },
  numberOfEmployees: {
    "@type": "QuantitativeValue",
    value: 5,
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://taleson2wheels.com/#website",
  url: "https://taleson2wheels.com",
  name: "Tales on 2 Wheels",
  alternateName: "T2W",
  description:
    "Motorcycle riding community platform for group rides across India",
  publisher: { "@id": "https://taleson2wheels.com/#organization" },
  inLanguage: "en-IN",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://taleson2wheels.com/rides?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  "@id": "https://taleson2wheels.com/#localbusiness",
  name: "Tales on 2 Wheels - Bangalore",
  description:
    "Motorcycle riding community organizing group rides from Bangalore to destinations across Karnataka and India. Weekly rides, weekend getaways, and multi-day expeditions.",
  url: "https://taleson2wheels.com",
  email: "taleson2wheels.official@gmail.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Bangalore",
    addressRegion: "Karnataka",
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 12.9716,
    longitude: 77.5946,
  },
  openingHours: "Sa 06:00-18:00",
  priceRange: "₹300 - ₹25,000",
  sport: "Motorcycling",
  sameAs: [
    "https://instagram.com/taleson2wheels",
    "https://facebook.com/taleson2wheels",
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://taleson2wheels.com",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Rides",
      item: "https://taleson2wheels.com/rides",
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "Blogs",
      item: "https://taleson2wheels.com/blogs",
    },
    {
      "@type": "ListItem",
      position: 4,
      name: "Guidelines",
      item: "https://taleson2wheels.com/guidelines",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <head>
        <meta name="theme-color" content="#e94560" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Courgette&family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
          }}
        />
      </head>
      <body className="min-h-screen bg-t2w-dark font-sans antialiased">
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
