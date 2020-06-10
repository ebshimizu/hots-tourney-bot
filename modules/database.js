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
    statics: {
      active: async function (serverId) {
        const docs = await this.find({
          serverId,
          active: true,
        }).exec();
        return docs;
      },
      addNew: async function (serverId, name, uuid) {
        this.insert({
          serverId,
          name,
          uuid,
          date: moment().unix(),
          active: true,
        });
      },
    },
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
