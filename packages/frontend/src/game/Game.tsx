import { useEffect, useRef, useState } from 'react';
import { Room } from "colyseus.js";

import { MyRoomState } from "../../../backend/src/rooms/MyRoom";
import Network  from '../core/Network';

import { discordSdk, isEmbedded } from '../core/DiscordSDK';
import { Events } from '@discord/embedded-app-sdk';

function Game() {
	const roomRef = useRef<Room<MyRoomState>>();

	const [isLoading, setIsLoading] = useState(true);
	const [players, setPlayers] = useState({} as any); // TODO: use ToJSON<> type

	//
	// When embedded as Discord Activity, listen to local SPEAKING events
	// send it to the server
	//
	if (isEmbedded) {
		useEffect(() => {
			const handleSpeakingStart = () => roomRef.current!.send("speaking", true)
			const handleSpeakingStop = () => roomRef.current!.send("speaking", false)

			discordSdk.subscribe(Events.SPEAKING_START, handleSpeakingStart, { channel_id: discordSdk.channelId });
			discordSdk.subscribe(Events.SPEAKING_STOP, handleSpeakingStop, { channel_id: discordSdk.channelId });

			return () => {
				discordSdk.unsubscribe(Events.SPEAKING_START, handleSpeakingStart);
				discordSdk.unsubscribe(Events.SPEAKING_STOP, handleSpeakingStop);
			};
		}, []);
	}

	useEffect(() => {
		const roomRequest = Network.client.joinOrCreate<MyRoomState>("my_room", {});

		roomRequest.then((room) => {
			roomRef.current = room;

			setIsLoading(false);

			room.onStateChange((state) => {
				console.log("New room state:", state.toJSON());
				setPlayers(state.players.toJSON())
			});

			room.onMessage('serverMsg', (message) => {
				console.log("server sent a message", message);
			});
		});

		return () => {
			roomRequest.then((room) => {
				room.leave();
			});
		};
	}, []);

	const onIncrementScore = () => {
		roomRef.current?.send("increment");
	};

	const onDistributeViews = () => {
		roomRef.current?.send("distributeViews");
	};

  return (
    <>
			{(isLoading)
				? <div>Joining...</div>
				: <>
						<h1 className="text-xl font-semibold">roomId: {roomRef.current?.roomId}</h1>
						<ul className="ml-6 list-disc">
							<li>Open your browser console to see the room state.</li>
							<li>Below are experiments that are similar to what I did</li>
						</ul>

						<div className='flex flex-wrap gap-2'>
							<button onClick={onIncrementScore} className="mt-4 p-4 rounded bg-green-500 text-green-900 hover:text-green-100 hover:bg-green-700 transition">Increment my score</button>
							<button onClick={onDistributeViews} className="mt-4 p-4 rounded bg-green-500 text-green-900 hover:text-green-100 hover:bg-green-700 transition">Distribute Views</button>
						</div>

						<hr className="my-6 border-slate-600" />

						<h3 className="mb-4 text-xl font-semibold">Players</h3>

						<div className="flex flex-wrap gap-2">
							{(Object.keys(players).sort((a, b) => players[b].score - players[a].score).map((sessionId) => (
								<span key={sessionId} className={`${(sessionId === roomRef.current?.sessionId) ? "bg-blue-300 text-blue-800" : "bg-slate-700"} mb-2 shadow-md p-4 rounded-lg border-2  ${(players[sessionId].speaking) ? "border-green-500" : "border-transparent"}`}>
									{players[sessionId].name} - Score: {players[sessionId].score}
								</span>
							)))}
						</div>

					</>}
    </>
  )
}

export default Game
