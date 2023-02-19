// Title : SMTP Server
// Description: This implement a basic SMTP server
// Author: Nassim Zenzelaoui

import { HELOCommand, MAILCommand } from "./Server/Command.ts";
import { SMTPCommand, SMTPContext } from "./Server/Interfaces.ts";
import { SMTPResponse } from "./Server/Response.ts";
import { Security } from "./Server/Security.ts";
import { SMTPServer } from "./Server/Smtp.ts";
import { User } from "./Server/Users.ts";

try {
  Deno.statSync("./server.key")
} catch {
  console.error("No server.key file found, please generate one using the command `deno run --allow-write --allow-read --allow-sys ./init.ts`");
  Deno.exit(1);
}

if (!localStorage.getItem("smtpData")) throw new Error("The smtpData is missing, make sure to run the init file before running the server");

Deno.env.get("DSMTP_NAME") ?? Deno.env.set("DSMTP_NAME", "DSMTP");
Deno.env.get("DSMTP_VERSION") ?? Deno.env.set("DSMTP_VERSION", "0.0.1");
Deno.env.get("DSMTP_HOSTNAME") ?? Deno.env.set("DSMTP_HOSTNAME", "localhost");

const encoder = new TextEncoder();
const decoder = new TextDecoder();


const clients = new Map<string, ClientConn>();
const security = await new Security();
const server = new SMTPServer(security);


type ClientConn = {
  conn : Deno.Conn,
  lastActivity : number,
  user?: User
}

const commands: { [key: string]: SMTPCommand } = {
  HELO: new HELOCommand(),
  MAIL: new MAILCommand(),
};

function processCommand(command: string, args: string[], context: SMTPContext): SMTPResponse {
  const cmd = commands[command];
  if (cmd) {
    return cmd.execute(args, context);
  } else {
    return { code: 502, message: "Command not implemented" };
  }
}

async function handleMessages(conn: Deno.Conn, id: string) {
  for await (const res of conn.readable) {
    try {
      const data = decoder.decode(res);
      const [command, ...args] = data.split(" ");
      processCommand(command, args, server);
    } catch (e) {
      console.error(e);
      clients.delete(id);
      conn.close();
    }
  }
}

async function handleConn(conn: Deno.Conn) {
  console.info("New connection");
  conn.unref();
  const id = (conn.remoteAddr as Deno.NetAddr).hostname.replace(/\./g, "");
  clients.set(id, {
    conn,
    lastActivity: Date.now(),
  });

  //TODO(hironichu) Replace this with the command Handler
  await conn.write(encoder.encode(`220 ${Deno.env.get("DSMTP_NAME")} ${Deno.env.get("DSMTP_VERSION")} ${Deno.env.get("DSMTP_HOSTNAME")}\r\n`));
  await handleMessages(conn, id);
  //on close we delete the ID
  clients.delete(id);
}
if (import.meta.main) {
  try {
    const server = Deno.listen({ port: 25, hostname: "0.0.0.0" });
    console.log("SMTP server started on port 25");
    for await (const conn of server) {
      handleConn(conn);
    }
    server.unref();
  } catch (e){
    console.error("Error while starting the server", e);
  }
}
