import { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

const APP_ID = "8ab37d8dcc8e45c199071461d4204bcd";
const CHANNEL = "test-channel";
const TOKEN =
    "007eJxTYPheLSEzK+QBX4mSjVzndMad3LkBYbZpU7kft3/YtUfv93YFBovEJGPzFIuU5GSLVBPTZENLSwNzQxMzwxQTIwOTpOSUDpcpmQ2BjAysHveZGRkgEMTnYShJLS7RTc5IzMtLzWFgAADFACDR";

export default function LiveStream() {
    const clientRef = useRef(null);
    const localVideoRef = useRef(null);
    const localTracksRef = useRef([]);

    const [joined, setJoined] = useState(false);
    const [role, setRole] = useState("host");
    const [hostExists, setHostExists] = useState(false);
    const [height, setHeight] = useState(400);
    const [joinedUsers, setJoinedUsers] = useState(0);

    useEffect(() => {
        const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
        clientRef.current = client;

        setHeight(window.innerHeight);

        return () => {
            leaveChannel();
        };
    }, []);

    // ================= JOIN =================
    const joinChannel = async () => {
        const client = clientRef.current;

        await client.setClientRole(role);
        await client.join(APP_ID, CHANNEL, TOKEN || null, null);

        // detect if host already exists
        if (client.remoteUsers.length > 0) {
            setHostExists(true);
        }

        client.on("user-joined", () => {
            setHostExists(true);
        });

        setJoinedUsers(client.remoteUsers.length + 1);

        // ================= HOST =================
        if (role === "host") {
            const tracks = await AgoraRTC.createMicrophoneAndCameraTracks(
                { echoCancellation: true, noiseSuppression: true },
                { encoderConfig: "720p" }
            );

            localTracksRef.current = tracks;

            await client.publish(tracks);

            // wait for DOM to render
            setTimeout(() => {
                if (localVideoRef.current) {
                    tracks[1].play(localVideoRef.current);
                }
            }, 500);
        }

        // ================= AUDIENCE RECEIVE =================
        client.on("user-published", async (user, mediaType) => {
            await client.subscribe(user, mediaType);

            if (mediaType === "video") {
                const remoteContainer = document.getElementById("remote-container");

                // clear existing to avoid duplicate screens
                remoteContainer.innerHTML = "";

                const remoteDiv = document.createElement("div");
                remoteDiv.id = user.uid;
                remoteDiv.style.width = "400px";
                remoteDiv.style.height = height + "px";
                remoteDiv.style.background = "black";

                remoteContainer.appendChild(remoteDiv);
                user.videoTrack.play(remoteDiv);
            }

            if (mediaType === "audio") {
                user.audioTrack.play();
            }
        });

        // if host leaves
        client.on("user-unpublished", () => {
            document.getElementById("remote-container").innerHTML = "";
            setHostExists(false);
        });

        setJoined(true);
    };

    // ================= LEAVE =================
    const leaveChannel = async () => {
        try {
            const client = clientRef.current;

            // stop camera/mic if host
            if (localTracksRef.current.length) {
                localTracksRef.current.forEach((track) => {
                    track.stop();
                    track.close();
                });
                localTracksRef.current = [];
            }

            if (client) {
                await client.leave();
                client.removeAllListeners();
            }

            // clear remote videos
            const remoteContainer = document.getElementById("remote-container");
            if (remoteContainer) remoteContainer.innerHTML = "";

            setJoined(false);
            setHostExists(false);
        } catch (err) {
            console.log(err);
        }
    };

    // ================= UI =================
    return (
        <div
            style={{
                width: "100vw",
                height: "100vh",
                background: "black",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
                position: "relative",
            }}
        >
            {/* JOIN CONTROLS */}
            {!joined && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "10%",
                        display: "flex",
                        gap: 10,
                    }}
                >
                    <select
                        onChange={(e) => setRole(e.target.value)}
                        style={{ padding: 10 }}
                    >
                        <option value="host" disabled={hostExists}>
                            Host (Go Live)
                        </option>
                        <option value="audience">Audience (Watch)</option>
                    </select>

                    <button onClick={joinChannel} style={{ padding: 10 }}>
                        Join Stream
                    </button>
                </div>
            )}

            {/* END BUTTON */}
            {joined && (
                <button
                    onClick={leaveChannel}
                    style={{
                        position: "absolute",
                        bottom: "10%",
                        padding: 12,
                        background: "red",
                        color: "white",
                        borderRadius: 6,
                        zIndex: 1000,
                    }}
                >
                    {role === "host" ? "End Stream" : "Leave"}
                </button>
            )}

            {
                joined && (
                    <p style={{ color: "white" }}>{joinedUsers} users joined</p>
                )
            }

            {/* REMOTE VIDEO (AUDIENCE VIEW) */}
            <div
                id="remote-container"
                style={{ display: "flex", justifyContent: "center" }}
            />

            {/* LOCAL VIDEO (HOST ONLY) */}
            {role === "host" && joined && (
                <div
                    ref={localVideoRef}
                    style={{
                        width: 400,
                        height: height,
                        background: "black",
                    }}
                />
            )}
        </div>
    );
}
