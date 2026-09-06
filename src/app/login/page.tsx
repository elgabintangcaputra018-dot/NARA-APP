import { redirect } from "next/navigation";

export default function LoginPage() {
  // /activate replaces /login as the primary entry point
  redirect("/activate");
}
