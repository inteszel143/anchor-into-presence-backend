"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Only access localStorage on the client side
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/admin/login");
    } else {
      router.push("/admin/users");
    }
  }, [router]);

  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <p>Redirecting...</p>
    </div>
  );
}