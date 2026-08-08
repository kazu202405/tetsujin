import { ListSkeleton } from "@/components/app/skeleton";

export default function Loading() {
  return <ListSkeleton rows={6} withSearch />;
}
