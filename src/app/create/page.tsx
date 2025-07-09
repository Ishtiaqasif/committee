
"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FootballLoader } from "@/components/football-loader";

function RedirectComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams.get('id');
    const newPath = id ? `/tournament?id=${id}` : '/tournament';
    router.replace(newPath);
  }, [router, searchParams]);
  
  return <FootballLoader className="h-screen w-screen" />;
}

export default function CreatePage() {
  return (
    <Suspense fallback={<FootballLoader className="h-screen w-screen" />}>
      <RedirectComponent />
    </Suspense>
  );
}
