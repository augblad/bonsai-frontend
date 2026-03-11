import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Globe, LogIn, UserPlus } from "lucide-react";
import { IconLeafFilled } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  cloudStatus,
  cloudSetServer,
  cloudLogin,
  cloudRegister,
  type CloudUser,
} from "@/lib/cloud-api";

export function CloudLoginPage({
  onLoggedIn,
}: {
  onLoggedIn: (user: CloudUser) => void;
}) {
  const navigate = useNavigate();

  const [serverUrl, setServerUrl] = useState("");
  const [serverSaved, setServerSaved] = useState(false);
  const [serverLoading, setServerLoading] = useState(false);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Register
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);

  // Load saved server URL on mount
  useState(() => {
    cloudStatus().then((s) => {
      if (s.serverUrl) {
        setServerUrl(s.serverUrl);
        setServerSaved(true);
      }
    });
  });

  const handleSaveServer = async () => {
    const trimmed = serverUrl.trim();
    if (!trimmed) {
      toast.error("Enter a server URL");
      return;
    }
    setServerLoading(true);
    try {
      await cloudSetServer(trimmed);
      setServerSaved(true);
      toast.success("Server URL saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save server URL");
    } finally {
      setServerLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      toast.error("Fill in all fields");
      return;
    }
    setLoginLoading(true);
    try {
      const result = await cloudLogin(loginEmail.trim(), loginPassword);
      if (result.status === "error") {
        toast.error(result.error);
      } else {
        toast.success(`Welcome back, ${result.user.displayName}!`);
        onLoggedIn(result.user);
      }
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regEmail.trim() || !regPassword || !regName.trim()) {
      toast.error("Fill in all fields");
      return;
    }
    if (regPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setRegLoading(true);
    try {
      const result = await cloudRegister(regEmail.trim(), regPassword, regName.trim());
      if (result.status === "error") {
        toast.error(result.error);
      } else {
        toast.success(`Welcome, ${result.user.displayName}!`);
        onLoggedIn(result.user);
      }
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <IconLeafFilled size={28} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold">Bonsai Cloud</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Connect to your team workspace
            </p>
          </div>
        </div>

        {/* Server URL */}
        <div className="space-y-2">
          <Label htmlFor="server-url" className="text-xs text-muted-foreground">
            Server URL
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="server-url"
                placeholder="https://your-bonsai-server.com"
                value={serverUrl}
                onChange={(e) => {
                  setServerUrl(e.target.value);
                  setServerSaved(false);
                }}
                className="pl-8"
                onKeyDown={(e) => e.key === "Enter" && handleSaveServer()}
              />
            </div>
            <Button
              variant={serverSaved ? "outline" : "default"}
              size="sm"
              onClick={handleSaveServer}
              disabled={serverLoading || (serverSaved && !serverUrl)}
              className="shrink-0"
            >
              {serverSaved ? "Saved" : "Save"}
            </Button>
          </div>
        </div>

        {/* Login / Register tabs */}
        {serverSaved && (
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">
                <LogIn className="h-3.5 w-3.5 mr-1.5" />
                Login
              </TabsTrigger>
              <TabsTrigger value="register">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Register
              </TabsTrigger>
            </TabsList>

            {/* Login tab */}
            <TabsContent value="login" className="space-y-3 mt-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-xs">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password" className="text-xs">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showLoginPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPw(!showLoginPw)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                className="w-full mt-2"
                onClick={handleLogin}
                disabled={loginLoading}
              >
                {loginLoading ? "Logging in…" : "Login"}
              </Button>
            </TabsContent>

            {/* Register tab */}
            <TabsContent value="register" className="space-y-3 mt-4">
              <div className="space-y-1.5">
                <Label htmlFor="reg-name" className="text-xs">Display Name</Label>
                <Input
                  id="reg-name"
                  placeholder="Alice"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-email" className="text-xs">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-password" className="text-xs">Password</Label>
                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showRegPw ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPw(!showRegPw)}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showRegPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                className="w-full mt-2"
                onClick={handleRegister}
                disabled={regLoading}
              >
                {regLoading ? "Creating account…" : "Create Account"}
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
