import express, { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { Server, Socket } from "socket.io";
import http from "http";
import "dotenv/config";
import { songsById } from "./songs";
import Player from "./player";
import path from 'path';
import fs from 'fs';
import { getFileNamesInDirectory } from "./utils/filesOperations";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;
const INITIAL_SCORE: number = 0;

let gameState: {
  gameId: string;
  round: number;
  gamePlayers: Player[];
  currentCorrectAnswer: string;
} | null;
let playersSocket: Record<string, Socket> = {};

const songsDirectoryPath = './public/songs';
let availableSongsFileNames: string [] = getFileNamesInDirectory(songsDirectoryPath);

app.use("/songs", express.static("public/songs"));

app.get("/create-game", (req: Request, res: Response) => {
  gameState = {
    gameId: Math.random().toString().substr(2, 4),
    round: 0,
    gamePlayers: [],
    currentCorrectAnswer: "none"
  };
  availableSongsFileNames = getFileNamesInDirectory(songsDirectoryPath);
  resetScores();
  res.send(gameState.gameId);
});

app.get("/join-game", (req: Request, res: Response) => {
  const { gameId, userName } = req.query;
  if (!gameState.gameId || gameId !== gameState.gameId) {
    res.status(400).send("Invalid game ID");
    return;
  }
  if (
    gameState?.gamePlayers.map((player) => player.userName).includes(userName as string)
  ) {
    res.status(400).send("Player already joined");
    return;
  }
  if (gameState.round > 0) {
    res.status(400).send("Game has already started");
    return;
  }
  if (userName === "") {
    res.status(400).send("Invalid name");
    return;
  }
  const userId = uuid();
  gameState.gamePlayers.push({ id: userId, userName: userName as string, score: INITIAL_SCORE });
  io.emit("player-joined", { userName });
  res.send(userId);
});

app.get("/next-round", (req: Request, res: Response) => {
  const nextRound = gameState.round + 1;

  if (1 > availableSongsFileNames.length) {
    res.send("All rounds have been played\n the winner is: " + getWinner().userName);
    return;
  }

  const song = songsById[nextRound];
  gameState.currentCorrectAnswer = song.title;

  io.emit("round-started", {
    round: nextRound,
    songId: nextRound,
    duration: song.duration
  });

  gameState.round = nextRound;

  // Generate random index
  const randomIndex: number = Math.floor(Math.random() * availableSongsFileNames.length);
        
  // Get the file name at the random index
  const selectedFileName: string = availableSongsFileNames[randomIndex];
  
  // Remove the file name from the list
  availableSongsFileNames.splice(randomIndex, 1);

  const songFilePath: string = path.join(__dirname, '..', 'public/songs', `${selectedFileName}`);
  // send song to the game host
  res.sendFile(songFilePath, (err) => {
      if (err) {
          console.error('Error sending file:', err);
          res.status(500).send('Internal Server Error');
      }
  });
});

app.get("/end-game", (req: Request, res: Response) => {
  gameState = null;
  playersSocket = {};
  io.emit("game-ended");
  res.send("Game ended! winner is: " + getWinner().userName);
});

const getWinner = (): Player => {
  // Find player with the highest score
  let winner: Player;
  let highestScore = -1;
  
  gameState.gamePlayers.forEach(player => {
    if (player.score > highestScore) {
      highestScore = player.score;
      winner = player;
    }
  });

  console.log(winner)
  return winner;
}

io.on("connection", (socket) => {
  console.log("A user connected");
  socket.on("join-game", (playerId: string, userName: string) => {
    playersSocket[playerId] = socket;
    const player: Player = { id: socket.id, userName: userName, score: INITIAL_SCORE };
    // players.push(player);
    gameState.gamePlayers.push(player);
    io.emit('playerJoined', player);
    socket.on("disconnect", () => {
      console.log("User disconnected");
      delete playersSocket[playerId];
      gameState.gamePlayers = gameState.gamePlayers.filter(player => player.id !== socket.id);
    });

    // Handle player answering a question
    socket.on('answer', (answer: string) => {
      if (answer.toLowerCase() === gameState.currentCorrectAnswer.toLowerCase()) {
        const playerIndex = gameState.gamePlayers.findIndex(player => player.id === socket.id);
        if (playerIndex !== -1) {
          gameState.gamePlayers[playerIndex].score++;
          io.emit('updateScore', gameState.gamePlayers);
        }
      }
    });
  });
});

const resetScores = () => {
  gameState.gamePlayers.forEach(player => {
    player.score = 0;
  });

  io.emit('updateScore', gameState.gamePlayers);
}

server.listen(port, () => {
  console.log(`Server is listening on *:${port}`);
});
