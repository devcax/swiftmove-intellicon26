import { ErrorScreen } from "@/shared/components/ErrorScreen";

export default function NotFound() {
  return <ErrorScreen title="Page not found" message="That page does not exist, or it has moved." homeHref="/" />;
}
