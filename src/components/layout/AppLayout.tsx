import { Outlet } from "react-router-dom";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

import { UnifiedSidebar } from "./UnifiedSidebar";
import { MobileSidebar } from "./MobileSidebar";
import { Header } from "./Header";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <UnifiedSidebar 
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}

      {/* Mobile Sidebar (Sheet/Drawer) */}
      {isMobile && (
        <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <Header 
          showMenuButton={isMobile}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-4 lg:p-8 overflow-auto bg-grain relative">
          <div className="max-w-7xl mx-auto relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
