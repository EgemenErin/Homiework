export type EnrichedResource = {
  href: string;
  partnerName: string | null;
  bookshopLookupUrl: string | null;
};

const BOOKSHOP_AFFILIATE_ID =
  process.env.NEXT_PUBLIC_BOOKSHOP_AFFILIATE_ID || "homiework";
const AMAZON_AFFILIATE_TAG =
  process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || "homiework-20";
const APPLE_AFFILIATE_TOKEN =
  process.env.NEXT_PUBLIC_APPLE_AFFILIATE_TOKEN || "homiework";

const BOOK_TITLE_HINT_RE =
  /\b(book|chapter|excerpt|novel|memoir|edition|press|vol\.|isbn|bagehot|jacobs|caro|flyvbjerg|thaler|axelrod|schelling|parfit|bourdieu|smil|chayka|seth)\b/i;

/**
 * Automatically enriches book, audiobook, and media URLs with affiliate tags
 * and provides a Bookshop.org lookup link when a reading resource references a book.
 */
export function enrichResourceUrl(
  rawUrl: string,
  label: string,
  kind: "read" | "watch" | "listen" | "other",
): EnrichedResource {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "bookshop.org" || host.endsWith(".bookshop.org")) {
      if (!parsed.searchParams.has("a_aid")) {
        parsed.searchParams.set("a_aid", BOOKSHOP_AFFILIATE_ID);
      }
      return {
        href: parsed.toString(),
        partnerName: "Bookshop.org",
        bookshopLookupUrl: null,
      };
    }

    if (
      host.startsWith("amazon.") ||
      host.includes(".amazon.") ||
      host === "amzn.to" ||
      host.startsWith("audible.")
    ) {
      if (!parsed.searchParams.has("tag")) {
        parsed.searchParams.set("tag", AMAZON_AFFILIATE_TAG);
      }
      return {
        href: parsed.toString(),
        partnerName: host.startsWith("audible") ? "Audible" : "Amazon",
        bookshopLookupUrl: buildBookshopSearch(label),
      };
    }

    if (host === "books.apple.com" || host === "podcasts.apple.com") {
      if (!parsed.searchParams.has("at")) {
        parsed.searchParams.set("at", APPLE_AFFILIATE_TOKEN);
      }
      return {
        href: parsed.toString(),
        partnerName: host === "books.apple.com" ? "Apple Books" : null,
        bookshopLookupUrl: null,
      };
    }

    if (host === "kobo.com" || host === "barnesandnoble.com") {
      parsed.searchParams.set("utm_source", "homiework");
      return {
        href: parsed.toString(),
        partnerName: host === "kobo.com" ? "Kobo" : "Barnes & Noble",
        bookshopLookupUrl: buildBookshopSearch(label),
      };
    }

    // If it's a reading resource whose title looks like a book/chapter, offer a subtle Bookshop link
    if (kind === "read" && BOOK_TITLE_HINT_RE.test(label)) {
      return {
        href: rawUrl,
        partnerName: null,
        bookshopLookupUrl: buildBookshopSearch(label),
      };
    }

    return { href: rawUrl, partnerName: null, bookshopLookupUrl: null };
  } catch {
    return { href: rawUrl, partnerName: null, bookshopLookupUrl: null };
  }
}

function buildBookshopSearch(label: string): string {
  const clean = label
    .replace(/\(.*?\)/g, "")
    .replace(/—.*$/, "")
    .trim();
  const params = new URLSearchParams({
    keywords: clean || label,
    a_aid: BOOKSHOP_AFFILIATE_ID,
  });
  return `https://bookshop.org/books?${params.toString()}`;
}
