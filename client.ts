// import { SMTPClient } from "https://deno.land/x/denomailer/mod.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const client = new SmtpClient();

await client.connect({
  hostname: "127.0.0.1",
  port: 25,
  username: "test",
  password: "1234",
});
console.log("connected");

// await client.send({
//   from: "mailaddress@163.com",
//   to: "to-address@xx.com",
//   subject: "Mail Title",
//   content: "Mail Content",
// });
await client.send({
  from: "local@localhost.fr",
  to: "local@localhost.fr",
  subject: "Hello World",
  content: "auto",
  html: "<p>Hello World</p>",
});
