import { redirect } from "next/navigation";

/**
 * My Avatar moved to a tab inside /achievements. Old direct links and
 * bookmarks land here and redirect cleanly.
 */
export default function MyAvatarLegacyRedirect() {
  redirect("/achievements?tab=avatar");
}
