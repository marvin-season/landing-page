import { Card, CardContent } from "@/components/ui/card";

export function TextBlock({ content }: { content: string }) {
  return (
    <Card className="border-border/80 bg-muted/10 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {content}
        </p>
      </CardContent>
    </Card>
  );
}
