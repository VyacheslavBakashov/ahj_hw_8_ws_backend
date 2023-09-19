const http = require('http');
const Koa = require('koa');
const cors = require('@koa/cors');
const { koaBody } = require('koa-body');
const WS = require('ws');
const Router = require('koa-router');
const uuid = require('uuid');

const app = new Koa();

const users = [];

app.use(koaBody({
  urlencoded: true,
  multipart: true,
  text: true,
  json: true,
}));

app.use(cors());

// app.use((ctx, next) => {
//   ctx.response.set("Content-Type", "application/json");
//   next();
// });

const router = new Router();


router.post("/new-user", async (ctx, next) => {
  const { request, response } = ctx;
  console.log('req_body', users.map((elm) => elm.name).includes(request.body.name));
  if (users.map((elm) => elm.name).includes(request.body.name)) {
    const result = {
      status: "error",
      message: "This name is already taken!",
    };
    response.status = 400;
    response.body = JSON.stringify(result);
    return;
  }
  const { name } = request.body;
  
  const isExist = users.map((elm) => elm.name).includes(request.body.name);
  if (!isExist) {
    const newUser = {
      id: uuid.v4(),
      name: name,
    };
    users.push(newUser);
    const result = {
      status: "ok",
      user: newUser,
    };
    response.body = JSON.stringify(result);
    console.log(response.body)
  } else {
    const result = {
      status: "error",
      message: "This name is already taken!",
    };
    response.body = JSON.stringify(result);
  }
});

app.use(router.routes()).use(router.allowedMethods());

const port = process.env.PORT || 7070;

const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });

wsServer.on("connection", (ws) => {
  ws.on("message", (msg, isBinary) => {
    const receivedMSG = JSON.parse(msg);
    if (receivedMSG.type === "exit") {
      const idx = users.findIndex(
        (user) => user.name === receivedMSG.user.name
      );
      users.splice(idx, 1);
      [...wsServer.clients]
        .filter((o) => o.readyState === ws.OPEN)
        .forEach((o) => o.send(JSON.stringify(users)));
      return;
    }
    if (receivedMSG.type === "send") {
      [...wsServer.clients]
        .filter((o) => o.readyState === ws.OPEN)
        .forEach((o) => o.send(msg, { binary: isBinary }));
    }
  });
  [...wsServer.clients]
    .filter((o) => o.readyState === ws.OPEN)
    .forEach((o) => o.send(JSON.stringify(users)));
});

server.listen(port, (err) => {
  if (err) {
    console.log(err);

    return;
  }
  console.log('Server is listening to ' + port);
});
