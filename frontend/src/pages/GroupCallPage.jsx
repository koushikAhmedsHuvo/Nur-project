// frontend/src/pages/GroupCallPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  SpeakerLayout,
  PaginatedGridLayout,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from "react-hot-toast";
import { FaSyncAlt } from "react-icons/fa";

const STREAM_API_KEY = "xgqw23kv3tdt";

export default function GroupCallPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAudioOnly = searchParams.get("audioOnly") === "true";
  const { authUser, isLoading: authLoading } = useAuthUser();
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(isAudioOnly);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [reactionsList, setReactionsList] = useState([]);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [layout, setLayout] = useState("grid");
  const [screenShareStream, setScreenShareStream] = useState(null);
  const [facingMode, setFacingMode] = useState("user");

  const { data: tokenData, isLoading: tokenLoading } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  // Call duration timer
  useEffect(() => {
    if (callStartedAt) {
      const interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartedAt) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [callStartedAt]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ✅ FIXED: Toggle Camera (Front/Back)
  const toggleCamera = async () => {
    if (!call) return;

    try {
      const newFacingMode = facingMode === "user" ? "environment" : "user";
      setFacingMode(newFacingMode);

      // Turn off camera first
      await call.camera.disable();

      // Small delay to ensure camera is fully disabled
      await new Promise(resolve => setTimeout(resolve, 300));

      // Enable camera with new facing mode
      await call.camera.enable({
        video: { facingMode: newFacingMode }
      });
      
      toast.success(`Switched to ${newFacingMode === "user" ? "Front" : "Back"} camera`);
    } catch (error) {
      console.error("Camera switch error:", error);
      toast.error("Failed to switch camera");
      
      // Try to re-enable camera if it failed
      try {
        await call.camera.enable();
      } catch (e) {
        console.error("Failed to re-enable camera:", e);
      }
    }
  };

  // Initialize client and join call
  useEffect(() => {
    if (!authUser || !tokenData?.token) return;

    const user = {
      id: authUser._id,
      name: authUser.fullName,
      image: authUser.profilePicture,
    };

    const videoClient = new StreamVideoClient({
      apiKey: STREAM_API_KEY,
      user: user,
      token: tokenData.token,
    });

    setClient(videoClient);

    const callInstance = videoClient.call("default", groupId);
    setCall(callInstance);

    callInstance
      .join({ create: true })
      .then(async () => {
        console.log("✅ Joined call:", groupId);
        setCallStartedAt(Date.now());
        
        if (isAudioOnly) {
          await callInstance.camera.disable();
          setIsVideoOff(true);
        }
        
        toast.success(`Connected to ${isAudioOnly ? 'audio' : 'video'} call`);
        
        const updateCount = () => {
          const participants = callInstance.state.participants;
          if (participants) {
            setParticipantCount(Object.keys(participants).length);
          }
        };
        
        updateCount();
        callInstance.on("participant-joined", updateCount);
        callInstance.on("participant-left", updateCount);
        
        // Listen for reactions
        callInstance.on("custom", (event) => {
          if (event.type === "reaction") {
            setReactionsList(prev => [...prev, {
              reaction: event.reaction,
              timestamp: Date.now()
            }]);
            setTimeout(() => {
              setReactionsList(prev => prev.filter(r => r.timestamp !== event.timestamp));
            }, 2000);
          }
        });
      })
      .catch((err) => {
        console.error("Join call error:", err);
        toast.error("Failed to join call");
      });

    return () => {
      if (callInstance) {
        callInstance.off("participant-joined");
        callInstance.off("participant-left");
        callInstance.leave();
      }
      if (videoClient) {
        videoClient.disconnectUser();
      }
      if (screenShareStream) {
        screenShareStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [authUser, tokenData, groupId, isAudioOnly]);

  const toggleMute = async () => {
    if (call) {
      if (isMuted) {
        await call.microphone.enable();
        toast.success("Mic unmuted");
      } else {
        await call.microphone.disable();
        toast.success("Mic muted");
      }
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = async () => {
    if (call && !isAudioOnly) {
      if (isVideoOff) {
        await call.camera.enable();
        toast.success("Camera on");
      } else {
        await call.camera.disable();
        toast.success("Camera off");
      }
      setIsVideoOff(!isVideoOff);
    }
  };

  // Screen Share using browser's native API
  const toggleScreenShare = async () => {
    if (!call) return;
    
    try {
      if (isScreenSharing) {
        if (screenShareStream) {
          screenShareStream.getTracks().forEach(track => track.stop());
          setScreenShareStream(null);
        }
        if (!isVideoOff) {
          await call.camera.enable();
        }
        setIsScreenSharing(false);
        toast.success("Screen sharing stopped");
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenShareStream(stream);
        
        const videoTrack = stream.getVideoTracks()[0];
        await call.publishVideoStream(videoTrack);
        await call.camera.disable();
        
        setIsScreenSharing(true);
        toast.success("Screen sharing started");
        
        videoTrack.onended = () => {
          toggleScreenShare();
        };
      }
    } catch (err) {
      console.error("Screen share error:", err);
      toast.error("Screen share cancelled or failed");
    }
  };

  // Recording using browser's MediaRecorder API
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);

  const toggleRecording = async () => {
    if (!call) return;
    
    try {
      if (isRecording) {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
        setIsRecording(false);
        toast.success("Recording stopped. Saving...");
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true, 
          audio: true 
        });
        
        const recorder = new MediaRecorder(stream);
        const chunks = [];
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `call-recording-${Date.now()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success("Recording saved!");
          stream.getTracks().forEach(track => track.stop());
        };
        
        recorder.start(1000);
        setMediaRecorder(recorder);
        setRecordedChunks(chunks);
        setIsRecording(true);
        toast.success("Recording started");
      }
    } catch (err) {
      console.error("Recording error:", err);
      toast.error("Recording failed");
    }
  };

  const sendReaction = (reaction) => {
    if (call) {
      call.sendCustomEvent({ type: "reaction", reaction });
      setShowReactions(false);
      toast.success(`Sent ${reaction}`);
    }
  };

  const handleEndCall = async () => {
    if (isScreenSharing && screenShareStream) {
      screenShareStream.getTracks().forEach(track => track.stop());
    }
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
    }
    if (call) {
      await call.leave();
      toast.success("Call ended");
    }
    navigate(`/groups/${groupId}`);
  };

  if (authLoading || tokenLoading || !client || !call) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-white mt-4 font-medium">Joining call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      <style>
        {`
          .str-video__call-controls__button {
            background-color: rgba(0, 0, 0, 0.75) !important;
            color: white !important;
            border-radius: 50% !important;
            width: 48px !important;
            height: 48px !important;
            margin: 0 6px !important;
            cursor: pointer !important;
          }
          .str-video__call-controls__button svg {
            fill: white !important;
            stroke: white !important;
          }
          .str-video__call-controls__button:hover {
            background-color: #4f46e5 !important;
          }
          .str-video__call-controls__button--active {
            background-color: #ef4444 !important;
          }
          .str-video__call-controls {
            background: rgba(0, 0, 0, 0.5) !important;
            padding: 12px 20px !important;
            border-radius: 60px !important;
          }
          .str-video__participant-name {
            background: rgba(0, 0, 0, 0.7) !important;
            color: white !important;
            padding: 4px 12px !important;
            border-radius: 20px !important;
            font-size: 12px !important;
          }
          @keyframes bounce {
            0%,100%{transform:scale(1);opacity:1}
            50%{transform:scale(1.5);opacity:0.7}
          }
          .animate-bounce { animation: bounce 0.8s ease-out forwards; }
          @media (max-width: 768px) {
            .str-video__call-controls__button {
              width: 40px !important;
              height: 40px !important;
            }
          }
        `}
      </style>

      <StreamVideo client={client}>
        <StreamCall call={call}>
          <div className="p-3 bg-black/50 flex justify-between items-center">
            <div>
              <h1 className="text-white font-bold">
                {isAudioOnly ? "🎙️ Audio Call" : "🎥 Video Call"}
              </h1>
              <p className="text-white/50 text-xs">
                {formatDuration(callDuration)} • {participantCount} participants
              </p>
            </div>
            <button onClick={handleEndCall} className="btn btn-error btn-sm">End Call</button>
          </div>

          <div className="flex-1 p-3">
            {participantCount <= 2 ? (
              <SpeakerLayout participantsBarPosition="bottom" />
            ) : (
              <PaginatedGridLayout />
            )}
          </div>

          <div className="p-3 bg-black/50">
            <div className="flex justify-center gap-2 flex-wrap">
              <button onClick={toggleMute} className={`btn rounded-full w-11 h-11 ${isMuted ? 'btn-error' : 'btn-success'}`}>
                {isMuted ? "🔇" : "🎤"}
              </button>
              
              {!isAudioOnly && (
                <button onClick={toggleVideo} className={`btn rounded-full w-11 h-11 ${isVideoOff ? 'btn-error' : 'btn-primary'}`}>
                  {isVideoOff ? "📷" : "📹"}
                </button>
              )}
              
              <button
                onClick={toggleCamera}
                className="btn rounded-full w-11 h-11 bg-secondary"
                title={facingMode === "user" ? "Front Camera" : "Back Camera"}
              >
                <FaSyncAlt className="size-5" />
              </button>
              
              <button onClick={toggleScreenShare} className={`btn rounded-full w-11 h-11 ${isScreenSharing ? 'btn-info' : 'btn-secondary'}`}>
                🖥️
              </button>
              
              <button onClick={toggleRecording} className={`btn rounded-full w-11 h-11 ${isRecording ? 'btn-error animate-pulse' : 'btn-warning'}`}>
                {isRecording ? "⏺️" : "🔴"}
              </button>
              
              <button onClick={() => setShowReactions(!showReactions)} className="btn rounded-full w-11 h-11 bg-purple-600">
                😊
              </button>
              
              <button onClick={handleEndCall} className="btn btn-error rounded-full w-11 h-11">📞</button>
            </div>
            
            {showReactions && (
              <div className="flex justify-center gap-2 mt-3 flex-wrap">
                {["👍","❤️","😂","😮","😢","👏","🎉","🔥"].map(emoji => (
                  <button key={emoji} onClick={() => sendReaction(emoji)} className="text-2xl hover:scale-125 transition">
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            
            {reactionsList.map((r, i) => (
              <div key={i} className="fixed top-1/2 left-1/2 text-4xl animate-bounce pointer-events-none z-50">
                {r.reaction}
              </div>
            ))}
            
            <div className="flex justify-center gap-3 mt-2 text-white/40 text-xs flex-wrap">
              <span>{isMuted ? "🔴 Mic off" : "🟢 Mic on"}</span>
              {!isAudioOnly && <span>{isVideoOff ? "📷 Camera off" : "📹 Camera on"}</span>}
              <span>{facingMode === "user" ? "📱 Front Camera" : "📷 Back Camera"}</span>
              {isScreenSharing && <span className="text-info">🖥️ Sharing screen</span>}
              {isRecording && <span className="text-error animate-pulse">🔴 Recording</span>}
            </div>
            
            <div className="flex justify-center mt-2">
              <button 
                onClick={() => setLayout(layout === "grid" ? "speaker" : "grid")}
                className="text-white/40 text-xs hover:text-white/80"
              >
                {layout === "grid" ? "Switch to Speaker View" : "Switch to Grid View"}
              </button>
            </div>
          </div>
        </StreamCall>
      </StreamVideo>
    </div>
  );
}