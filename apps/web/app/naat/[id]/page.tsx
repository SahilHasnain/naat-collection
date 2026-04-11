import type { Metadata } from "next";
import NaatRedirectClient from "./NaatRedirectClient";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ youtubeId?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { youtubeId } = await searchParams;
  const url = `https://owaisrazaqadri.appwrite.network/naat/${id}${
    youtubeId ? `?youtubeId=${youtubeId}` : ""
  }`;

  return {
    title: "Open in Naat Collection",
    description: "Open this naat in the Naat Collection app.",
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: "Open in Naat Collection",
      description: "Open this naat in the Naat Collection app.",
      url,
      siteName: "Naat Collection",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: "Open in Naat Collection",
      description: "Open this naat in the Naat Collection app.",
    },
  };
}

export default async function NaatRedirectPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { youtubeId } = await searchParams;

  return <NaatRedirectClient naatId={id} youtubeId={youtubeId} />;
}
