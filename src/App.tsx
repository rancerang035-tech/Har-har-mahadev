import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Wallet, 
  User as UserIcon, 
  Play, 
  LogOut, 
  ShieldCheck,
  Users,
  History,
  TrendingUp,
  Coins
} from 'lucide-react';
import socket from './lib/socket';
import { cn } from './lib/utils';
import { User, GameState } from './types';

// --- Components ---

const Auth = ({ onLogin }: { onLogin: (user: User, token: string) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.user, data.token);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Connection failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#1E293B] rounded-3xl p-8 shadow-2xl border border-white/10"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <Trophy className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Ludo Gold</h1>
          <p className="text-slate-400">The Ultimate Zupee Clone</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
              placeholder="Enter username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
              placeholder="Enter password"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-bold py-4 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-yellow-500 hover:text-yellow-400 text-sm font-medium"
          >
            {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const LudoBoard = ({ gameState, onRoll, onMove }: { 
  gameState: GameState, 
  onRoll: () => void, 
  onMove: (index: number) => void 
}) => {
  const currentPlayer = gameState.players[gameState.turn];
  const isMyTurn = socket.id === currentPlayer.socketId;

  return (
    <div className="relative aspect-square w-full max-w-[500px] bg-white rounded-xl overflow-hidden shadow-2xl mx-auto border-4 border-slate-800">
      {/* Grid Overlay */}
      <div className="grid grid-cols-15 grid-rows-15 w-full h-full">
        {Array.from({ length: 225 }).map((_, i) => {
            const x = i % 15;
            const y = Math.floor(i / 15);
            const isPathwayX = x >= 6 && x <= 8;
            const isPathwayY = y >= 6 && y <= 8;
            
            if (!isPathwayX && !isPathwayY) return <div key={`grid-empty-${i}`} />;
            if (x >= 6 && x <= 8 && y >= 6 && y <= 8) return <div key={`grid-center-${i}`} />; // Center

            let bgColor = "bg-white";
            // Red Pathway
            if (y === 7 && x > 0 && x < 6) bgColor = "bg-red-500";
            if (x === 1 && y === 6) bgColor = "bg-red-500";
            // Green Pathway
            if (x === 7 && y > 0 && y < 6) bgColor = "bg-green-500";
            if (x === 8 && y === 1) bgColor = "bg-green-500";
            // Yellow Pathway
            if (x === 7 && y > 8 && y < 14) bgColor = "bg-yellow-500";
            if (x === 6 && y === 13) bgColor = "bg-yellow-500";
            // Blue Pathway
            if (y === 7 && x > 8 && x < 14) bgColor = "bg-blue-500";
            if (x === 13 && y === 8) bgColor = "bg-blue-500";

            return (
                <div 
                    key={`grid-cell-${i}`} 
                    className={cn("w-full h-full border-[0.5px] border-slate-300 shadow-inner", bgColor)} 
                />
            );
        })}
      </div>

      {/* Home Bases */}
      <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-red-500 p-4 border-r-2 border-b-2 border-slate-800">
        <div className="bg-white w-full h-full rounded-lg grid grid-cols-2 gap-2 p-4">
            {[0,1,2,3].map(i => (
                <div key={`red-piece-${i}`} className="bg-red-500 rounded-full aspect-square shadow-inner" />
            ))}
        </div>
      </div>
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-green-500 p-4 border-l-2 border-b-2 border-slate-800">
        <div className="bg-white w-full h-full rounded-lg grid grid-cols-2 gap-2 p-4">
            {[0,1,2,3].map(i => (
                <div key={`green-piece-${i}`} className="bg-green-500 rounded-full aspect-square shadow-inner" />
            ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-yellow-500 p-4 border-r-2 border-t-2 border-slate-800">
        <div className="bg-white w-full h-full rounded-lg grid grid-cols-2 gap-2 p-4">
            {[0,1,2,3].map(i => (
                <div key={`yellow-piece-${i}`} className="bg-yellow-500 rounded-full aspect-square shadow-inner" />
            ))}
        </div>
      </div>
      <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-blue-500 p-4 border-l-2 border-t-2 border-slate-800">
        <div className="bg-white w-full h-full rounded-lg grid grid-cols-2 gap-2 p-4">
            {[0,1,2,3].map(i => (
                <div key={`blue-piece-${i}`} className="bg-blue-500 rounded-full aspect-square shadow-inner" />
            ))}
        </div>
      </div>

      {/* Center Finish */}
      <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-slate-100 flex items-center justify-center border-2 border-slate-800 z-10">
        <Trophy className="text-yellow-500 w-8 h-8" />
      </div>

      {/* Controls Overlay */}
      <div className="absolute bottom-4 right-4 flex flex-col items-center gap-2 z-20">
        <div className="bg-white/90 backdrop-blur p-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-200">
            <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-inner",
                currentPlayer.color === 'red' ? 'bg-red-500' : 
                currentPlayer.color === 'blue' ? 'bg-blue-500' :
                currentPlayer.color === 'green' ? 'bg-green-500' : 'bg-yellow-500'
            )}>
                {gameState.diceValue || '?'}
            </div>
            <div className="text-left">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Current Turn</p>
                <p className="text-sm font-bold text-slate-800">{currentPlayer.username}</p>
            </div>
        </div>
        
        {isMyTurn && (
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRoll}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold px-8 py-3 rounded-full shadow-lg"
            >
                ROLL DICE
            </motion.button>
        )}
      </div>

      {/* Piece Selection */}
      {isMyTurn && gameState.diceValue > 0 && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-30 pointer-events-none">
              <div className="bg-white p-4 rounded-2xl shadow-2xl pointer-events-auto">
                  <p className="text-sm font-bold mb-3 text-center">Move Piece</p>
                  <div className="flex gap-3">
                      {[0,1,2,3].map(i => (
                          <button 
                            key={`move-piece-${i}`}
                            onClick={() => onMove(i)}
                            className="w-10 h-10 bg-slate-800 text-white rounded-full font-bold hover:bg-yellow-500 transition-colors"
                          >
                              {i + 1}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const Dashboard = ({ user, onLogout, onStartGame, onViewAdmin }: { 
    user: User, 
    onLogout: () => void, 
    onStartGame: () => void,
    onViewAdmin: () => void
}) => {
  return (
    <div className="min-h-screen bg-[#0F172A] text-white pb-24">
      <div className="p-6 flex items-center justify-between bg-[#1E293B] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h2 className="font-bold text-lg">{user.username}</h2>
            <p className="text-xs text-slate-400">Pro Player</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-[#0F172A] px-4 py-2 rounded-full flex items-center gap-2 border border-white/10">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="font-bold">₹{user.wallet_balance.toFixed(2)}</span>
          </div>
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-white transition-colors">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-8 max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-3xl p-6 relative overflow-hidden shadow-xl">
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-2">Ludo Supreme</h3>
            <p className="text-indigo-100 text-sm mb-4">Win up to ₹10,000 daily in tournaments!</p>
            <button 
                onClick={onStartGame}
                className="bg-white text-indigo-600 px-6 py-2 rounded-full font-bold text-sm shadow-lg hover:bg-indigo-50 transition-colors"
            >
                Play Now
            </button>
          </div>
          <Trophy className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1E293B] p-4 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="text-emerald-500 w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Win Rate</p>
              <p className="text-lg font-bold">68%</p>
            </div>
          </div>
          <div className="bg-[#1E293B] p-4 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <History className="text-blue-500 w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Games</p>
              <p className="text-lg font-bold">142</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-yellow-500" />
            Select Game Mode
          </h4>
          <div className="space-y-4">
            {[
              { title: '1 vs 1 Battle', desc: 'Winner takes all', entry: '₹10', prize: '₹18', color: 'bg-orange-500' },
              { title: '4 Player Classic', desc: 'Traditional Ludo', entry: '₹5', prize: '₹18', color: 'bg-blue-500' },
              { title: 'Quick Ludo', desc: '5 min fast match', entry: '₹20', prize: '₹36', color: 'bg-emerald-500' },
            ].map((mode, i) => (
              <motion.div 
                key={`game-mode-${i}`}
                whileHover={{ x: 4 }}
                className="bg-[#1E293B] p-4 rounded-2xl border border-white/5 flex items-center justify-between cursor-pointer group"
                onClick={onStartGame}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", mode.color)}>
                    <Users className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-bold">{mode.title}</h5>
                    <p className="text-xs text-slate-400">{mode.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium">Entry: {mode.entry}</p>
                  <p className="text-sm font-bold text-yellow-500">Prize: {mode.prize}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#1E293B] border-t border-white/5 p-4 flex justify-around items-center">
        <button className="flex flex-col items-center gap-1 text-yellow-500">
          <Play className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Play</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <Trophy className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Leaderboard</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <Wallet className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Wallet</span>
        </button>
        {user.is_admin && (
          <button 
            onClick={onViewAdmin}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <ShieldCheck className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Admin</span>
          </button>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
    const [users, setUsers] = useState<any[]>([]);
    
    useEffect(() => {
        fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        .then(res => res.json())
        .then(data => setUsers(data));
    }, []);

    return (
        <div className="min-h-screen bg-[#0F172A] p-8 text-white">
            <h1 className="text-3xl font-bold mb-8">Admin Control Panel</h1>
            <div className="bg-[#1E293B] rounded-3xl overflow-hidden border border-white/5">
                <table className="w-full text-left">
                    <thead className="bg-slate-800/50">
                        <tr>
                            <th className="p-4">ID</th>
                            <th className="p-4">Username</th>
                            <th className="p-4">Balance</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={`admin-user-${u.id}`} className="border-t border-white/5">
                                <td className="p-4">{u.id}</td>
                                <td className="p-4 font-bold">{u.username}</td>
                                <td className="p-4 text-emerald-400">₹{u.wallet_balance}</td>
                                <td className="p-4">
                                    <span className={cn(
                                        "px-2 py-1 rounded-md text-xs font-bold",
                                        u.is_admin ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"
                                    )}>
                                        {u.is_admin ? 'Admin' : 'Player'}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-400 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [view, setView] = useState<'dashboard' | 'admin'>('dashboard');

  useEffect(() => {
    if (token) {
      fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          localStorage.removeItem('token');
          setToken(null);
        } else {
          setUser(data);
        }
      });
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      socket.connect();
      socket.on('game_start', (state: GameState) => {
        setGameState(state);
        setIsSearching(false);
      });
      socket.on('player_joined', (state: GameState) => {
        setGameState(state);
      });
      socket.on('dice_rolled', ({ diceValue, turn }) => {
        setGameState(prev => prev ? { ...prev, diceValue, turn } : null);
      });
      socket.on('turn_changed', (turn) => {
        setGameState(prev => prev ? { ...prev, turn, diceValue: 0 } : null);
      });
      socket.on('piece_moved', ({ playerIndex, pieceIndex, nextPos }) => {
        setGameState(prev => {
            if (!prev) return null;
            const newPlayers = [...prev.players];
            newPlayers[playerIndex].pieces[pieceIndex] = nextPos;
            return { ...prev, players: newPlayers };
        });
      });
      socket.on('game_over', ({ winner }) => {
          alert(`Game Over! Winner: ${winner.username}`);
          setGameState(null);
      });

      return () => {
        socket.off('game_start');
        socket.off('player_joined');
        socket.off('dice_rolled');
        socket.off('turn_changed');
        socket.off('piece_moved');
        socket.off('game_over');
        socket.disconnect();
      };
    }
  }, [user]);

  const handleLogin = (u: User, t: string) => {
    setUser(u);
    setToken(t);
    localStorage.setItem('token', t);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    socket.disconnect();
  };

  const startMatchmaking = () => {
    setIsSearching(true);
    socket.emit('join_queue', user);
  };

  const rollDice = () => {
    if (gameState) socket.emit('roll_dice', gameState.id);
  };

  const movePiece = (pieceIndex: number) => {
    if (gameState) socket.emit('move_piece', { gameId: gameState.id, pieceIndex });
  };

  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <AnimatePresence mode="wait">
        {gameState ? (
          <motion.div 
            key="game"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0F172A]"
          >
            <div className="w-full max-w-md flex justify-between items-center mb-6 text-white bg-[#1E293B] p-4 rounded-2xl border border-white/5">
                {gameState.players.map((p, i) => (
                    <div key={p.socketId} className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                        gameState.turn === i ? "bg-yellow-500/20 ring-2 ring-yellow-500" : "opacity-50"
                    )}>
                        <div className={cn("w-8 h-8 rounded-full", 
                            p.color === 'red' ? 'bg-red-500' : 
                            p.color === 'blue' ? 'bg-blue-500' :
                            p.color === 'green' ? 'bg-green-500' : 'bg-yellow-500'
                        )} />
                        <span className="text-[10px] font-bold truncate w-16 text-center">{p.username}</span>
                    </div>
                ))}
            </div>
            
            <LudoBoard 
                gameState={gameState} 
                onRoll={rollDice}
                onMove={movePiece}
            />

            <button 
                onClick={() => setGameState(null)}
                className="mt-8 text-slate-400 hover:text-white text-sm font-medium"
            >
                Quit Game
            </button>
          </motion.div>
        ) : isSearching ? (
          <motion.div 
            key="searching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen flex flex-col items-center justify-center bg-[#0F172A] text-white p-8"
          >
            <div className="relative w-32 h-32 mb-8">
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-4 border-yellow-500 border-t-transparent rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Users className="w-12 h-12 text-yellow-500" />
                </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Finding Opponents...</h2>
            <p className="text-slate-400 mb-8">Estimated wait time: 10s</p>
            <button 
                onClick={() => setIsSearching(false)}
                className="bg-white/10 hover:bg-white/20 px-8 py-3 rounded-full font-bold transition-colors"
            >
                Cancel
            </button>
          </motion.div>
        ) : view === 'admin' ? (
          <motion.div key="admin">
            <div className="fixed top-4 left-4 z-50">
                <button 
                    onClick={() => setView('dashboard')}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm font-bold"
                >
                    Back to Dashboard
                </button>
            </div>
            <AdminDashboard />
          </motion.div>
        ) : (
          <motion.div key="dashboard">
            <Dashboard 
                user={user} 
                onLogout={handleLogout} 
                onStartGame={startMatchmaking} 
                onViewAdmin={() => setView('admin')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
