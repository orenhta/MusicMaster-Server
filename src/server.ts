import express, { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { Server, Socket } from "socket.io";
import http from "http";
import "dotenv/config";
import { songsById } from "./songs";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

app.use("/songs", express.static("public/songs"));

let currentGameId: string;
let gameState: {
  gameId: string;
  round: number;
  players: { id: string; name: string }[];
  guesses: Record<number, string>;
} | null;
let playersSocket: Record<string, Socket> = {};

app.get("/create-game", (req: Request, res: Response) => {
  currentGameId = Math.random().toString().substr(2, 4);
  gameState = {
    gameId: currentGameId,
    round: 0,
    players: [],
    guesses: {},
  };
  res.send(currentGameId);
});

app.get("/join-game", (req: Request, res: Response) => {
  const { gameId, name } = req.query;
  if (!currentGameId || gameId !== currentGameId) {
    res.status(400).send("Invalid game ID");
    return;
  }
  if (
    gameState?.players.map((player) => player.name).includes(name as string)
  ) {
    res.status(400).send("Player already joined");
    return;
  }
  if (gameState.round > 0) {
    res.status(400).send("Game has already started");
    return;
  }
  if (name === "") {
    res.status(400).send("Invalid name");
    return;
  }
  const userId = uuid();
  gameState.players.push({ id: userId, name: name as string });
  io.emit("player-joined", { name });
  res.send(userId);
});

app.get("/next-round", (req: Request, res: Response) => {
  const nextRound = gameState.round + 1;

  if (nextRound > 5) {
    res.status(400).send("All rounds have been played");
    return;
  }

  const song = songsById[nextRound];

  io.emit("round-started", {
    round: nextRound,
    songId: nextRound,
    duration: song.duration,
  });

  gameState.round = nextRound;

  res.send("Next round started!");
});

app.get("end-game", (req: Request, res: Response) => {
  gameState = null;
  playersSocket = {};
  io.emit("game-ended");
  res.send("Game ended!");
});

io.on("connection", (socket) => {
  console.log("A user connected");
  socket.on("join-game", (playerId: string) => {
    playersSocket[playerId] = socket;
    socket.on("disconnect", () => {
      console.log("User disconnected");
      delete playersSocket[playerId];
    });
  });
});

server.listen(port, () => {
  console.log(`Server is listening on *:${port}`);
});
