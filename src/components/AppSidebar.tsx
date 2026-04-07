import { LayoutDashboard, CheckSquare, LogOut, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const AppSidebar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { icon: LayoutDashboard, label: 'แดชบอร์ด', active: false },
    { icon: CheckSquare, label: 'งาน', active: true },
  ];

  return (
    <aside className="w-[220px] min-h-screen bg-sidebar-dark flex flex-col shrink-0">
      <div className="p-5">
        <h1 className="text-lg font-bold text-primary-foreground tracking-tight">
          <span className="text-primary">•</span> ไทม์ไลน์งาน
        </h1>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              item.active
                ? 'bg-primary/15 text-primary'
                : 'text-sidebar-dark-foreground hover:bg-sidebar-dark-hover hover:text-primary-foreground'
            )}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-dark-hover">
        {user ? (
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-dark-foreground hover:bg-sidebar-dark-hover hover:text-primary-foreground transition-colors"
          >
            <LogOut size={18} />
            ออกจากระบบ
          </button>
        ) : (
          <button
            onClick={() => navigate('/auth')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-dark-foreground hover:bg-sidebar-dark-hover hover:text-primary-foreground transition-colors"
          >
            <LogIn size={18} />
            เข้าสู่ระบบ
          </button>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
