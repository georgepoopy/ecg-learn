import AuthForm from "@/components/AuthForm";
import { register } from "@/app/auth-actions";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return <AuthForm mode="signup" action={register} />;
}
