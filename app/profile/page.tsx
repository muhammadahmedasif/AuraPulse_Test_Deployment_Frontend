"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/contexts/session-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Camera, Loader2, User as UserIcon, LogOut, ArrowLeft, Key } from "lucide-react";
import { updateProfile, uploadAvatar, uploadAiAvatar } from "@/lib/api/user";
import { useToast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Bot, Sparkles, Heart, Zap, Coffee } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { user, checkSession, logout } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [aiName, setAiName] = useState("Maya");
  const [aiBehavior, setAiBehavior] = useState("supportive");
  const [aiAvatar, setAiAvatar] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAiUploading, setIsAiUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setProfileImage(user.profileImage || "");
      setAiName(user.aiName || "Maya");
      setAiBehavior(user.aiBehavior || "supportive");
      setAiAvatar(user.aiAvatar || "");
    }
  }, [user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const data = await uploadAvatar(file);
      if (data.imageUrl) {
        setProfileImage(data.imageUrl);
        toast({
          title: "Success",
          description: "Avatar uploaded successfully. Don't forget to save changes.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Failed to upload avatar. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAiImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiUploading(true);
    try {
      const data = await uploadAiAvatar(file);
      if (data.imageUrl) {
        setAiAvatar(data.imageUrl);
        toast({
          title: "Success",
          description: "AI Avatar uploaded. Click 'Save Changes' to apply.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Failed to upload AI avatar.",
      });
    } finally {
      setIsAiUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({ 
        name, 
        email, 
        profileImage,
        aiName,
        aiBehavior,
        aiAvatar
      });
      // Handle AI Avatar separately if needed or just part of the same flow
      // Since we want to stay minimal, we just send everything in updateProfile
      // Actually, aiAvatar should be part of the user object in the backend.
      // I'll make sure updateProfile handles aiAvatar too.
      await checkSession();
      toast({
        title: "Profile Updated",
        description: "Your settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save profile changes.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <Container className="max-w-2xl">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-2xl">Profile Settings</CardTitle>
            <CardDescription>Manage your personal information and profile picture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary bg-muted flex items-center justify-center shadow-inner relative transition-all">
                  {profileImage ? (
                    <img 
                      src={profileImage} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      onError={() => {
                        console.error("Failed to load profile image:", profileImage);
                        setProfileImage("");
                      }}
                    />
                  ) : (
                    <UserIcon className="w-12 h-12 text-muted-foreground" />
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <label 
                  htmlFor="avatar-upload" 
                  className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer hover:bg-primary/90 transition-all shadow-lg"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </label>
                <input 
                  id="avatar-upload" 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  disabled={isUploading}
                />
              </div>
              <p className="text-sm text-muted-foreground">Click the camera icon to upload a new photo</p>
            </div>

            {/* Form Section */}
            <form onSubmit={handleSave} className="space-y-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <Separator className="bg-primary/10" />

              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    AI Customization
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Customize how your AI companion looks and behaves</p>
                </div>

                {/* AI Avatar */}
                <div className="flex flex-col items-center space-y-4 bg-primary/5 p-6 rounded-xl border border-primary/10">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary bg-muted flex items-center justify-center shadow-inner relative transition-all">
                      {aiAvatar ? (
                        <img 
                          src={aiAvatar} 
                          alt="AI Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img 
                          src="https://api.dicebear.com/7.x/bottts/svg?seed=Maya&backgroundColor=b6e3f4,c0aede,d1d4f9" 
                          alt="AI Default" 
                          className="w-full h-full object-cover" 
                        />
                      )}
                      {isAiUploading && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                    <label 
                      htmlFor="ai-avatar-upload" 
                      className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full cursor-pointer hover:bg-primary/90 transition-all shadow-md"
                    >
                      {isAiUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                    </label>
                    <input 
                      id="ai-avatar-upload" 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleAiImageUpload} 
                      disabled={isAiUploading}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">AI Avatar</p>
                    <p className="text-xs text-muted-foreground">Click to upload custom icon</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="aiName">AI Companion Name</Label>
                    <Input 
                      id="aiName" 
                      value={aiName} 
                      onChange={(e) => setAiName(e.target.value)} 
                      placeholder="e.g. Maya"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>AI Behavior</Label>
                    <Select value={aiBehavior} onValueChange={setAiBehavior}>
                      <SelectTrigger className="bg-background border-primary/20">
                        <SelectValue placeholder="Select behavior" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supportive">
                          <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4 text-red-400" />
                            <span>Supportive</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="friendly">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                            <span>Friendly</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="motivational">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-blue-400" />
                            <span>Motivational</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="calm">
                          <div className="flex items-center gap-2">
                            <Coffee className="w-4 h-4 text-emerald-400" />
                            <span>Calm</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <Button type="submit" className="w-full h-12 text-lg shadow-lg hover:shadow-primary/20 transition-all" disabled={isSaving || isUploading || isAiUploading}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save All Changes
                </Button>

                <div className="grid grid-cols-2 gap-4">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/forgot-password">
                      <Key className="mr-2 h-4 w-4" />
                      Reset Password
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full text-destructive hover:bg-destructive/5" onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
