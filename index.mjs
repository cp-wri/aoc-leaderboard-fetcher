import client, { dbName, collectionName } from "./mongo.mjs";

import http from 'http';
import dotenv from 'dotenv';
import logger from './logger.mjs';

import { saveLeaderboard } from './fetch.mjs';

dotenv.config();

const port = process.env.PORT;

// endpoints:
// /:year/:id/fetch
// /:year/:id

// allow cors headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Max-Age': 2592000,
};

const requestListener = async (req, res) => {
  const { url } = req;
  const [year, id] = url.split('/').slice(1, 3);

  if(url === '' || url === '/') {
    res.writeHead(200, headers);
    res.end(JSON.stringify({
      message: 'online',
      error: false,
    }));
  } else if (url === `/${year}/${id}/fetch`) {
    try {
      await saveLeaderboard(id, year);
      res.writeHead(200, headers);
      res.end(JSON.stringify({
        error: false,
        message: `fetched ${year}/${id}`,
      }));
    } catch (e) {
      res.writeHead(500, headers);
      res.end(JSON.stringify({
        error: true,
        message: e.message,
      }));
    }
  } else if (url === `/${year}/${id}`) {
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
      res.writeHead(200, { 'Content-Type': 'application/json' }, headers);
      res.end(JSON.stringify({
        data: json,
        error: false,
        message: "OK",
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' }, headers);
      res.end(JSON.stringify({
        data: null,
        error: true,
        message: e.message,
      }));
    }
  } else {
    res.writeHead(404, headers);
    res.end();
  }
}

const server = http.createServer(requestListener);

server.listen(port, () => {
  logger.info(`listening on port ${port}`);
});

