import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { IconSidebar, type ModuleKey } from "./IconSidebar";
import { SubMenu, subMenus } from "./SubMenu";
import { Header } from "./Header";
  const navigate = useNavigate();
  const location = useLocation();
  const [activeModule, setActiveModule] = useState<ModuleKey>(getModuleFromPath(location.pathname));

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
    <div className="flex min-h-screen w-full">
      <IconSidebar activeModule={activeModule} onModuleChange={handleModuleChange} />
      <SubMenu activeModule={activeModule} currentPath={location.pathname} onNavigate={handleNavigate} />
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
