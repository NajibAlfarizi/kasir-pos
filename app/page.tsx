"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("user")) {
      router.push("/login");
    }
  }, [router]);
  return <div className="p-8">Dashboard</div>;
}
