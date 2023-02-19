# DSSMTP

## Deno Simple Secure Message Protocol

This Project is for educational purposes only,

DSSMTP is a not so heavily modified version of the SMTP protocol.

It implements end-to-end encryption of mail, this is not to be confused with
TLS! it does not encrypt in/out connection. only the content that goes from one
user to another.

Maybe it can be modified to be used for "real use" but I wouldn't recommand
using your own server.

### How to run

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
characters phrase that will not be hold in memory, it's only used for generating
the key.

(That means if you loose the key, and if you don't have the secret phrase, you
will not be able to recover the data.)

To run the server you need to execute the `dev` task :

```bash
deno task dev
```

This will spin up the server on port `25`, this server does not support any kind
of TLS communication (yet?), it is made entirely for testing and fun.

### How to use it ?

First you need to register a client, to do so I have created a fun and not
secured way of doing so, if you send an email to the server with the subject
"REGISTERME", the server will read the sender and save it.

Because I am a madman, I was thinking about a way to secure user registration in
a weird way, the server will generate a private/public key pair that match your
account, the private key is not saved on the server at any moment, only the
public key.

The public key is used to verify mail sent and received, this is because to send
mail to the server you first need to encrypt the content.

Why ? because only people with your public key will be able to trust your mail
and therefore read them.
