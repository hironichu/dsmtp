// Command handler for the SMTP server, it contains a very basic implementation of the SMTP protocol

import { encoder } from "../utils.ts";
import { SMTPCommand, SMTPContext } from "./Interfaces.ts";
import { SMTPResponse, SmtpResponse } from "./Response.ts";
import { ClientConn, SessionState } from "./Session.ts";
import { SMTPServer } from "./Smtp.ts";

export class HELOCommand implements SMTPCommand {
  async execute(
    args: string[],
    server: SMTPServer,
    client: ClientConn,
  ) {
    if (client.session.state == SessionState.Started) {
      await server.sendResponse(
        { code: 250, message: `localhost greets ${args[0]}` },
        client,
      );
      return { code: 503, message: "Bad sequence of commands" };
    }
    client.session.state = SessionState.Started;
    await server.sendResponse(
      { code: 250, message: `localhost greets ${args[0]}` },
      client,
    );
    return { code: 220, message: "localhost  greets spectre" };
  }
}
export class EHLOCommand implements SMTPCommand {
  async execute(
    args: string[],
    server: SMTPServer,
    client: ClientConn,
  ) {
    console.log("EHLO: " + args[0]);
    console.log(client.session.state);
    if (client.session.state == SessionState.Started) {
      await server.sendResponse(
        {
          code: 250,
          message: `localhost greets ${args[0]}`,
        },
        client,
      );
      return { code: 503, message: "Bad sequence of commands" };
    }
    client.session.state = SessionState.Started;
    await server.sendResponse(
      { code: 250, message: `localhost greets ${args[0]}` },
      client,
    );
    console.log("Done processing");
    return { code: 220, message: "localhost  greets spectre" };
  }
}
export class MAILCommand implements SMTPCommand {
  async execute(
    _args: string[],
    server: SMTPServer,
    client: ClientConn,
  ) {
    // process MAIL command logic
    //read the mail from the client
    const addr = this.parseAddress(_args[1]);
    console.log("MAIL: " + addr);
    await server.sendResponse({ code: 250, message: "OK" }, client);
    client.session.mailFrom = [..._args].join(" ");
    client.session.state = SessionState.AwaitingRcptTo;
    return { code: 250, message: "OK" };
  }
  private parseAddress(email: string): [string, string] {
    const m = email.toString().match(/(.*)\s<(.*)>/);
    return m?.length === 3
      ? [`<${m[2]}>`, email]
      : [`<${email}>`, `<${email}>`];
  }
}
export class RCPTCommand implements SMTPCommand {
  async execute(
    _args: string[],
    server: SMTPServer,
    client: ClientConn,
  ) {
    //parse the mail
    // process RCPT command logic
    const mail = [..._args].join(" ");
    console.log("RCPT: " + mail);
    //change the state of the client
    await server.sendResponse({ code: 250, message: "2.1.5 Ok" }, client);
    client.session.state = SessionState.AwaitingData;
    client.session.rcptTo = mail;
    return { code: 250, message: "2.1.5 Ok" };
  }
}
export class DATACommand implements SMTPCommand {
  async execute(_args: string[], server: SMTPServer, client: ClientConn) {
    // process DATA command logic
    switch (client.session.state) {
      case SessionState.AwaitingData:
        {
          await server.sendResponse({
            code: 354,
            message: "End data with <CR><LF>.<CR><LF>",
          }, client);
          client.session.state = SessionState.AwaitingEndOfData;
        }
        break;
      case SessionState.AwaitingEndOfData:
        client.session.data = "";
        //loop until the client sends the end of data
        for (const line in _args) {
          console.log(_args[line]);
        }
        break;
    }
    //change the state of the client

    return { code: 250, message: "OK" };
  }
}
export class RSETCommand implements SMTPCommand {
  execute(_args: string[], _context: SMTPServer): SMTPResponse {
    // process RSET command logic
    return { code: 250, message: "OK" };
  }
}
export class NOOPCommand implements SMTPCommand {
  execute(_args: string[], _context: SMTPServer): SMTPResponse {
    // process NOOP command logic
    return { code: 250, message: "OK" };
  }
}
export class QUITCommand implements SMTPCommand {
  execute(
    _args: string[],
    _context: SMTPServer,
    client: ClientConn,
  ) {
    console.info(
      "[DSMTP] Client disconnected " + new Date().toLocaleTimeString(),
    );
    client.conn.write(encoder.encode("221 Bye\r\n"));
    client.conn.close();
    return {
      code: 221,
      message: "Bye",
    };
  }
}
//auth
export class AUTHCommand implements SMTPCommand {
  async execute(
    _args: string[],
    _context: SMTPServer,
    client: ClientConn,
  ) {
    switch (client.session.state) {
      case SessionState.Started:
        client.session.authType = _args[0];
        client.session.state = SessionState.AwaitingAuthUsername;
        await client.conn.write(encoder.encode("334 VXNlcm5hbWU6\r\n"));
        return { code: 334, message: "VXNlcm5hbWU6" };
      case SessionState.AwaitingAuthUsername:
        client.session.username = _args[0];
        client.session.state = SessionState.AwaitingAuthPassword;
        await client.conn.write(encoder.encode("334 UGFzc3dvcmQ6\r\n"));
        return { code: 334, message: "UGFzc3dvcmQ6" };
      case SessionState.AwaitingAuthPassword:
        client.session.password = _args[0];
        client.session.state = SessionState.Authenticated;
        await client.conn.write(
          encoder.encode("235 Authentication successful\r\n"),
        );
        return { code: 235, message: "Authentication successful" };
      default:
        client.session.state = SessionState.Started;
        await client.conn.write(
          encoder.encode("503 Bad sequence of commands\r\n"),
        );
        return { code: 503, message: "Bad sequence of commands" };
    }
  }
}
export const commands: { [key: string]: SMTPCommand } = {
  HELO: new HELOCommand(),
  EHLO: new EHLOCommand(),
  MAIL: new MAILCommand(),
  RCPT: new RCPTCommand(),
  DATA: new DATACommand(),
  RSET: new RSETCommand(),
  NOOP: new NOOPCommand(),
  QUIT: new QUITCommand(),
  AUTH: new AUTHCommand(),
};

export const commandMap = {
  [SessionState.Default]: {
    HELO: commands.HELO,
    EHLO: commands.EHLO,
    QUIT: commands.QUIT,
    NOOP: commands.NOOP,
  },
  [SessionState.Started]: {
    HELO: commands.HELO,
    EHLO: commands.EHLO,
    QUIT: commands.QUIT,
    NOOP: commands.NOOP,
    AUTH: commands.AUTH,
  },
  [SessionState.AwaitingAuthUsername]: {
    "default": commands.AUTH,
  },
  [SessionState.AwaitingAuthPassword]: {
    "default": commands.AUTH,
  },
  [SessionState.AwaitingMailFrom]: {
    MAIL: commands.MAIL,
  },
  [SessionState.AwaitingRcptTo]: {
    RCPT: commands.RCPT,
    DATA: commands.RCPT,
  },
  [SessionState.AwaitingData]: {
    "default": commands.DATA,
  },
  [SessionState.AwaitingEndOfData]: {
    "default": commands.DATA,
  },
  [SessionState.AwaitingQuit]: {
    QUIT: commands.QUIT,
  },
  [SessionState.Authenticated]: {
    HELO: commands.HELO,
    EHLO: commands.EHLO,
    QUIT: commands.QUIT,
    NOOP: commands.NOOP,
    MAIL: commands.MAIL,
    RCPT: commands.RCPT,
    DATA: commands.DATA,
    RSET: commands.RSET,
  },
};
