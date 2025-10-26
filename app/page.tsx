
import Link from "next/link";
import FreePractice from "./components/freePractice";

export default function Home() {
  return (
    <div className="bg-black h-screen flex justify-center items-center flex-column">
      <Link href="/explore" className="p-2 rounded-md text-white">Explore Openings</Link>
      <div className="max-w-[500px] max-h-[500px]">
        <FreePractice/>
      </div>
    </div>
  );
}
