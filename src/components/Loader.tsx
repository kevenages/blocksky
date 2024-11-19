// src/components/Loader.tsx
import Image from 'next/image';
import mainLoader from "../../public/images/main-loader.svg";

export default function Loader() {
  return (
    <div className="loader-container flex justify-center items-center h-screen">
      <Image
        priority
        src={mainLoader}
        alt="Loading..."
        priority={true}
      />
    </div>

  );
}
