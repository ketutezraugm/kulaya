import Link from "next/link";
import { Art } from "@/components/ui";
import * as scene from "@/components/art/scene";

export default function NotFound() {
  return (
    <div className="shell" data-site="owner">
      <main className="shell-main" style={{ justifyContent: "center", textAlign: "center", alignItems: "center", gap: 16, minHeight: "100dvh" }}>
        <Art svg={scene.illShutterClosed} w={260} />
        <h1 className="h2">Halaman tidak ditemukan</h1>
        <p className="p">Alamat ini tidak ada atau sudah pindah. Data toko Anda tetap aman.</p>
        <Link href="/" className="btn">Ke halaman awal</Link>
        <Link href="/protocol" lang="en" className="btn quiet">Kulaya Protocol (English)</Link>
      </main>
    </div>
  );
}
