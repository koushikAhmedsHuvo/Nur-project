// frontend/src/pages/InboxPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";
import { useSocket } from "../hooks/useSocket";
import useAuthUser from "../hooks/useAuthUser";
import { StreamChat } from "stream-chat";
import { FaUser, FaChevronRight, FaSearch, FaInbox } from "react-icons/fa";
import toast from "react-hot-toast";

// ✅ Use environment variable for Stream API Key
const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY || "xgqw23kv3tdt";

export default function InboxPage() {
  const navigate = useNavigate();
  const { authUser, isLoading: authLoading } = useAuthUser();
  const { socket } = useSocket();
  const [chatClient, setChatClient] = useState(null);
  const [channels, setChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: tokenData, isLoading: tokenLoading } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  // Load channels
  const loadChannels = async (client) => {
    if (!client) {
      console.log("❌ No client available");
      return;
    }

    try {
      console.log("📋 Loading channels...");
      console.log("🔗 Stream API Key:", STREAM_API_KEY);
      console.log("👤 User ID:", authUser?._id);
      
      const privateChannels = await client.queryChannels({
        members: { $in: [authUser._id] },
        type: "messaging",
      });
      
      console.log("📋 Private channels loaded:", privateChannels.length);
      setChannels(privateChannels);
      setFilteredChannels(privateChannels);
    } catch (error) {
      console.error("❌ Error loading channels:", error);
      toast.error("Failed to load inbox");
    } finally {
      setLoading(false);
    }
  };

  // Initialize client
  useEffect(() => {
    if (!authUser || !tokenData?.token) {
      console.log("⏳ Waiting for auth/token...");
      return;
    }

    const initClient = async () => {
      try {
        console.log("🚀 Initializing Stream client...");
        console.log("🔗 Using API Key:", STREAM_API_KEY);
        
        const client = StreamChat.getInstance(STREAM_API_KEY);
        
        await client.connectUser(
          {
            id: authUser._id,
            name: authUser.fullName,
            image: authUser.profilePicture,
          },
          tokenData.token
        );
        
        console.log("✅ User connected to Stream");
        setChatClient(client);
        
        await loadChannels(client);
      } catch (error) {
        console.error("❌ Error connecting to Stream:", error);
        setLoading(false);
      }
    };

    initClient();

    return () => {
      if (chatClient) {
        console.log("🧹 Disconnecting Stream client");
        chatClient.disconnectUser();
      }
    };
  }, [authUser, tokenData]);

  // Listen for new messages via socket
  useEffect(() => {
    if (!socket || !chatClient) return;

    const handleNewMessage = () => {
      console.log("📨 New message detected, refreshing channels...");
      loadChannels(chatClient);
    };

    socket.on("new_private_message", handleNewMessage);
    socket.on("new_group_message", handleNewMessage);

    return () => {
      socket.off("new_private_message");
      socket.off("new_group_message");
    };
  }, [socket, chatClient]);

  // Get channel info
  const getChannelInfo = (channel) => {
    try {
      const members = Object.values(channel.state?.members || {});
      const otherMembers = members.filter((m) => m.user?.id !== authUser?._id);
      const other = otherMembers[0];
      
      const messages = channel.state?.messages || [];
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      
      return {
        name: other?.user?.name || "Unknown User",
        avatar: other?.user?.image || "",
        online: other?.user?.online || false,
        lastMessage: lastMessage?.text || "No messages yet",
        timestamp: lastMessage?.created_at || channel.created_at,
        unreadCount: channel.state?.unreadCount || 0,
        id: channel.id,
        otherUserId: other?.user?.id,
      };
    } catch (error) {
      console.error("Error getting channel info:", error);
      return {
        name: "Unknown User",
        avatar: "",
        online: false,
        lastMessage: "No messages yet",
        timestamp: new Date(),
        unreadCount: 0,
        id: channel.id,
        otherUserId: null,
      };
    }
  };

  // Filter channels
  useEffect(() => {
    let filtered = channels;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((ch) => {
        const info = getChannelInfo(ch);
        return info.name.toLowerCase().includes(query);
      });
    }
    
    setFilteredChannels(filtered);
  }, [channels, searchQuery]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const openChat = (channel) => {
    const info = getChannelInfo(channel);
    if (info.otherUserId) {
      navigate(`/chat/${info.otherUserId}`);
    }
  };

  // Debug logs
  console.log("🔍 Inbox Debug:");
  console.log("VITE_STREAM_API_KEY:", import.meta.env.VITE_STREAM_API_KEY);
  console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);
  console.log("VITE_SOCKET_URL:", import.meta.env.VITE_SOCKET_URL);

  // Loading states
  if (authLoading || tokenLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  // No auth user
  if (!authUser) {
    return (
      <div className="container mx-auto max-w-4xl p-4">
        <div className="text-center py-12 bg-base-200 rounded-xl">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold mb-2">Please Login</h3>
          <p className="text-base-content/70">You need to be logged in to see your inbox</p>
          <button onClick={() => navigate("/login")} className="btn btn-primary mt-4">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FaInbox className="text-primary" /> Inbox
        </h1>
        <span className="text-sm opacity-70">
          {filteredChannels.length} conversation{filteredChannels.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="relative mb-4">
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50" />
        <input
          type="text"
          placeholder="Search conversations..."
          className="input input-bordered w-full pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredChannels.length === 0 ? (
        <div className="text-center py-12 bg-base-200 rounded-xl">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold mb-2">No conversations yet</h3>
          <p className="text-base-content/70">Add friends to start private chats!</p>
          <button onClick={() => navigate("/")} className="btn btn-primary mt-4">
            Find Friends
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredChannels.map((channel) => {
            const info = getChannelInfo(channel);
            
            return (
              <div
                key={channel.id}
                onClick={() => openChat(channel)}
                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:bg-base-200 ${
                  info.unreadCount > 0 ? "bg-primary/5 border-l-4 border-primary" : "bg-base-100"
                }`}
              >
                {/* Avatar */}
                <div className="avatar relative">
                  <div className="w-14 rounded-full ring ring-primary/20">
                    {info.avatar ? (
                      <img src={info.avatar} alt={info.name} />
                    ) : (
                      <img src="https://avatar.iran.liara.run/public/1.png" alt="User" />
                    )}
                  </div>
                  {info.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-base-100"></div>
                  )}
                </div>

                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold truncate">{info.name}</h3>
                    <span className="text-xs text-base-content/50 whitespace-nowrap ml-2">
                      {formatTime(info.timestamp)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className={`text-sm truncate flex-1 ${info.unreadCount > 0 ? "font-semibold text-base-content" : "text-base-content/60"}`}>
                      {info.lastMessage}
                    </p>
                    <div className="flex items-center gap-2 ml-2">
                      {info.unreadCount > 0 && (
                        <span className="badge badge-primary badge-sm">
                          {info.unreadCount}
                        </span>
                      )}
                      <FaChevronRight className="text-base-content/30 text-xs" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}