"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/contexts/session-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Camera, Loader2, User as UserIcon, LogOut, ArrowLeft, Key, Trash2 } from "lucide-react";
import { updateProfile, uploadAvatar, uploadAiAvatar, deleteAvatar, deleteAiAvatar } from "@/lib/api/user";
import { useToast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Bot, Sparkles, Heart, Zap, Coffee, Play, Check, Volume2 } from "lucide-react";
import Link from "next/link";
import {
  applyVoiceToUtterance,
  findSpeechVoice,
  getEnglishVoices,
  getVoiceId,
  logSpeechDiagnostic,
  warmUpSpeechSynthesis,
} from "@/lib/speechSynthesisUtils";

export default function ProfilePage() {
  const { user, checkSession, logout } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [aiName, setAiName] = useState("Maya");
  const [aiBehavior, setAiBehavior] = useState("supportive");
  const [aiAvatar, setAiAvatar] = useState("");
  const [aiVoice, setAiVoice] = useState("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAiUploading, setIsAiUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAiDeleting, setIsAiDeleting] = useState(false);
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
      setAiVoice(user.aiVoice || "");
    }
  }, [user]);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const allVoices = getEnglishVoices();

        // Deduplicate by stable voice id, not only by name. Android can expose
        // different locales under similar names, and name-only storage loses accents.
        const seen = new Set<string>();
        const uniqueVoices = allVoices.filter(v => {
          const id = getVoiceId(v);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        logSpeechDiagnostic("profile-voices-loaded", {
          availableVoiceCount: uniqueVoices.length,
          selectedVoice: aiVoice || "default",
        });
        setAvailableVoices(uniqueVoices);
      }
    };

    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Warm up speechSynthesis with a real tiny utterance for iOS Safari.
    if (typeof window !== "undefined" && window.speechSynthesis) {
      warmUpSpeechSynthesis();
    }
  }, [aiVoice]);

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
      e.target.value = "";
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
      e.target.value = "";
    }
  };

  const handleDeleteImage = async () => {
    setIsDeleting(true);
    try {
      await deleteAvatar();
      setProfileImage("");
      await checkSession();
      toast({
        title: "Avatar Deleted",
        description: "Your profile photo has been removed.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Failed to delete avatar. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAiImage = async () => {
    setIsAiDeleting(true);
    try {
      await deleteAiAvatar();
      setAiAvatar("");
      await checkSession();
      toast({
        title: "AI Avatar Deleted",
        description: "The AI avatar has been reset to the default.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Failed to delete AI avatar. Please try again.",
      });
    } finally {
      setIsAiDeleting(false);
    }
  };

  const handleTestVoice = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast({
        variant: "destructive",
        title: "Not Supported",
        description: "Text-to-speech is not supported in this browser.",
      });
      return;
    }

    window.speechSynthesis.cancel();

    // iOS workaround: resume before speaking
    try { 
      window.speechSynthesis.resume(); 
    } catch (e) {
      // ignore
    }
    
    const text = `Hello ${name || "friend"}, my name is ${aiName}. I'm your personal mental health support companion.`;
    const utterance = new SpeechSynthesisUtterance(text);

    const selectedVoice = findSpeechVoice(availableVoices, aiVoice);
    applyVoiceToUtterance(utterance, selectedVoice);
    logSpeechDiagnostic("profile-test-voice", {
      requestedVoice: aiVoice || "default",
      selectedName: selectedVoice?.name || null,
      selectedUri: selectedVoice ? getVoiceId(selectedVoice) : null,
      selectedLang: selectedVoice?.lang || utterance.lang,
    });
    
    utterance.rate = 0.88;
    utterance.pitch = 0.95;
    utterance.volume = 1;
    
    setIsTesting(true);
    
    const onTestComplete = () => {
      setIsTesting(false);
      clearInterval(iosKeepAlive);
    };
    
    utterance.onstart = () => {
      logSpeechDiagnostic("profile-test-start", {
        actualVoice: utterance.voice ? getVoiceId(utterance.voice) : null,
        lang: utterance.lang,
      });
    };
    utterance.onend = onTestComplete;
    utterance.onerror = (e) => {
      if (e.error !== "interrupted" && e.error !== "canceled") {
        logSpeechDiagnostic("profile-test-error", { error: e.error });
        console.warn("Test voice error:", e.error);
      }
      onTestComplete();
    };
    
    window.speechSynthesis.speak(utterance);

    // iOS keep-alive workaround
    const iosKeepAlive = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        try {
          window.speechSynthesis.resume();
        } catch (e) {
          // ignore
        }
      } else {
        clearInterval(iosKeepAlive);
      }
    }, 5000);
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
        aiAvatar,
        aiVoice
      });
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
                  {(isUploading || isDeleting) && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <label 
                  htmlFor="avatar-upload" 
                  className={`absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer hover:bg-primary/90 transition-all shadow-lg ${
                    isUploading || isDeleting ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </label>
                {profileImage && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute bottom-0 left-0 h-8 w-8 rounded-full shadow-lg"
                    onClick={handleDeleteImage}
                    disabled={isUploading || isDeleting || isSaving}
                    aria-label="Delete profile photo"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                )}
                <input 
                  id="avatar-upload" 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  disabled={isUploading || isDeleting}
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
                          onError={() => setAiAvatar("")}
                        />
                      ) : (
                        <Bot className="w-10 h-10 text-muted-foreground" />
                      )}
                      {(isAiUploading || isAiDeleting) && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                    <label 
                      htmlFor="ai-avatar-upload" 
                      className={`absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full cursor-pointer hover:bg-primary/90 transition-all shadow-md ${
                        isAiUploading || isAiDeleting ? "pointer-events-none opacity-60" : ""
                      }`}
                    >
                      {isAiUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                    </label>
                    {aiAvatar && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute bottom-0 left-0 h-7 w-7 rounded-full shadow-md"
                        onClick={handleDeleteAiImage}
                        disabled={isAiUploading || isAiDeleting || isSaving}
                        aria-label="Delete AI avatar"
                      >
                        {isAiDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </Button>
                    )}
                    <input 
                      id="ai-avatar-upload" 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleAiImageUpload} 
                      disabled={isAiUploading || isAiDeleting}
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

                <div className="space-y-2">
                  <Label>AI Voice</Label>
                  {aiVoice && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      <span>Selected: <strong>{findSpeechVoice(availableVoices, aiVoice)?.name || aiVoice}</strong></span>
                    </p>
                  )}
                  <div className="flex gap-3">
                    <Select value={aiVoice} onValueChange={setAiVoice}>
                      <SelectTrigger className="bg-background border-primary/20 flex-1">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVoices.length > 0 ? (
                          availableVoices.map((voice) => (
                            <SelectItem key={getVoiceId(voice)} value={getVoiceId(voice)}>
                              <div className="flex items-center gap-2">
                                {(aiVoice === getVoiceId(voice) || aiVoice === voice.name || aiVoice === voice.voiceURI) && (
                                  <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                )}
                                <span>{voice.name}</span>
                                <span className="text-xs text-muted-foreground">({voice.lang})</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="default" disabled>
                            Loading voices...
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleTestVoice}
                      disabled={isTesting}
                      className="shrink-0"
                    >
                      {isTesting ? (
                        <>
                          <Volume2 className="w-4 h-4 mr-2 animate-pulse" />
                          Playing...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Test Voice
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <Button type="submit" className="w-full h-12 text-lg shadow-lg hover:shadow-primary/20 transition-all" disabled={isSaving || isUploading || isAiUploading || isDeleting || isAiDeleting}>
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
