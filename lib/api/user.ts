const getAuthHeader = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const updateProfile = async (data: { 
  name?: string; 
  email?: string; 
  profileImage?: string;
  aiName?: string;
  aiBehavior?: string;
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
