import app, { startExpiryWorker } from "./server.js";
import { config } from "./config.js";
import { logger } from "./logger.js";

app.listen(config.port, () => {
  logger.info({ port: config.port }, "API server listening");
});

startExpiryWorker();
