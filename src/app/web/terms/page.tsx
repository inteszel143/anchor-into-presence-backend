import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and Conditions for Meditation Application",
};

/**
 * Fetches Terms & Conditions content from API.
 */
async function getTerms() {
  const res = await fetch(`${process.env.BASE_URL}/api/content/terms`, {
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to fetch terms & conditions");
  return res.json();
}

/**
 * Public Terms & Conditions Page
 */
export default async function TermsPage() {
  const { data } = await getTerms();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 text-slate-800">
      <article
        className="prose mt-6"
        dangerouslySetInnerHTML={{ __html: data?.description || "" }}
      />
    </main>
  );
}
