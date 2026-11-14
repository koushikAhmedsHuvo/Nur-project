// frontend/src/pages/SettingsPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthUser from "../hooks/useAuthUser";
import { useThemeStore } from "../store/useThemeStore";
import { FaUser, FaBell, FaPalette, FaLock, FaGlobe, FaSignOutAlt, FaMoon, FaSun, FaVolumeUp, FaVolumeMute, FaEdit, FaSave, FaTimes } from "react-icons/fa";
import { IoSettingsOutline } from "react-icons/io5";
import useLogout from "../hooks/useLogout";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export default function SettingsPage() {
  const { authUser } = useAuthUser();
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const { logoutMutation } = useLogout();
  const [isEditing, setIsEditing] = useState(false);

  // User profile state
  const [profile, setProfile] = useState({
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
    nativeLanguage: authUser?.nativeLanguage || "",
    learningLanguage: authUser?.learningLanguage || "",
    location: authUser?.location || "",
  });

  const [settings, setSettings] = useState({
    notifications: true,
    sound: true,
    darkMode: theme === "dark",
    language: "English",
    privacy: "public",
    onlineStatus: true,
  });

  // Languages list
  const languages = ["English", "Spanish", "French", "German", "Mandarin", "Japanese", "Korean", "Hindi", "Arabic", "Portuguese", "Italian", "Turkish", "Dutch", "Bengali", "Urdu"];

  // Privacy options
  const privacyOptions = ["Public", "Friends Only", "Private"];

  // Update profile
  const updateProfile = async () => {
    try {
      const response = await axiosInstance.put("/users/profile", profile);
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      // Refresh user data
      window.location.reload();
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  // Toggle settings
  const toggleSetting = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    toast.success(`${key} ${settings[key] ? "disabled" : "enabled"}`);
  };

  // Handle logout
  const handleLogout = () => {
    logoutMutation();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  // Theme toggle
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    setSettings((prev) => ({ ...prev, darkMode: newTheme === "dark" }));
    toast.success(`${newTheme} theme activated`);
  };

  // Language change
  const changeLanguage = (lang) => {
    setSettings((prev) => ({ ...prev, language: lang }));
    toast.success(`Language changed to ${lang}`);
  };

  // Privacy change
  const changePrivacy = (privacy) => {
    setSettings((prev) => ({ ...prev, privacy: privacy.toLowerCase() }));
    toast.success(`Privacy set to ${privacy}`);
  };

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <div className="flex items-center gap-3 mb-6">
        <IoSettingsOutline className="size-8 text-primary" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="space-y-4">
        {/* ============ PROFILE SECTION ============ */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FaUser className="text-primary" /> Profile Information
              </h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn btn-ghost btn-sm gap-2"
              >
                {isEditing ? <FaTimes /> : <FaEdit />}
                {isEditing ? "Cancel" : "Edit"}
              </button>
            </div>

            {isEditing ? (
              // Edit Mode
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Full Name</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Location</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    placeholder="City, Country"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Native Language</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={profile.nativeLanguage}
                    onChange={(e) => setProfile({ ...profile, nativeLanguage: e.target.value })}
                  >
                    <option value="">Select language</option>
                    {languages.map((lang) => (
                      <option key={lang} value={lang.toLowerCase()}>{lang}</option>
                    ))}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Learning Language</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={profile.learningLanguage}
                    onChange={(e) => setProfile({ ...profile, learningLanguage: e.target.value })}
                  >
                    <option value="">Select language</option>
                    {languages.map((lang) => (
                      <option key={lang} value={lang.toLowerCase()}>{lang}</option>
                    ))}
                  </select>
                </div>
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text">Bio</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered w-full"
                    rows="2"
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell others about yourself..."
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button className="btn btn-primary gap-2" onClick={updateProfile}>
                    <FaSave /> Save Profile
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 bg-base-100 rounded-lg">
                  <span className="font-semibold text-sm opacity-70">Name:</span>
                  <span>{authUser?.fullName}</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-base-100 rounded-lg">
                  <span className="font-semibold text-sm opacity-70">Location:</span>
                  <span>{authUser?.location || "Not set"}</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-base-100 rounded-lg">
                  <span className="font-semibold text-sm opacity-70">Native:</span>
                  <span>{authUser?.nativeLanguage || "Not set"}</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-base-100 rounded-lg">
                  <span className="font-semibold text-sm opacity-70">Learning:</span>
                  <span>{authUser?.learningLanguage || "Not set"}</span>
                </div>
                <div className="md:col-span-2 flex items-start gap-2 p-2 bg-base-100 rounded-lg">
                  <span className="font-semibold text-sm opacity-70">Bio:</span>
                  <span>{authUser?.bio || "No bio yet"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============ PREFERENCES ============ */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body p-5">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FaPalette className="text-primary" /> Preferences
            </h2>

            {/* Theme */}
            <div className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{theme === "dark" ? <FaMoon /> : <FaSun />}</div>
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm opacity-70">{theme === "dark" ? "Dark mode" : "Light mode"}</p>
                </div>
              </div>
              <button onClick={toggleTheme} className="btn btn-sm btn-primary">
                Switch to {theme === "dark" ? "Light" : "Dark"}
              </button>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
              <div className="flex items-center gap-3">
                <FaGlobe className="text-primary" />
                <div>
                  <p className="font-medium">Language</p>
                  <p className="text-sm opacity-70">Current: {settings.language}</p>
                </div>
              </div>
              <select
                className="select select-bordered select-sm"
                value={settings.language}
                onChange={(e) => changeLanguage(e.target.value)}
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
              <div className="flex items-center gap-3">
                <FaBell className="text-primary" />
                <div>
                  <p className="font-medium">Notifications</p>
                  <p className="text-sm opacity-70">{settings.notifications ? "Enabled" : "Disabled"}</p>
                </div>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={settings.notifications}
                onChange={() => toggleSetting("notifications")}
              />
            </div>

            {/* Sound */}
            <div className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
              <div className="flex items-center gap-3">
                {settings.sound ? <FaVolumeUp className="text-primary" /> : <FaVolumeMute className="text-error" />}
                <div>
                  <p className="font-medium">Sound</p>
                  <p className="text-sm opacity-70">{settings.sound ? "Enabled" : "Disabled"}</p>
                </div>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={settings.sound}
                onChange={() => toggleSetting("sound")}
              />
            </div>

            {/* Online Status */}
            <div className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${settings.onlineStatus ? "bg-green-500" : "bg-gray-400"}`} />
                <div>
                  <p className="font-medium">Online Status</p>
                  <p className="text-sm opacity-70">{settings.onlineStatus ? "Show online status" : "Hide online status"}</p>
                </div>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={settings.onlineStatus}
                onChange={() => toggleSetting("onlineStatus")}
              />
            </div>

            {/* Privacy */}
            <div className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
              <div className="flex items-center gap-3">
                <FaLock className="text-primary" />
                <div>
                  <p className="font-medium">Privacy</p>
                  <p className="text-sm opacity-70">Current: {settings.privacy}</p>
                </div>
              </div>
              <select
                className="select select-bordered select-sm"
                value={settings.privacy}
                onChange={(e) => changePrivacy(e.target.value)}
              >
                {privacyOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ============ LOGOUT ============ */}
        <div
          onClick={handleLogout}
          className="card bg-error/10 hover:bg-error/20 cursor-pointer transition"
        >
          <div className="card-body p-5 flex flex-row items-center gap-3 text-error">
            <FaSignOutAlt className="size-6" />
            <div className="flex-1">
              <h3 className="font-semibold">Logout</h3>
              <p className="text-sm opacity-70">Sign out of your account</p>
            </div>
            <div className="text-2xl">→</div>
          </div>
        </div>
      </div>
    </div>
  );
}