import { BrandPanel } from "@/components/pages/login/BrandPanel";
import { LoginForm } from "@/components/pages/login/LoginForm";

export default function LoginPage() {
  return (
    <main
      className="flex min-h-screen"
      style={{
        background: "var(--cream)",
        fontFamily: "var(--font-system-sans)",
      }}
    >
      <BrandPanel />
      <LoginForm />
    </main>
  );
}