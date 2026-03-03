export interface User {
  id: number;
  username: string;
  wallet_balance: number;
  is_admin: boolean;
}

export interface Player {
  id: number;
  username: string;
  color: 'red' | 'blue' | 'green' | 'yellow';
  pieces: number[];
  socketId: string;
}

export interface GameState {
  id: string;
  players: Player[];
  turn: number;
  diceValue: number;
  status: 'waiting' | 'playing' | 'finished';
}
