const getAuthHeader = (): Record<string, string> => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const updateProfile = async (data: { 
  name?: string; 
  email?: string; 
  profileImage?: string;
  aiName?: string;
  aiBehavior?: string;
  aiAvatar?: string;
  aiVoice?: string;
}) => {
  const response = await fetch("/api/user/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const uploadAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/user/upload-avatar", {
    method: "POST",
    headers: {
      ...getAuthHeader(),
    },
    body: formData,
  });
  return response.json();
};

export const uploadAiAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/user/upload-ai-avatar", {
    method: "POST",
    headers: {
      ...getAuthHeader(),
    },
    body: formData,
  });
  return response.json();
};

export const deleteAvatar = async () => {
  const response = await fetch("/api/user/delete-avatar", {
    method: "DELETE",
    headers: {
      ...getAuthHeader(),
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || "Failed to delete avatar");
  }
  return data;
};

export const deleteAiAvatar = async () => {
  const response = await fetch("/api/user/delete-ai-avatar", {
    method: "DELETE",
    headers: {
      ...getAuthHeader(),
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || "Failed to delete AI avatar");
  }
  return data;
};
