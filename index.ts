import ky from "https://cdn.skypack.dev/ky?dts";
import {
  Application,
  helpers,
  Router,
  Status,
} from "https://deno.land/x/oak@v10.6.0/mod.ts";

import { formatJSON } from "./utils.ts";

const app = new Application();
const router = new Router();
const PORT = Deno.env.get("PORT") || "8080";

router
  .get("/:botToken/chats", async (ctx) => {
    const { botToken } = ctx.params;

    if (!botToken) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = "Missing parameters";
      return;
    }

    const tgResponse = await ky.get(
      `https://api.telegram.org/bot${botToken}/getUpdates?limit=10`,
    ).json() as {
      ok: boolean;
      result: Array<{
        update_id: number;
      }>;
    };
    const updates = tgResponse.result.map((obj) => JSON.stringify(obj));

    ctx.response.body = updates.join("\n");
  })
  .post("/:botToken/:chatId", async (ctx) => {
    const { botToken, chatId } = ctx.params;
    const query = helpers.getQuery(ctx);
    const bodyParser = ctx.request.body({ type: "text" });

    if (!botToken || !chatId) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = "Missing parameters";
      return;
    }

    const requestBodyString = await bodyParser.value;
    let formattedBody;

    formattedBody = requestBodyString;

    const api = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: formattedBody,
      parse_mode: query.parse_mode || "HTML",
    };

    const tgResponse = await ky.post(api, {
      json: payload,
    });

    ctx.response.body = await tgResponse.json();
  })
  .get("/", (ctx) => {
    ctx.response.body =
      "Go to https://github.com/geekdada/telegram-incoming-webhook for more info.";
  });

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error(err);
    ctx.response.status = err.status || 500;
    ctx.response.body = {
      ok: false,
      message: err.message || "Internal Server Error",
    };
  }
});
app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: Number(PORT) });
