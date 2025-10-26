import Image from "next/image";
import FreePractice from "./components/freePractice";

export default function Home() {
  return (
    <div className="">
      <Link href="/explore" className="p-2 rounded-md">Explore Openings</Link>
      <FreePractice />
    </div>
  );
}
