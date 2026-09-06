import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function RootPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("nara_session")?.value;

  if (sessionToken) {
    redirect("/dashboard");
  } else {
    redirect("/activate");
  }
}
