// import { SMTPClient } from "https://deno.land/x/denomailer/mod.ts";
import { SmtpClient } from "https://deno.land/x/smtp/mod.ts";

const client = new SmtpClient();

await client.connect({
    hostname: "127.0.0.1",
    port: 25,
    username: "username",
    password: "password",
});
console.log("connected");


await client.send({
    from: "mailaddress@163.com",
    to: "to-address@xx.com",
    subject: "Mail Title",
    content: "Mail Content",
    html: "<a href='https://github.com'>Github</a>",
  });
// await client.send({
//     from: "local@localhost.fr",
//     to: "local@localhost.fr",
//     subject: "Hello World",
//     replyTo: '<abc@example.com>',
//     content: 'auto',
//     html: '<p>Hello World</p>',
//     internalTag: 'newsletter',
//     priority: 'high'
// });