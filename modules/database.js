require('babel-polyfill');
const moment = require('moment');
const RxDB = require('rxdb');
RxDB.plugin(require('pouchdb-adapter-node-websql'));
const tournamentSchema = require('../data/schema/tournament');
const matchSchema = require('../data/schema/match');

const Database = {};

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const create = async () => {
  const database = await RxDB.create({
    name: './db/hots-bot',
    adapter: 'websql',
    multiInstance: true,
  });

  await database.collection({
    name: 'tournament',
    schema: tournamentSchema,
    migrationStrategies: {},
    statics: {},
  });

  await database.collection({
    name: 'match',
    schema: matchSchema,
    migrationStrategies: {},
    statics: {},
  });

  return database;
};

let createPromise = null;
Database.get = async () => {
  if (!createPromise) createPromise = create();
  return createPromise;
};

module.exports = Database;
