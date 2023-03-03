// Command handler for the SMTP server, it contains a very basic implementation of the SMTP protocol

import { encoder } from "../utils.ts";
import { SMTPCommand } from "./Interfaces.ts";
import { SMTPResponse } from "./Response.ts";
import { ClientConn, SessionState } from "./Session.ts";
import { SMTPServer } from "./Smtp.ts";
import { Mail } from "./Mail.ts";
export class HELOCommand implements SMTPCommand {
  async execute(
    args: string[],
    server: SMTPServer,
    client: ClientConn,
  ) {
    const hostname = args[0]?.trim();

    if (!hostname) {
      return await server.sendResponse(
        { code: 501, message: "Syntax error in parameters or arguments" },
        client,
      );
    }
    if (client.session.state == SessionState.Started) {
      return await server.sendResponse(
        { code: 503, message: `Bad sequence of commands HELO` },
        client,
      );
    }
    client.session.state = SessionState.Started;
    return await server.sendResponse(
      { code: 250, message: `${server.hostname} greets ${args[0]}` },
      client,
    );
  }
}
export class EHLOCommand implements SMTPCommand {
  async execute(
    args: string[],
    server: SMTPServer,
    client: ClientConn,
  ) {
    const hostname = args[0]?.trim();

    if (!hostname) {
      return await server.sendResponse(
        { code: 501, message: "Syntax error in parameters or arguments" },
        client,
      );
    }

    client.session.hostname = hostname;
    if (client.session.state == SessionState.Started) {
      return await server.sendResponse(
        {
          code: 250,
          message: `Bad sequence of commands`,
        },
        client,
      );
    }

    client.session.state = SessionState.Started;
    return await server.sendResponse(
      {
        code: 250,
        message: `${server.hostname} greets ${hostname}`,
      },
      client,
    );
  }
}

export class MAILCommand implements SMTPCommand {
  execute(
    args: string[],
    server: SMTPServer,
    client: ClientConn,
  ) {
    console.log("MAIL CMD");
    client.session.mailFrom = [...args].join(" ").trim();
    client.session.state = SessionState.AwaitingRcptTo;
    console.log("DEBUG | MAIL: " + client.session.mailFrom);
    return server.sendResponse({ code: 250, message: "OK" }, client);
  }
}

export class RCPTCommand implements SMTPCommand {
  async execute(
    _args: string[],
    server: SMTPServer,
    client: ClientConn,
  ) {
    const mail = [..._args].join(" ");
    console.log("RCPT: " + mail.trim());
    client.session.state = SessionState.AwaitingData;
    client.session.rcptTo = mail;

    return await server.sendResponse(
      { code: 250, message: "2.1.5 Ok" },
      client,
    );
  }
}
export class DATACommand implements SMTPCommand {
  async execute(_args: string[], server: SMTPServer, client: ClientConn) {
    switch (client.session.state) {
      case SessionState.AwaitingData: {
        client.session.state = SessionState.AwaitingEndOfData;
        return await server.sendResponse({
          code: 354,
          message: "End data with <CR><LF>.<CR><LF>",
        }, client);
      }
      case SessionState.AwaitingEndOfData: {
        client.session.data = "";

        for (const line in _args) {
          if (_args[line].trim() == ".") {
            await server.sendResponse(
              { code: 250, message: "OK" },
              client,
            );
            client.session.state = SessionState.Started;
            //
            const mail = new Mail(
              client.session.mailFrom!,
              client.session.rcptTo!,
              client.session.data,
            );
            console.log(mail);
            return;
          }
          client.session.data += _args[line].trim() + "";
        }
        return null;
      }
      ///TODO: check if this is correct
      case SessionState.Started:
        return await server.sendResponse(
          { code: 503, message: "Bad sequence of commands 2" },
          client,
        );
      ///TODO: check if this is correct
      default:
        return await server.sendResponse(
          { code: 503, message: "Bad sequence of commands 3" },
          client,
        );
    }
  }
}
export class RSETCommand implements SMTPCommand {
  async execute(_args: string[], server: SMTPServer, client: ClientConn) {
    if (client.session) {
      client.session = {
        state: SessionState.Started,
        mailFrom: "",
        rcptTo: "",
        data: "",
      };

      return await server.sendResponse(
        { code: 250, message: "OK" },
        client,
      );
    }

    return await server.sendResponse(
      { code: 503, message: "Bad sequence of commands" },
      client,
    );
  }
}
export class NOOPCommand implements SMTPCommand {
  execute(_args: string[], _context: SMTPServer): SMTPResponse {
    // process NOOP command logic
    return { code: 250, message: "OK" };
  }
}
export class QUITCommand implements SMTPCommand {
  async execute(
    _args: string[],
    _context: SMTPServer,
    client: ClientConn,
  ) {
    console.info(
      "[DSMTP] Client disconnected " + new Date().toLocaleTimeString(),
    );
    await client.conn.write(encoder.encode("221 Bye\r\n"));
    client.conn.close();
  }
}
export class AUTHCommand implements SMTPCommand {
  execute(
    _args: string[],
    server: SMTPServer,
    client: ClientConn,
    cmd: string,
  ): Promise<SMTPResponse> | SMTPResponse | void | Promise<void> {
    switch (client.session.state) {
      case SessionState.Started:
        client.session.authType = _args[0];
        client.session.state = SessionState.AwaitingAuthUsername;

        return server.sendResponse({
          code: 334,
          message: "VXNlcm5hbWU6",
        }, client);
      case SessionState.AwaitingAuthUsername:
        // console.debug("DEBUG: GOT USERNAME" + cmd.trim());
        client.session.username = cmd;
        client.session.state = SessionState.AwaitingAuthPassword;

        return server.sendResponse({
          code: 334,
          message: "UGFzc3dvcmQ6",
        }, client);
      case SessionState.AwaitingAuthPassword:
        // console.debug("DEBUG: GOT PASSWORD" + cmd.trim());
        client.session.password = cmd;
        client.session.state = SessionState.Authenticated;

        return server.sendResponse({
          code: 235,
          message: "Authentication successful",
        }, client);

      default:
        client.session.state = SessionState.Started;
        return server.sendResponse({
          code: 503,
          message: "Bad sequence of commands",
        }, client);
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
    MAIL: commands.MAIL,
  },
  [SessionState.AwaitingAuthUsername]: {
    default: commands.AUTH,
  },
  [SessionState.AwaitingAuthPassword]: {
    default: commands.AUTH,
  },
  [SessionState.AwaitingMailFrom]: {
    MAIL: commands.MAIL,
  },
  [SessionState.AwaitingRcptTo]: {
    RCPT: commands.RCPT,
    DATA: commands.RCPT,
  },
  [SessionState.AwaitingData]: {
    default: commands.DATA,
  },
  [SessionState.AwaitingEndOfData]: {
    default: commands.DATA,
    SOME: commands.DATA,
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
