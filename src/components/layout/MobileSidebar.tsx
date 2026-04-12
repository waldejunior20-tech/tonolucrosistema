import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { UnifiedSidebar } from "./UnifiedSidebar";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="p-0 w-[260px] border-r border-sidebar-border bg-sidebar">
        <VisuallyHidden>
          <SheetTitle>Menu de navegação</SheetTitle>
        </VisuallyHidden>
        <UnifiedSidebar
          collapsed={false}
          onToggle={() => onOpenChange(false)}
          onNavigate={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
