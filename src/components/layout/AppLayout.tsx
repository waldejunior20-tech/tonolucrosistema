import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { UnifiedSidebar, type ModuleKey } from "./UnifiedSidebar";
import { Header } from "./Header";

function getModuleFromPath(path: string): ModuleKey {
  if (path.startsWith("/insumos")) return "insumos";
  if (path.startsWith("/fichas")) return "fichas";
  if (path.startsWith("/precificacao")) return "precificacao";
  if (path.startsWith("/financeiro")) return "financeiro";
  if (path.startsWith("/promocoes")) return "promocoes";
  return "dashboard";
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeModule, setActiveModule] = useState<ModuleKey>(getModuleFromPath(location.pathname));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setActiveModule(getModuleFromPath(location.pathname));
  }, [location.pathname]);

  const handleModuleChange = (module: ModuleKey) => {
    setActiveModule(module);
    const items = subMenus[module];
    if (items.length === 0) {
      navigate("/");
    } else {
      navigate(items[0].path);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className={`flex h-screen sticky top-0 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : ''}`}>
        <IconSidebar 
          activeModule={activeModule} 
          onModuleChange={handleModuleChange}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        {!sidebarCollapsed && (
          <SubMenu activeModule={activeModule} currentPath={location.pathname} onNavigate={handleNavigate} />
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
