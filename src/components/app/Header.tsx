import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Gamepad2, LogOut, User as UserIcon, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface HeaderProps {
  user: User | null;
  isAdmin: boolean;
}

export const Header = ({ user, isAdmin }: HeaderProps) => {
  const navigate = useNavigate();
  const navLinks = [
    { label: "Home", to: "/app", end: true },
    { label: "Readers", to: "/app/readers" },
  ];

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to logout");
    } else {
      toast.success("Logged out successfully");
      navigate("/auth");
    }
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-lg">Game Art Guidebook</h1>
        </div>

        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              activeClassName="bg-muted text-foreground"
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <UserIcon className="h-4 w-4 mr-2" />
            {user?.email}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/app/account")}>
            <UserIcon className="h-4 w-4 mr-2" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isAdmin && (
            <DropdownMenuItem disabled>
              <Shield className="h-4 w-4 mr-2" />
              Admin Access
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};
