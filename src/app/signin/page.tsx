import AuthForm from "@/components/AuthForm";
import { authenticate } from "@/app/auth-actions";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return <AuthForm mode="signin" action={authenticate} />;
}
