import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHeader({
  title,
  breadcrumb,
}: {
  title: string;
  breadcrumb: string;
}) {
  return (
    <div className="bg-[var(--tetsu-warm-pink)] pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 text-center mb-4">
          {title}
        </h1>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-[var(--tetsu-pink)] transition-colors">
            HOME
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 font-medium">{breadcrumb}</span>
        </div>
      </div>
    </div>
  );
}
