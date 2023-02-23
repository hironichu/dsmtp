// Title : SMTP Server
// Description: This implement a basic SMTP server
// Author: Nassim Zenzelaoui

import { commandMap, commands } from "./Server/Command.ts";
import { SMTPCommand } from "./Server/Interfaces.ts";
import { SMTPResponse } from "./Server/Response.ts";
import { Security } from "./Server/Security.ts";
import { ClientConn, SessionState } from "./Server/Session.ts";
import { SMTPServer } from "./Server/Smtp.ts";

try {
  Deno.statSync("./server.key");
} catch {
  console.error(
    "No server.key file found, please generate one using the command `deno run --allow-write --allow-read --allow-sys ./init.ts`",
  );
  Deno.exit(1);
}

if (!localStorage.getItem("smtpData")) {
  throw new Error(
    "The smtpData is missing, make sure to run the init file before running the server",
  );
}

Deno.env.get("DSMTP_NAME") ?? Deno.env.set("DSMTP_NAME", "DSMTP");
Deno.env.get("DSMTP_VERSION") ?? Deno.env.set("DSMTP_VERSION", "0.0.1");
Deno.env.get("DSMTP_HOSTNAME") ?? Deno.env.set("DSMTP_HOSTNAME", "localhost");

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const clients = new Map<string, ClientConn>();
const security = await new Security();
const server = new SMTPServer(security);

async function processCommand(
  command: string,
  args: string[],
  server: SMTPServer,
  client: ClientConn,
  cmd_text?: string,
) {
  const cmdState = commandMap[client.session.state];
  if (cmdState) {
    let cmd =
      cmdState[command as unknown as keyof typeof cmdState] as SMTPCommand;
    if (!cmd) {
      cmd = (cmdState as keyof typeof cmdState)["default"] as SMTPCommand;
    }
    if (!cmd) {
      return { code: 502, message: "Command not implemented" };
    }
    console.info(`[DSMTP] Client ${client.conn.rid}: Command: `, command);
    await cmd.execute(args, server, client, cmd_text);
  } else {
    return { code: 502, message: "Command not implemented" };
  }
}

async function handleMessages(client: ClientConn, id: string) {
  for await (const res of client.conn.readable) {
    try {
      const data = decoder.decode(res);
      let [command, ...args] = data.split(" ");
      command = command.trim();
      await processCommand(command, args, server, client, command);
      //
    } catch (e) {
      console.error(e);
      clients.delete(id);
      client.conn.close();
    }
  }
}

async function handleConn(conn: Deno.Conn) {
  let id;
  try {
    console.info("[DSMTP] New connection");
    conn.unref();
    id = (conn.remoteAddr as Deno.NetAddr).hostname.replace(/\./g, "");
    clients.set(id, {
      conn,
      lastActivity: Date.now(),
      session: {
        state: SessionState.Default,
      },
    });

    await conn.write(
      encoder.encode(
        `220 Welcome to ${Deno.env.get("DSMTP_NAME")} ${
          Deno.env.get("DSMTP_VERSION")
        } ${Deno.env.get("DSMTP_HOSTNAME")}\r\n`,
      ),
    );
    await handleMessages(clients.get(id)!, id);
    clients.delete(id);
  } catch {
    if (id) {
      clients.delete(id);
    }
  }
}
if (import.meta.main) {
  try {
    const server = Deno.listen({ port: 25, hostname: "0.0.0.0" });
    console.log("[DSMTP] SMTP server started on port 25");
    for await (const conn of server) {
      handleConn(conn);
    }
    server.unref();
  } catch (e) {
    console.error("Error while starting the server", e);
  }
}
