import { redirect } from "next/navigation";

/** Root page — redirect to the chat interface. */
export default function Home() {
  redirect("/chat");
}
