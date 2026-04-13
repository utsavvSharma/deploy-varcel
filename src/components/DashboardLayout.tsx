"use client";

import { ReactNode, useState, useEffect } from "react";
import { formatDate } from "@/utils/date";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  BarChart3, 
  Clock, 
  Globe, 
  TrendingUp,
  ClipboardList,
  LucideIcon 
} from "lucide-react";

interface SidebarLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

const adminLinks: SidebarLink[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Manage Leads", icon: Users },
  { href: "/admin/sales", label: "Sales Team", icon: UserCheck },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/activity", label: "Employee Activity", icon: Clock },
];

const teamLeaderLinks: SidebarLink[] = [
  { href: "/team-leader", label: "Dashboard", icon: LayoutDashboard },
  { href: "/team-leader/my-leads", label: "My Leads", icon: ClipboardList },
  { href: "/team-leader/leads", label: "Team Leads", icon: Users },
  { href: "/team-leader/members", label: "My Team", icon: UserCheck },
  { href: "/team-leader/my-reports", label: "My Performance", icon: TrendingUp },
  { href: "/team-leader/reports", label: "Team Performance", icon: BarChart3 },
  { href: "/public-pool", label: "Public Pool", icon: Globe },
];

const salesLinks: SidebarLink[] = [
  { href: "/sales", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales/leads", label: "My Leads", icon: Users },
  { href: "/public-pool", label: "Public Pool", icon: Globe },
  { href: "/sales/reports", label: "My Performance", icon: TrendingUp },
];

interface DashboardLayoutProps {
  children: ReactNode;
  userType: "admin" | "team_leader" | "sales";
}

export default function DashboardLayout({ children, userType }: DashboardLayoutProps) {
  // Desktop: open by default, Mobile: closed by default
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const pathname = usePathname();
  const links = userType === "admin" ? adminLinks : userType === "team_leader" ? teamLeaderLinks : salesLinks;

  const [user, setUser] = useState<any>(null);

  // Initialize sidebar state based on screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      setSidebarOpen(desktop);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    // fetch current session user for avatar/name
    fetch('/api/auth/session', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data?.user || null))
      .catch(() => setUser(null));
  }, []);

  // Only keep the periodic ping active on the Employee Activity page
  useEffect(() => {
    if (pathname === '/admin/activity') {
      const interval = setInterval(() => {
        fetch('/api/auth/session', { credentials: 'include' }).catch(() => {});
      }, 60_000);
      return () => clearInterval(interval);
    }
  }, [pathname]);



  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push("/");
  };

  return (
    <div className="min-h-screen text-black bg-gray-50">
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-gradient-to-b ${
          userType === "admin" 
            ? "from-orange-600 to-yellow-700" 
            : userType === "team_leader"
            ? "from-purple-600 to-indigo-700"
            : "from-emerald-600 to-teal-700"
        } shadow-2xl transition-all duration-300 z-40 overflow-hidden
        ${
          isSidebarOpen
            ? "translate-x-0 w-64"
            : "-translate-x-full lg:translate-x-0 w-64 lg:w-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">IB</span>
              </div>
              <div>
                <h1 className="font-bold text-xl text-white">Infobeam CRM</h1>
                <p className="text-xs text-white/70 capitalize">{userType === 'team_leader' ? 'Team Leader' : userType} Portal</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {links.map((link) => {
                const IconComponent = link.icon;
                const isActive = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`group flex items-center p-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                      onClick={() => !isDesktop && setSidebarOpen(false)}
                    >
                      <IconComponent className={`w-5 h-5 mr-3 ${
                        isActive ? "scale-110" : "group-hover:scale-110"
                      } transition-transform`} />
                      <span className="font-medium">{link.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-white/10 bg-black/10">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{user?.name || "User"}</p>
                <p className="text-xs text-white/70 capitalize">{user?.role || "Member"}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay when sidebar open */}
      {isSidebarOpen && !isDesktop && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          isSidebarOpen ? "lg:ml-64" : "lg:ml-0"
        }`}
      >
        {/* Top Bar */}
        <div className="bg-white shadow-sm sticky top-0 z-20">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg 
                className="w-6 h-6 transition-all" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {isSidebarOpen ? (
                  // Show left arrow on desktop, X on mobile
                  isDesktop ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  )
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <div className="text-right">
              <h2 className="font-semibold text-gray-900">
                {userType === "admin" ? "Admin Dashboard" : userType === "team_leader" ? "Team Leader Dashboard" : "Sales Dashboard"}
              </h2> 
              <p className="text-sm text-gray-500">
                {formatDate(new Date())}
              </p>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
      </div>
    );
  }