import type { Metadata } from "next";

import { PitchDeck } from "./pitch-deck";

export const metadata: Metadata = {
  title: "Pitch Deck | KODA",
  description:
    "A presentation-style pitch deck for KODA, the execution layer for email and calendar.",
};

export default function PitchDeckPage() {
  return <PitchDeck />;
}
