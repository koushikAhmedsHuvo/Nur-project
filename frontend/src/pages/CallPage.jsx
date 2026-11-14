// frontend/src/pages/CallPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";

import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  CallControls,
  SpeakerLayout,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from "react-hot-toast";
import { FaSyncAlt } from "react-icons/fa";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY || "xgqw23kv3tdt";

export default function CallPage() {
  const { id: callId } = useParams();
  const [searchParams] = useSearchParams();
  const isAudioOnly = searchParams.get("audioOnly") === "true";
  const navigate = useNavigate();
  const { authUser, isLoading } = useAuthUser();
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [facingMode, setFacingMode] = useState("user");

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  useEffect(() => {
    const initCall = async () => {
      if (!tokenData?.token || !authUser || !callId) {
        console.log("⏳ Waiting for auth/token/callId...");
        return;
      }

      try {
        console.log("🚀 Initializing 1-on-1 call...");
        console.log("📞 Call ID:", callId);
        console.log("🎯 Audio Only:", isAudioOnly);

        const user = {
          id: authUser._id,
          name: authUser.fullName,
          image: authUser.profilePicture,
        };

        const videoClient = new StreamVideoClient({
          apiKey: STREAM_API_KEY,
          user,
          token: tokenData.token,
        });

        const callInstance = videoClient.call("default", callId);
        
        console.log("📞 Joining call...");
        await callInstance.join({ create: true });

        if (isAudioOnly) {
          await callInstance.camera.disable();
          console.log("🔇 Camera disabled for audio-only call");
        }

        console.log("✅ Joined call successfully");
        setClient(videoClient);
        setCall(callInstance);
      } catch (error) {
        console.error("❌ Error joining call:", error);
        toast.error("Could not join the call. Please try again.");
      } finally {
        setIsConnecting(false);
      }
    };

    initCall();
  }, [tokenData, authUser, callId, isAudioOnly]);

  const toggleCamera = async () => {
    if (!call) return;

    try {
      const newFacingMode = facingMode === "user" ? "environment" : "user";
      setFacingMode(newFacingMode);

      await call.camera.disable();
      await new Promise(resolve => setTimeout(resolve, 300));
      await call.camera.enable({
        video: { facingMode: newFacingMode }
      });
      
      toast.success(`Switched to ${newFacingMode === "user" ? "Front" : "Back"} camera`);
    } catch (error) {
      console.error("Camera switch error:", error);
      toast.error("Failed to switch camera");
      try { await call.camera.enable(); } catch (e) {}
    }
  };

  const handleLeave = async () => {
    if (call) {
      await call.leave();
      toast.success("Call ended");
    }
    navigate("/");
  };

  if (isLoading || isConnecting) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-white mt-4">Connecting to call...</p>
        </div>
      </div>
    );
  }

  if (!client || !call) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <p className="text-xl">Failed to connect to call</p>
          <p className="text-sm opacity-70 mt-2">Please try again</p>
          <button onClick={() => navigate("/")} className="btn btn-primary mt-4">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <style>
        {`
          .str-video__call-controls__button {
            background-color: rgba(0,0,0,0.8) !important;
            color: white !important;
            border-radius: 50% !important;
            width: 48px !important;
            height: 48px !important;
            margin: 0 8px !important;
            border: none !important;
          }
          .str-video__call-controls__button svg {
            fill: white !important;
            stroke: white !important;
          }
          .str-video__call-controls {
            background: rgba(0,0,0,0.6) !important;
            padding: 12px 20px !important;
            border-radius: 60px !important;
          }
          .str-video__speaker-layout {
            background: #1a1a2e !important;
            border-radius: 16px !important;
            overflow: hidden;
          }
          .str-video__participant-name {
            background: rgba(0,0,0,0.7) !important;
            color: white !important;
            padding: 4px 12px !important;
            border-radius: 20px !important;
            font-size: 12px !important;
          }
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
          <div className="flex-1 p-4">
            <SpeakerLayout />
          </div>
          
          <div className="pb-8 flex flex-col items-center gap-4">
            {!isAudioOnly && (
              <button
                onClick={toggleCamera}
                className="btn btn-ghost btn-sm gap-2 text-white/70 hover:text-white"
              >
                <FaSyncAlt className="size-4" />
                {facingMode === "user" ? "Front Camera" : "Back Camera"}
              </button>
            )}
            
            <CallControls onLeave={handleLeave} />
          </div>
        </StreamCall>
      </StreamVideo>
    </div>
  );
}