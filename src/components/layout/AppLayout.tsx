import { Outlet } from "react-router-dom";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useScrollToTop } from "@/hooks/useScrollToTop";

import { UnifiedSidebar } from "./UnifiedSidebar";
import { MobileSidebar } from "./MobileSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { Header } from "./Header";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  useScrollToTop();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {!isMobile && (
        <aside
          className={cn(
            "fixed top-3 left-3 bottom-3 z-40 transition-all duration-300",
            sidebarCollapsed ? "w-16" : "w-[280px]"
          )}
        >
          <UnifiedSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </aside>
      )}

      {isMobile && (
        <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />
      )}

      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300",
          !isMobile && (sidebarCollapsed ? "ml-16" : "ml-[288px]")
        )}
      >
        <Header
          showMenuButton={isMobile}
          onMenuClick={() => setMobileOpen(true)}
          sidebarWidth={!isMobile ? (sidebarCollapsed ? "4rem" : "288px") : "0px"}
        />
        <main className={cn("flex-1 p-4 lg:p-6 overflow-auto relative mt-16", isMobile && "pb-24")}>
          <div className="max-w-[1440px] mx-auto relative z-10 w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {isMobile && <MobileBottomNav onMenuClick={() => setMobileOpen(true)} />}
    </div>
  );
}
