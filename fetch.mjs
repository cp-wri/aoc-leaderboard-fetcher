import fetch from 'node-fetch';
import dotenv from 'dotenv';

import client, { dbName, collectionName } from "./mongo.mjs";
import logger from './logger.mjs';

dotenv.config();

const fetchLeaderboard = async (id, year) => {
  try {
    const session = process.env.SESSION;
    const url = `https://adventofcode.com/${year}/leaderboard/private/view/${id}.json`;
    logger.info(`fetching ${year}/${id}...`);
    const response = await fetch(url, {
      headers: {
        "Cookie": `session=${session}`,
      },
    });
    if (response.status !== 200) {
      throw new Error(`Invalid session: ${response.status}`);
    }
    logger.info(`fetched ${url}`);
    logger.info(`parsing response`);
    const json = await response.json();
    return json;
  } catch (e) {
    if (e instanceof SyntaxError) {
      e = Error("Invalid session");
    }

    logger.error(e);

    throw e;
  }
}

const saveLeaderboard = async (id, year) => {
  try {
    logger.info("fetching leaderboard...");
    const json = await fetchLeaderboard(id, year);

    logger.info("done fetching, connecting to db...");
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    logger.info("connected, checking if exists...");
    const exists = await collection.findOne({ id, year });
    let result;
    if (exists) {
      logger.info("exists, updating...");
      result = await collection.updateOne({
        id,
        year,
      }, {
        $set: {
          json,
          updated: new Date(),
        },
      });
    } else {
      logger.info("does not exist, inserting...");
      result = await collection.insertOne({
        id,
        year,
        json,
        updated: new Date(),
        inserted: new Date(),
      });
    }
  } catch (e) {
    logger.error(e);
    throw e;
  } finally {
    logger.info("closing connection");
    await client.close();
  }
  logger.info("done");
}

const main = async () => {
  const year = process.argv[2];
  const id = process.argv[3];
  if (!year || !id) {
    logger.error("Usage: node fetch.mjs <year> <id>");
    return;
  }
  await saveLeaderboard(2238062, 2022);
  process.exit(0);
}

main();
