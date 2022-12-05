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
  'Content-Type': 'application/json'
};

const requestListener = async (req, res) => {
  const { url } = req;
  const [year, id] = url.split('/').slice(1, 3);

  if (url === '' || url === '/') {
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
      const result = await collection.findOne({ id, year });
      logger.info(`fetched ${year}/${id}: ${result}`);

      if (!result) {
        throw new Error("Not found");
      }

      const { _id, json, updated, inserted } = result;
      res.writeHead(200, headers);
      res.end(JSON.stringify({
        data: json,
        error: false,
        message: "OK",
        updated,
        inserted,
        _id
      }));
    } catch (e) {
      if (e.message === "Not found") {
        res.writeHead(404, headers);
        res.end(JSON.stringify({
          error: true,
          message: e.message,
        }));
      } else {
        res.writeHead(500, headers);
        res.end(JSON.stringify({
          data: null,
          error: true,
          message: e.message,
        }));
      }
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

