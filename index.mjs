import client, { dbName, collectionName } from "./mongo.mjs";

import http from 'http';
import dotenv from 'dotenv';
import logger from './logger.mjs';

dotenv.config();

const port = process.env.PORT;

const server = http.createServer(async (req, res) => {
  const { url } = req;
  const [_, year, id] = url.split('/');

  try {
    logger.info(`fetching ${year}/${id}...`);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const result = await collection.findOne({ id: parseInt(id), year: parseInt(year) });
    logger.info(`fetched ${year}/${id}: ${result}`);

    if (!result) {
      throw new Error("Not found");
    }

    const { json } = result;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      data: json,
      error: false,
      message: "OK",
    }));
  } catch (e) {
    logger.error(e);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON
      .stringify({
        error: true,
        message: e.message,
      }));
  }
});

server.listen(port, () => {
  logger.info(`listening on port ${port}`);
});

