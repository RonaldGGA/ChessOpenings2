// app/practice/[id]/page.tsx
import OpeningPracticeClient from "@/app/components/openingPracticeClient";
import { findOpening } from "@/app/lib/actions";
import { Alias, Opening, FromTo } from "@prisma/client";

interface PageProps {
  params: { id: string };
}

export type OpeningWithRelations = Opening & {
  aliases: Alias[];
  toTransitions?: (FromTo & {
    toOpening: Opening;
  })[];
};

export default async function PracticePage({ params }: PageProps) {
  const { id } = await params;
  console.log("ID: " + id)

  const { opening, variations } = await findOpening(id);

  return opening ? (
    <OpeningPracticeClient opening={opening} variations={variations} />
  ) : (
    <span>Loading</span>
  );
}
