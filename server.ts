import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const db = new Database("ludo.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    wallet_balance REAL DEFAULT 100.0,
    avatar TEXT,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    status TEXT, -- 'waiting', 'playing', 'finished'
    winner_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount REAL,
    type TEXT, -- 'win', 'entry', 'bonus'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "ludo-secret";

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// API Routes
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    const info = stmt.run(username, hashedPassword);
    const token = jwt.sign({ id: info.lastInsertRowid, username }, JWT_SECRET);
    res.json({ token, user: { id: info.lastInsertRowid, username, wallet_balance: 100 } });
  } catch (e) {
    res.status(400).json({ error: "Username already exists" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, wallet_balance: user.wallet_balance, is_admin: user.is_admin } });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.get("/api/user/profile", authenticate, (req: any, res) => {
  const user = db.prepare("SELECT id, username, wallet_balance, is_admin FROM users WHERE id = ?").get(req.user.id);
  res.json(user);
});

// Admin Routes
app.get("/api/admin/users", authenticate, (req: any, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: "Forbidden" });
  const users = db.prepare("SELECT id, username, wallet_balance, is_admin, created_at FROM users").all();
  res.json(users);
});

// Ludo Game Logic State
interface Player {
  id: number;
  username: string;
  color: 'red' | 'blue' | 'green' | 'yellow';
  pieces: number[]; // positions 0-56
  socketId: string;
}

interface GameState {
  id: string;
  players: Player[];
  turn: number; // index of player
  diceValue: number;
  status: 'waiting' | 'playing' | 'finished';
  lastRollTime: number;
}

const games = new Map<string, GameState>();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_queue", (userData) => {
    // Simple matchmaking: find a waiting game or create one
    let game = Array.from(games.values()).find(g => g.status === 'waiting' && g.players.length < 2);
    
    if (!game) {
      const gameId = Math.random().toString(36).substring(7);
      game = {
        id: gameId,
        players: [],
        turn: 0,
        diceValue: 0,
        status: 'waiting',
        lastRollTime: Date.now()
      };
      games.set(gameId, game);
    }

    const colors: ('red' | 'blue' | 'green' | 'yellow')[] = ['red', 'blue', 'green', 'yellow'];
    const player: Player = {
      id: userData.id,
      username: userData.username,
      color: colors[game.players.length],
      pieces: [0, 0, 0, 0],
      socketId: socket.id
    };

    game.players.push(player);
    socket.join(game.id);

    if (game.players.length === 2) {
      game.status = 'playing';
      io.to(game.id).emit("game_start", game);
    } else {
      io.to(game.id).emit("player_joined", game);
    }
  });

  socket.on("roll_dice", (gameId) => {
    const game = games.get(gameId);
    if (!game || game.status !== 'playing') return;
    
    const currentPlayer = game.players[game.turn];
    if (currentPlayer.socketId !== socket.id) return;

    game.diceValue = Math.floor(Math.random() * 6) + 1;
    io.to(game.id).emit("dice_rolled", { diceValue: game.diceValue, turn: game.turn });

    // Check if any move is possible
    const canMove = currentPlayer.pieces.some(pos => {
        if (pos === 0) return game.diceValue === 6;
        if (pos + game.diceValue <= 57) return true;
        return false;
    });

    if (!canMove) {
        setTimeout(() => {
            game.turn = (game.turn + 1) % game.players.length;
            io.to(game.id).emit("turn_changed", game.turn);
        }, 1000);
    }
  });

  socket.on("move_piece", ({ gameId, pieceIndex }) => {
    const game = games.get(gameId);
    if (!game || game.status !== 'playing') return;
    
    const currentPlayer = game.players[game.turn];
    if (currentPlayer.socketId !== socket.id) return;

    const currentPos = currentPlayer.pieces[pieceIndex];
    let nextPos = currentPos;

    if (currentPos === 0) {
        if (game.diceValue === 6) nextPos = 1;
    } else if (currentPos + game.diceValue <= 57) {
        nextPos += game.diceValue;
    }

    if (nextPos !== currentPos) {
        currentPlayer.pieces[pieceIndex] = nextPos;
        
        // Check for win
        if (currentPlayer.pieces.every(p => p === 57)) {
            game.status = 'finished';
            io.to(game.id).emit("game_over", { winner: currentPlayer });
            return;
        }

        // Check for capture (simplified logic)
        // In real Ludo, capture depends on global board position, not relative
        // For this clone, we'll keep it simple or implement full board mapping
        
        io.to(game.id).emit("piece_moved", { 
            playerIndex: game.turn, 
            pieceIndex, 
            nextPos,
            pieces: currentPlayer.pieces
        });

        // Extra turn on 6 or capture
        if (game.diceValue !== 6) {
            game.turn = (game.turn + 1) % game.players.length;
        }
        io.to(game.id).emit("turn_changed", game.turn);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    // Handle game abandonment
  });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
