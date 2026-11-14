// frontend/src/pages/GroupChatPage.jsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getGroupMessages, sendGroupMessage, getMyGroups } from "../lib/api";
import { useSocket } from "../hooks/useSocket";
import useAuthUser from "../hooks/useAuthUser";
import toast from "react-hot-toast";
import AddMembersModal from "../components/AddMembersModal";
import { 
  FaInfoCircle, FaBell, FaBellSlash, FaSignOutAlt, 
  FaPalette, FaUsers, FaUserPlus, FaPaperclip, FaImage
} from "react-icons/fa";
import { axiosInstance } from "../lib/axios";

export default function GroupChatPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [groupInfo, setGroupInfo] = useState(null);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [groupColor, setGroupColor] = useState("#4F46E5");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const themeColors = [
    { name: "Default", color: "#4F46E5" },
    { name: "Red", color: "#EF4444" },
    { name: "Green", color: "#22C55E" },
    { name: "Blue", color: "#3B82F6" },
    { name: "Purple", color: "#8B5CF6" },
    { name: "Pink", color: "#EC4899" },
    { name: "Orange", color: "#F59E0B" },
    { name: "Teal", color: "#14B8A6" },
  ];

  const { data: groups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: getMyGroups,
  });

  useEffect(() => {
    const currentGroup = groups.find(g => g._id === groupId);
    if (currentGroup) {
      setGroupInfo(currentGroup);
    }
  }, [groups, groupId]);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["groupMessages", groupId],
    queryFn: () => getGroupMessages(groupId),
    enabled: !!groupId,
  });

  const { mutate: sendMsg, isPending } = useMutation({
    mutationFn: sendGroupMessage,
    onSuccess: (newMessage) => {
      queryClient.setQueryData(
        ["groupMessages", groupId],
        (old = []) => [...old, newMessage]
      );
      setMessage("");
    },
    onError: () => toast.error("Failed to send message"),
  });

  useEffect(() => {
    if (!socket) return;

    socket.emit("join_group", groupId);

    socket.on("new_group_message", (msg) => {
      if (!isMuted) {
        queryClient.setQueryData(
          ["groupMessages", groupId],
          (old = []) => {
            if (old.some(m => m._id === msg._id)) return old;
            return [...old, msg];
          }
        );
      }
    });

    return () => {
      socket.emit("leave_group", groupId);
      socket.off("new_group_message");
    };
  }, [socket, groupId, queryClient, isMuted]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim() || isPending) return;
    sendMsg({ groupId, text: message });
  };

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
      sendMsg({ groupId, text: fileMessage });
      
      toast.success("File shared!");
    } catch (error) {
      toast.error("Failed to upload file");
    }
    e.target.value = null;
  };

  const startAudioCall = () => {
    const callLink = `${window.location.origin}/group-call/${groupId}?audioOnly=true`;
    const callMessage = `🎙️ **${authUser?.fullName} started an Audio Call!** 🎙️\n\n📞 Click here to join: ${callLink}`;
    sendMsg({ groupId, text: callMessage });
    toast.success("Audio call started!");
  };

  const startVideoCall = async () => {
    setIsGenerating(true);
    const callLink = `${window.location.origin}/group-call/${groupId}`;
    const callMessage = `🔴 **${authUser?.fullName} started a Video Call!** 🔴\n\n📞 Click here to join: ${callLink}\n\n🎥 Join the video call to connect with everyone!`;
    
    try {
      await sendMsg({ groupId, text: callMessage });
      toast.success("Video call started!");
      navigate(`/group-call/${groupId}`);
    } catch (error) {
      toast.error("Failed to start call");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (window.confirm("Are you sure you want to leave this group?")) {
      try {
        const updatedMembers = groupInfo.members.filter(
          member => member._id !== authUser._id
        );
        
        await axiosInstance.put(`/groups/${groupId}`, {
          members: updatedMembers.map(m => m._id || m)
        });
        
        toast.success("You left the group");
        navigate("/groups");
      } catch (error) {
        toast.error("Failed to leave group");
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast.success(isMuted ? "Group unmuted" : "Group muted");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-base-100">
      {/* Header */}
      <div className="p-3 border-b bg-base-200 flex justify-between items-center">
        <button onClick={() => navigate("/groups")} className="btn btn-ghost btn-sm">
          ← Back
        </button>
        
        <div 
          className="text-center cursor-pointer hover:opacity-70 transition"
          onClick={() => setShowGroupInfo(!showGroupInfo)}
        >
          <h1 className="font-bold text-lg" style={{ color: groupColor }}>
            {groupInfo?.name || "Group Chat"}
          </h1>
          <p className="text-xs opacity-70">
            {groupInfo?.members?.length || 0} member{groupInfo?.members?.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex gap-1">
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => setShowGroupInfo(!showGroupInfo)}
            title="Group Info"
          >
            <FaInfoCircle />
          </button>
          
          <button
            className={`btn btn-ghost btn-sm btn-circle ${isMuted ? 'text-error' : ''}`}
            onClick={toggleMute}
            title={isMuted ? "Unmute Group" : "Mute Group"}
          >
            {isMuted ? <FaBellSlash /> : <FaBell />}
          </button>
          
          <div className="relative">
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              title="Group Theme"
            >
              <FaPalette />
            </button>
            
            {showThemeMenu && (
              <div className="absolute right-0 mt-2 p-2 bg-base-200 rounded-xl shadow-2xl z-50 w-48">
                <p className="text-xs font-semibold mb-2 px-2">Choose Theme Color</p>
                <div className="grid grid-cols-4 gap-1">
                  {themeColors.map((color) => (
                    <button
                      key={color.name}
                      className={`w-10 h-10 rounded-full border-2 transition ${
                        groupColor === color.color ? 'border-primary' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.color }}
                      onClick={() => {
                        setGroupColor(color.color);
                        setShowThemeMenu(false);
                        toast.success(`Theme set to ${color.name}`);
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button
            className="btn btn-secondary btn-sm gap-1"
            onClick={() => setShowAddMembersModal(true)}
            title="Add Members"
          >
            <FaUserPlus />
          </button>
          
          <button
            className="btn btn-error btn-sm gap-1"
            onClick={handleLeaveGroup}
            title="Leave Group"
          >
            <FaSignOutAlt />
          </button>
        </div>
      </div>

      {showGroupInfo && (
        <div className="p-4 bg-base-200/50 border-b">
          <div className="flex items-center gap-3 mb-3">
            <div className="avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-12">
                <span className="text-xl">{groupInfo?.name?.charAt(0) || "G"}</span>
              </div>
            </div>
            <div>
              <h3 className="font-bold">{groupInfo?.name}</h3>
              <p className="text-sm opacity-70">
                <FaUsers className="inline mr-1" />
                {groupInfo?.members?.length || 0} members
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {groupInfo?.members?.map((member) => (
              <div key={member._id} className="badge badge-outline gap-1">
                <div className="avatar">
                  <div className="w-4 h-4 rounded-full">
                    <img src={member.profilePicture} alt={member.fullName} />
                  </div>
                </div>
                {member.fullName}
                {member._id === groupInfo?.createdBy && (
                  <span className="text-xs text-primary">👑</span>
                )}
              </div>
            ))}
          </div>
          
          <button
            className="btn btn-ghost btn-sm mt-2"
            onClick={() => setShowGroupInfo(false)}
          >
            Close
          </button>
        </div>
      )}

      <div className="p-2 border-b bg-base-100 flex justify-center gap-3">
        <button className="btn btn-success btn-sm gap-2" onClick={startAudioCall}>
          🎙️ Audio Call
        </button>
        <button
          className="btn btn-primary btn-sm gap-2"
          onClick={startVideoCall}
          disabled={isGenerating}
        >
          {isGenerating ? <span className="loading loading-spinner loading-xs" /> : "📹 Video Call"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-base-content opacity-50 mt-10">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.sender?._id === authUser?._id;
            const isCallLink = msg.text?.includes("/group-call/");
            const isAudioCall = msg.text?.includes("Audio Call");
            const isFileMessage = msg.text?.includes("📎");
            
            return (
              <div
                key={msg._id}
                className={`chat ${isOwnMessage ? "chat-end" : "chat-start"}`}
              >
                {!isOwnMessage && (
                  <div className="chat-header text-xs opacity-70 mb-1">
                    {msg.sender?.fullName}
                  </div>
                )}
                <div className={`chat-bubble ${isOwnMessage ? "chat-bubble-primary" : "chat-bubble-secondary"} ${isCallLink ? "bg-primary/20 border border-primary" : ""}`}>
                  {isCallLink ? (
                    <div className="space-y-2">
                      <div className={`font-bold ${isAudioCall ? "text-success" : "text-primary"}`}>
                        {isAudioCall ? "🎙️ Live Audio Call!" : "🔴 Live Video Call!"}
                      </div>
                      <p>{msg.text.split("\n\n")[0]}</p>
                      {msg.text.match(/https?:\/\/[^\s]+/g)?.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          onClick={(e) => {
                            e.preventDefault();
                            window.location.href = link;
                          }}
                          className={`btn btn-sm w-full mt-2 ${isAudioCall ? "btn-success" : "btn-primary"}`}
                        >
                          {isAudioCall ? "🎙️ Join Audio Call" : "🎥 Join Video Call"}
                        </a>
                      ))}
                    </div>
                  ) : isFileMessage ? (
                    <div className="space-y-2">
                      <p className="font-semibold text-primary">📎 File Shared</p>
                      <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words">
                      {msg.text}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t bg-base-200">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              className="input input-bordered w-full pr-24"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isMuted ? "🔇 Group muted" : "Type a message..."}
              disabled={isMuted}
            />
            
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-ghost btn-xs btn-circle"
                title="Upload file"
              >
                <FaPaperclip className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-ghost btn-xs btn-circle"
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
          </div>
          <button type="submit" className="btn btn-success" disabled={isPending || isMuted}>
            {isPending ? "Sending..." : "Send"}
          </button>
        </div>
      </form>

      {showAddMembersModal && (
        <AddMembersModal
          groupId={groupId}
          groupName={groupInfo?.name || "Group"}
          onClose={() => setShowAddMembersModal(false)}
        />
      )}
    </div>
  );
}