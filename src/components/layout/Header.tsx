import { Menu } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  sidebarWidth?: string;
}

export function Header({ onMenuClick, showMenuButton, sidebarWidth = "0px" }: HeaderProps) {
  return (
    <header
      style={{ left: sidebarWidth }}
      className="h-16 border-b border-border bg-background/90 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 fixed top-0 right-0 z-30 transition-all duration-300"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors lg:hidden"
          >
            <Menu size={20} />
          </button>
        )}
        <GlobalSearch />
      </div>
    </header>
  );
}

