// frontend/src/pages/ChatPage.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";
import {
  Channel,
  ChannelHeader,
  Chat,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";
import ChatLoader from "../components/ChatLoader";
import { FaPaperclip, FaImage, FaVideo, FaPhone } from "react-icons/fa";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY || "xgqw23kv3tdt";

let globalClient = null;

export default function ChatPage() {
  const { id: targetUserId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const fileInputRef = useRef(null);

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  useEffect(() => {
    const initChat = async () => {
      if (!tokenData?.token || !authUser || !targetUserId) {
        console.log("⏳ Waiting for auth/token...");
        return;
      }

      try {
        console.log("🚀 Initializing 1-on-1 chat...");
        
        if (!globalClient) {
          globalClient = StreamChat.getInstance(STREAM_API_KEY);
          console.log("✅ StreamChat instance created");
        }

        await globalClient.connectUser(
          {
            id: authUser._id,
            name: authUser.fullName,
            image: authUser.profilePicture,
          },
          tokenData.token
        );
        console.log("✅ User connected to Stream");

        const channelId = [authUser._id, targetUserId].sort().join("-");
        console.log("📌 Channel ID:", channelId);

        const currChannel = globalClient.channel("messaging", channelId, {
          members: [authUser._id, targetUserId],
        });

        await currChannel.watch();
        console.log("✅ Channel watched");

        await currChannel.markRead();
        console.log("✅ Channel marked as read");

        // Get messages
        const state = currChannel.state;
        const channelMessages = state.messages || [];
        setMessages(channelMessages);
        console.log("📨 Messages loaded:", channelMessages.length);

        // Listen for new messages
        currChannel.on("message.new", (event) => {
          console.log("📨 New message received:", event.message);
          setMessages((prev) => [...prev, event.message]);
        });

        setChatClient(globalClient);
        setChannel(currChannel);
      } catch (error) {
        console.error("❌ Chat initialization error:", error);
        toast.error("Chat connection failed");
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [tokenData, authUser, targetUserId]);

  // Video Call Handler
  const handleVideoCall = () => {
    if (!channel) {
      toast.error("No channel available");
      return;
    }
    
    try {
      const callId = channel.id;
      console.log("📞 Starting video call with ID:", callId);
      
      // Send call link in chat
      const callUrl = `${window.location.origin}/call/${callId}`;
      channel.sendMessage({
        text: `📞 Join video call: ${callUrl}`,
      });
      toast.success("Call link sent!");
      
      // Navigate to call page
      navigate(`/call/${callId}`);
    } catch (error) {
      console.error("❌ Error starting call:", error);
      toast.error("Failed to start call");
    }
  };

  // Audio Call Handler
  const handleAudioCall = () => {
    if (!channel) {
      toast.error("No channel available");
      return;
    }
    
    try {
      const callId = channel.id;
      console.log("📞 Starting audio call with ID:", callId);
      
      const callUrl = `${window.location.origin}/call/${callId}?audioOnly=true`;
      channel.sendMessage({
        text: `🎙️ Join audio call: ${callUrl}`,
      });
      toast.success("Audio call link sent!");
      
      navigate(`/call/${callId}?audioOnly=true`);
    } catch (error) {
      console.error("❌ Error starting audio call:", error);
      toast.error("Failed to start audio call");
    }
  };

  // File upload handler
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large! Max 10MB");
      return;
    }

    try {
      const { uploadFile } = await import("../lib/api");
      const result = await uploadFile(file);
      
      const fileMessage = `📎 **${result.file.filename}**\n\n📥 Download: ${result.file.url}`;
      await channel.sendMessage({ text: fileMessage });
      
      toast.success("File shared!");
    } catch (error) {
      console.error("File upload error:", error);
      toast.error("Failed to upload file");
    }
    e.target.value = null;
  };

  if (loading) {
    return <ChatLoader />;
  }

  if (!chatClient || !channel) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-error">Failed to load chat</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary mt-4">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[93vh] relative">
      {/* Call Buttons - Fixed at top right */}
      <div className="absolute top-16 right-4 z-10 flex gap-2">
        <button
          onClick={handleAudioCall}
          className="btn btn-success btn-sm gap-2 shadow-lg"
          title="Audio Call"
        >
          <FaPhone className="size-4" /> Audio
        </button>
        <button
          onClick={handleVideoCall}
          className="btn btn-primary btn-sm gap-2 shadow-lg"
          title="Video Call"
        >
          <FaVideo className="size-4" /> Video
        </button>
      </div>

      <Chat client={chatClient}>
        <Channel channel={channel}>
          <Window>
            <ChannelHeader />
            <MessageList />
            <div className="p-2 border-t flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-ghost btn-sm btn-circle"
                title="Upload file"
              >
                <FaPaperclip className="size-4" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-ghost btn-sm btn-circle"
                title="Upload image"
              >
                <FaImage className="size-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.doc,.docx,.txt,.mp4,.mp3,.zip"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <MessageInput />
          </Window>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
}