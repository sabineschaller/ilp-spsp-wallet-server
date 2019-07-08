# ILP SPSP Wallet Server
> SPSP server that supports account creation as well as push payments to and pull payments from these accounts.

- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [API](#api)
  - [Create a pull pointer](#create-a-pull-pointer)
  - [Query a pull pointer](#query-a-pull-pointer)
  - [Webhooks](#webhooks)

## Usage

Make sure you have a running instance of **moneyd**. 

Start the server
```sh
$ SPSP_LOCALTUNNEL=true SPSP_LOCALTUNNEL_SUBDOMAIN=mysubdomain npm start
```

Create an account
```sh
$ http POST mysubdomain.localtunnel.me username=sabine Authorization:"Bearer test"
HTTP/1.1 200 OK
Connection: keep-alive
Content-Length: 46
Content-Type: application/json; charset=utf-8
Date: Mon, 08 Jul 2019 08:44:22 GMT
Server: nginx/1.10.1

{
    "pointer": "$mysubdomain.localtunnel.me/sabine"
}
```

Push funds into this account
```sh
$ ilp-spsp send -a 10000000000 -p '$mysubdomain.localtunnel.me/sabine'
paying 10000000000 to "$mysubdomain.localtunnel.me/sabine"...
sent 10000000000 units!
```

Query the account
```sh
$ ilp-spsp query -p '$mysubdomain.localtunnel.me/sabine'
{
  "destination_account": "private.moneyd.local.FJV02iNpBccNFVXXvDkH_d10EQbIsk4x8CKhJaflWXQ.ocS_u_gNrT2tbKmbhZn4mWdK~sabine",
  "shared_secret": "rWJ018KGWZhlCYz0jkvA/vT9kTa0nQ/QizTK5/Y6LW4=",
  "balance": "10000000000",
  "content_type": "application/spsp4+json"
}
```

Create a pull pointer belonging to this account
```sh
$ http POST mysubdomain.localtunnel.me/sabine amount=100 interval=P0Y0M0DT0H1M cycles=10 cap=false assetCode=USD assetScale=2 Authorization:"Bearer test"
HTTP/1.1 200 OK
Connection: keep-alive
Content-Length: 83
Content-Type: application/json; charset=utf-8
Date: Mon, 08 Jul 2019 08:58:08 GMT
Server: nginx/1.10.1

{
    "pointer": "$mysubdomain.localtunnel.me/sabine/e1a74d39-c736-409f-ba37-990a474c13e9"
}
```

Pull from the above created pull pointer
```sh
$ ilp-spsp pull -a 2536000000 -p '$mysubdomain.localtunnel.me/sabine/e1a74d39-c736-409f-ba37-990a474c13e9'
pulling from "$mysubdomain.localtunnel.me/sabine/e1a74d39-c736-409f-ba37-990a474c13e9"...
pulled 2536000000 units!
```

Query pull pointer
```sh
$ ilp-spsp query -p '$mysubdomain.localtunnel.me/sabine/e1a74d39-c736-409f-ba37-990a474c13e9'
{
  "destination_account": "private.moneyd.local.Ytwi4pi7LJtqZwvumdARuoiNtPP9YWyDVBa1-mRpDwA.GLqQz-XeoU261ldEYzgjGKlo~sabine___e1a74d39-c736-409f-ba37-990a474c13e9",
  "shared_secret": "z/J8QHnjhBJzvZ5AevtvzJQz2ds2rZhs7W6B1IWngn0=",
  "pull": {
    "balance": {
      "total": "100",
      "interval": "0",
      "available": "100"
    }
  },
  "content_type": "application/spsp4+json"
}
```

Query account
```sh
$ ilp-spsp query -p '$mysubdomain.localtunnel.me/sabine'
{
  "destination_account": "private.moneyd.local.Ytwi4pi7LJtqZwvumdARuoiNtPP9YWyDVBa1-mRpDwA.iVrLL4EacuCE27pPz6UjP4Nu~sabine",
  "shared_secret": "aOUxjIf7q2+aBc6gPF8Wyd/LhcaeQsF+FPW6QJr19Hw=",
  "balance": "7464000000",
  "content_type": "application/spsp4+json"
}
```

## Environment Variables

| Name | Default | Description |
|:---|:---|:---|
| `SPSP_PORT` | `6000` | port to listen on locally. |
| `SPSP_LOCALTUNNEL` | | If this variable is defined, `SPSP_PORT` will be proxied by localtunnel under `SPSP_LOCALTUNNEL_SUBDOMAIN`. |
| `SPSP_LOCALTUNNEL_SUBDOMAIN` | | Subdomain to forward `SPSP_PORT` to. Must be defined if you set `SPSP_LOCALTUNNEL` |
| `SPSP_DB_PATH` | | Path for leveldb database. Uses in-memory database if unspecified. |
| `SPSP_JWT_SECRET` | `test` | Secret used for token generation and verification. |
| `SPSP_AUTH_TOKEN` | `test` | Bearer token for creating invoices and receiving webhooks. |
| `SPSP_HOST` | localhost or localtunnel | Host to include in payment pointers |

## API

### Create an account
```http
POST /
```

Requires authentication. Creates a payment pointer.

#### Request

- `username` -  String only containing the following characters: a-z, A-Z, 0-9

#### Response

- `pointer` - Account payment pointer.

### Query an account payment pointer

```http
GET /:username
```
Needs the header `Accept:"application/spsp4+json"`.

SPSP endpoint storing the information to set up a STREAM connection for pushing to the account `:token`. The payment pointer
returned by [Create an account](#create-an-account) resolves to this endpoint.

### Create a pull pointer

```http
POST /:username
```

Requires authentication. Checks that there are enough funds in the account for the first pull. Creates a pull pointer.

#### Request

- `amount` -  Amount available each interval.
- `start` - _(Optional)_ [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) UTC timestamp
- `expiry` - _(Optional)_ [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) UTC timestamp
- `interval` - [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) duration
- `cycles` - Number of repititions of the interval; defines the expiry of the endpoint.
- `cap` - If `true`, maximum pullable amount per interval is `amount` (_use it or loose it_); if `false`, maximum pullable amount per interval is the accumulation of funds that have not been pulled.
- `assetCode` - Asset the pull payment is made in.
- `assetScale` - Scale the asset is measured in. If `amount` equal to `1000`, `assetCode` equal to `USD` and `assetScale` equal to `2`, amount denotes 10.00 USD.
- `webhook` - (Optional) Webhook to `POST` to after the endpoint has been pulled from. See [Webhooks](#webhooks)

#### Response

- `pointer` - Pull pointer

### Query a pull pointer

```http
GET /:username/:token
```
Needs the header `Accept:"application/spsp4+json"`.

SPSP endpoint storing the information to set up a STREAM connection for pulling from the unique pull pointer with id `:token`. The pull pointer
returned by [Create a pull pointer](#create-a-pull-pointer) resolves to this endpoint.

### Webhooks

When you [Create a pull pointer](#create-a-pull-pointer) and specify a webhook, it will
call the specified webhook when the payment has been pulled. The request is a `POST` with

```http
Authorization: Bearer <SPSP_AUTH_TOKEN>

{
  "balanceTotal": "400",
  "balanceInterval": "100",
  "pointer": "$mysubdomain.localtunnel.me/sabine/484f126f-0c22-4052-9c9d-7af70500360a"
}
```
