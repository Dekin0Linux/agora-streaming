import { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

const APP_ID = "8ab37d8dcc8e45c199071461d4204bcd";
const CHANNEL = "test-channel";
const TOKEN = "007eJxTYPheLSEzK+QBX4mSjVzndMad3LkBYbZpU7kft3/YtUfv93YFBovEJGPzFIuU5GSLVBPTZENLSwNzQxMzwxQTIwOTpOSUDpcpmQ2BjAysHveZGRkgEMTnYShJLS7RTc5IzMtLzWFgAADFACDR"; // use null for testing or your token from backend

export default function LiveStream() {
    const clientRef = useRef(null);
    const localVideoRef = useRef(null);

    const [joined, setJoined] = useState(false);
    const [role, setRole] = useState("host"); // host or audience

    useEffect(() => {
        clientRef.current = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    }, []);

    // join channel
    const joinChannel = async () => {
        const client = clientRef.current;

        await client.setClientRole(role);
        await client.join(APP_ID, CHANNEL, TOKEN || null, null);

        console.log("CLIENT :: ",client);

        // HOST publishes video/audio
        if (role === "host") {
            const tracks = await AgoraRTC.createMicrophoneAndCameraTracks(
                { echoCancellation: true, noiseSuppression: true },
                { encoderConfig: "720p" }
            );

            console.log("TRACKS :: ",tracks);

            // if(!tracks){
            //     alert("No tracks");
            //     return;
            // }

            await client.publish(tracks);

            tracks[1].play(localVideoRef.current);
        }

        // audience receives streams
        client.on("user-published", async (user, mediaType) => {
            await client.subscribe(user, mediaType);

            if (mediaType === "video") {
                const remoteDiv = document.createElement("div");
                remoteDiv.id = user.uid;
                remoteDiv.style.width = "400px";
                remoteDiv.style.height = "300px";
                document.getElementById("remote-container").appendChild(remoteDiv);

                user.videoTrack.play(remoteDiv);
            }

            if (mediaType === "audio") {
                user.audioTrack.play();
            }
        });

        setJoined(true);
    };

    // leave
    const leaveChannel = async () => {
        const client = clientRef.current;
        await client.leave();
        setJoined(false);
    };

    return (
        <div style={{ padding: 20 }}>
            <h2>Agora Live Streaming</h2>

            {!joined && (
                <>
                    <select onChange={(e) => setRole(e.target.value)}>
                        <option value="host">Host (Go Live)</option>
                        <option value="audience">Audience (Watch)</option>
                    </select>

                    <br /><br />
                    <button onClick={joinChannel}>Join Stream</button>
                </>
            )}

            {joined && (
                <button onClick={leaveChannel}>Leave</button>
            )}

            <div
                ref={localVideoRef}
                style={{ width: 400, height: 300, background: "#000", marginTop: 20 }}
            />

            <div id="remote-container" style={{ display: "flex", gap: 10, marginTop: 20 }} />
        </div>
    );
}
