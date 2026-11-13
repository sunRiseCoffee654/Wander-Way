"use client";

import React, { useEffect, useRef, useState, useCallback, useId } from "react";
import { createClient } from "@/lib/supabase/client";

interface WebRTCCallRoomProps {
  tripId: string;
  userName: string;
  userAvatar?: string;
  onClose: () => void;
}

interface PeerInfo {
  id: string;
  name: string;
  avatar?: string;
  stream?: MediaStream;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function WebRTCCallRoom({
  tripId,
  userName,
  userAvatar,
  onClose,
}: WebRTCCallRoomProps) {
  const reactId = useId();
  const [localPeerId] = useState(() => `peer-${reactId.replace(/:/g, "")}`);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Record<string, PeerInfo>>({});
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Close a specific peer connection
  const closePeerConnection = useCallback((peerId: string) => {
    if (peerConnections.current[peerId]) {
      peerConnections.current[peerId].close();
      delete peerConnections.current[peerId];
    }
    setPeers((prev) => {
      const copy = { ...prev };
      delete copy[peerId];
      return copy;
    });
  }, []);

  // Create or retrieve a peer connection
  const createPeerConnection = useCallback(
    (
      peerId: string,
      peerName: string,
      avatar: string | undefined,
      stream: MediaStream | null
    ) => {
      if (peerConnections.current[peerId]) {
        return peerConnections.current[peerId];
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current[peerId] = pc;

      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "signal",
            payload: {
              type: "ice-candidate",
              senderId: localPeerId,
              targetId: peerId,
              data: event.candidate,
            },
          });
        }
      };

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        setPeers((prev) => ({
          ...prev,
          [peerId]: {
            id: peerId,
            name: peerName,
            avatar,
            stream: remoteStream,
          },
        }));
      };

      setPeers((prev) => ({
        ...prev,
        [peerId]: {
          id: peerId,
          name: peerName,
          avatar,
        },
      }));

      return pc;
    },
    [localPeerId]
  );

  // Initialize Media and Supabase Realtime Signaling Channel
  useEffect(() => {
    let isMounted = true;
    let streamInstance: MediaStream | null = null;
    const supabase = createClient();
    const myId = localPeerId;
    const pcs = peerConnections.current;

    async function initRoom() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        });
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamInstance = stream;
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        console.warn("Unable to access camera/microphone:", err);
        const isDenied = err instanceof Error && err.name === "NotAllowedError";
        setCameraError(
          isDenied
            ? "Camera/mic permission denied. Running in voice-ready mode."
            : "No camera detected. Video calling placeholder active."
        );
      }

      // Connect to Realtime broadcast channel
      const channel = supabase.channel(`trip_call:${tripId}`, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = channel;

      channel
        .on("broadcast", { event: "signal" }, async ({ payload }) => {
          const { type, senderId, senderName, senderAvatar, targetId, data } = payload;
          if (targetId && targetId !== myId) return; // Not meant for us

          if (type === "join") {
            const pc = createPeerConnection(senderId, senderName, senderAvatar, streamInstance);
            if (streamInstance) {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              channel.send({
                type: "broadcast",
                event: "signal",
                payload: {
                  type: "offer",
                  senderId: myId,
                  senderName: userName,
                  senderAvatar: userAvatar,
                  targetId: senderId,
                  data: offer,
                },
              });
            }
          } else if (type === "offer") {
            const pc = createPeerConnection(senderId, senderName, senderAvatar, streamInstance);
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.send({
              type: "broadcast",
              event: "signal",
              payload: {
                type: "answer",
                senderId: myId,
                senderName: userName,
                senderAvatar: userAvatar,
                targetId: senderId,
                data: answer,
              },
            });
          } else if (type === "answer") {
            const pc = pcs[senderId];
            if (pc && pc.signalingState !== "closed") {
              await pc.setRemoteDescription(new RTCSessionDescription(data));
            }
          } else if (type === "ice-candidate") {
            const pc = pcs[senderId];
            if (pc && data) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(data));
              } catch (e) {
                console.warn("Error adding ice candidate:", e);
              }
            }
          } else if (type === "leave") {
            closePeerConnection(senderId);
          }
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            channel.send({
              type: "broadcast",
              event: "signal",
              payload: {
                type: "join",
                senderId: myId,
                senderName: userName,
                senderAvatar: userAvatar,
              },
            });
          }
        });
    }

    initRoom();

    return () => {
      isMounted = false;
      if (streamInstance) {
        streamInstance.getTracks().forEach((track) => track.stop());
      }
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "signal",
          payload: { type: "leave", senderId: myId },
        });
        supabase.removeChannel(channelRef.current);
      }
      Object.keys(pcs).forEach((peerId) => {
        if (pcs[peerId]) {
          pcs[peerId].close();
          delete pcs[peerId];
        }
      });
    };
  }, [tripId, userName, userAvatar, localPeerId, createPeerConnection, closePeerConnection]);

  // Toggle Mute Audio
  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted(!isAudioMuted);
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoDisabled(!isVideoDisabled);
    }
  };

  // Screen share
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = displayStream.getVideoTracks()[0];

        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = displayStream;
        }

        videoTrack.onended = () => {
          setIsScreenSharing(false);
          if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
            const camTrack = localStream.getVideoTracks()[0];
            Object.values(peerConnections.current).forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track?.kind === "video");
              if (sender && camTrack) sender.replaceTrack(camTrack);
            });
          }
        };

        setIsScreenSharing(true);
      } catch (e) {
        console.warn("Screen share cancelled:", e);
      }
    } else {
      if (localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        const camTrack = localStream.getVideoTracks()[0];
        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender && camTrack) sender.replaceTrack(camTrack);
        });
      }
      setIsScreenSharing(false);
    }
  };

  // Add a simulated companion for testing if alone
  const addSimulatedCompanion = () => {
    const simId = `sim-priya-${Date.now()}`;
    setPeers((prev) => ({
      ...prev,
      [simId]: {
        id: simId,
        name: "Priya Nair",
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80",
        isVideoOff: false,
      },
    }));
  };

  const peerList = Object.values(peers);

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] text-white rounded-2xl overflow-hidden shadow-2xl border border-white/10">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#111827]/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold tracking-wide text-white">Live Group Planning Call</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-mono">
            {formatDuration(callDuration)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {peerList.length === 0 && (
            <button
              onClick={addSimulatedCompanion}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-primary/30 hover:bg-primary/50 text-primary-fixed border border-primary/40 transition-colors flex items-center gap-1.5"
              title="Add simulated co-traveler to test UI"
            >
              <span className="material-symbols-outlined text-[14px]">person_add</span>
              Demo Friend
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-3 grid gap-3 grid-cols-1 sm:grid-cols-2 auto-rows-fr overflow-y-auto">
        {/* Local Participant Card */}
        <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-white/10 flex items-center justify-center min-h-[200px] group shadow-inner">
          {localStream && !isVideoDisabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/30 border-2 border-primary/50 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-white/90">{userName} (You)</span>
              {cameraError && (
                <span className="text-[11px] text-amber-300 max-w-xs">{cameraError}</span>
              )}
            </div>
          )}

          {/* Local participant label */}
          <div className="absolute bottom-2.5 left-2.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-xs font-medium flex items-center gap-1.5">
            <span>{userName} (You)</span>
            {isAudioMuted && (
              <span className="material-symbols-outlined text-[13px] text-rose-400">mic_off</span>
            )}
          </div>
        </div>

        {/* Remote Peers Cards */}
        {peerList.map((peer) => (
          <div
            key={peer.id}
            className="relative rounded-xl overflow-hidden bg-slate-900 border border-white/10 flex items-center justify-center min-h-[200px] shadow-inner"
          >
            {peer.stream && !peer.isVideoOff ? (
              <video
                ref={(el) => {
                  if (el && peer.stream && el.srcObject !== peer.stream) {
                    el.srcObject = peer.stream;
                  }
                }}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2.5 p-4 text-center">
                {peer.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={peer.avatar}
                    alt={peer.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-400 shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-emerald-600/30 border-2 border-emerald-500/50 flex items-center justify-center text-2xl font-bold text-emerald-200 shadow-lg">
                    {peer.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-white/90">{peer.name}</span>
                <span className="text-[11px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  Connected
                </span>
              </div>
            )}

            <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xl border border-white/20 text-white text-xs font-medium flex items-center gap-1.5 shadow-md">
              <span>{peer.name}</span>
              {peer.isMuted && (
                <span className="material-symbols-outlined text-[13px] text-rose-400">mic_off</span>
              )}
            </div>
          </div>
        ))}

        {/* Empty state prompt if alone */}
        {peerList.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] flex flex-col items-center justify-center p-6 text-center text-white/60">
            <span className="material-symbols-outlined text-3xl mb-2 text-white/40">group</span>
            <p className="text-xs font-medium text-white/80">Waiting for friends to join...</p>
            <p className="text-[11px] text-white/40 mt-1 max-w-xs">
              Share the trip link with your co-travelers so they can join this room.
            </p>
          </div>
        )}
      </div>

      {/* Control Action Bar */}
      <div className="px-4 py-3 bg-[#111827]/90 backdrop-blur-md border-t border-white/10 flex items-center justify-center gap-3">
        {/* Mic Toggle */}
        <button
          onClick={toggleAudio}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
            isAudioMuted
              ? "bg-rose-500 hover:bg-rose-600 text-white"
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
          title={isAudioMuted ? "Unmute microphone" : "Mute microphone"}
        >
          <span className="material-symbols-outlined text-lg">
            {isAudioMuted ? "mic_off" : "mic"}
          </span>
        </button>

        {/* Video Toggle */}
        <button
          onClick={toggleVideo}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
            isVideoDisabled
              ? "bg-rose-500 hover:bg-rose-600 text-white"
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
          title={isVideoDisabled ? "Turn on camera" : "Turn off camera"}
        >
          <span className="material-symbols-outlined text-lg">
            {isVideoDisabled ? "videocam_off" : "videocam"}
          </span>
        </button>

        {/* Screen Share */}
        <button
          onClick={toggleScreenShare}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
            isScreenSharing
              ? "bg-primary hover:bg-primary-container text-white"
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
          title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
        >
          <span className="material-symbols-outlined text-lg">
            {isScreenSharing ? "stop_screen_share" : "screen_share"}
          </span>
        </button>

        {/* End Call */}
        <button
          onClick={onClose}
          className="px-5 h-11 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs flex items-center gap-2 shadow-lg hover:shadow-rose-900/40 transition-all ml-2"
        >
          <span className="material-symbols-outlined text-lg">call_end</span>
          Leave Call
        </button>
      </div>
    </div>
  );
}
