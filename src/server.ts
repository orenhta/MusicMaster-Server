import express, { Request, Response } from "express";
import "dotenv/config";

const app = express();

const port = process.env.PORT || 3000;

app.use("/songs", express.static("public/songs"));

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, TypeScript + Node.js + Express!");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
