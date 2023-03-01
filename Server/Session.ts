import { User } from "./Users.ts";

export enum SessionState {
  Default = "default",
  Started = "started",
  Authenticated = "authenticated",
  AwaitingAuthUsername = "awaitingAuthUsername",
  AwaitingAuthPassword = "awaitingAuthPassword",
  AwaitingMailFrom = "awaitingMailFrom",
  AwaitingRcptTo = "awaitingRcptTo",
  AwaitingData = "awaitingData",
  AwaitingEndOfData = "awaitingEndOfData",
  AwaitingQuit = "awaitingQuit",
}
//TODO(Hironichu) Add Docs
export type Session = {
  state: SessionState;
  username?: string;
  password?: string;
  authType?: string;
  mailFrom?: string;
  rcptTo?: string;
  data?: string;
  hostname?: string;
};

export type ClientConn = {
  conn: Deno.Conn;
  lastActivity: number;
  user?: User;
  session: Session;
};
