# DSMTP

## Deno Simple Message Protocol

This Project is for educational purposes only,

DSMTP is a simplified version of the SMTP protocol in Deno.

the protocol implements a very basic version of the SMTP protocol, it is
intended to be used for testing and fun.

Please don't use it in production, you could use it for fun or debugging mail
system, but that's it.

### Why ?

This is an experiment, i wanted to see how hard it would be to implement a mail
server in Deno.

### What is implemented ?

I want to implement real authentication system later but for now this server is
only capable on receiving mails. It does not support TLS, and it does not
support any kind of authentication.

### How to use

You first need to init a private key that will encrypt all Mail/user data on the
server localStorage

> Please note that this is not secure, the key is writen in readonly for the
> current user, and the date is encrypted using the Crypto API with AES-GCM 256
> and PBKDF2 algo.

Run this to generate a Key and encrypt the localStorage

> This will Remove all data in localstorage and encrypt only the key `SmtpData`

```bash
deno task init
```

It will prompt you for a secret phrase, the minimum requirement is a 10
characters phrase, this string will not be held in memory, it's only used for
generating the key.

(That means if you loose the key, and if you don't have the secret phrase, you
will not be able to recover the data.)

To run the server you need to execute the `dev` task :

```bash
deno task dev
```

This will spin up the server on port `25`, this server does not support any kind
of TLS communication, it is made entirely for testing and fun.

### How to use it ?

So far you can't really use it as a proper SMTP server, it can receive mails but
it will not save them anywhere, it will just log them in the console.

To send a mail you can use the client.ts file : (this file only contains the
basic, only sending test messages..)

```bash
deno task client
```

> ### Note
>
> You might want to register the proper DNS information to recieve mail if you
> want to send mail from a proper mailing services, i have not tested this yet.
