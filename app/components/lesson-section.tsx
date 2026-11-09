import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "~/components/ui/card";

/**
 * The card shell every panel under a Lesson shares (Notes, Questions &
 * Discussion), so they read as one page rather than stacked widgets.
 */
export function LessonSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="mb-8 gap-0 py-0">
      <CardContent className="p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Icon className="size-5 text-primary" />
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
