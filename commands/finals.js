const _ = require('lodash');
const moment = require('moment');
const Discord = require('discord.js');

async function generateFinals(tournament, message, db) {
  // advance current round
  const round = tournament.currentRound + 1;

  // pick the top 10 then randomize
  const sortedPlayers = _.shuffle(tournament.players);
  sortedPlayers.sort((a, b) => {
    const delta = b.wins - a.wins;
    if (delta == 0) return b.matches - a.matches;
    return delta;
  });

  const playerNames = sortedPlayers.map((p) => {
    return { id: p.id, displayName: p.displayName };
  });

  // create finals
  if (playerNames.length < 10) {
    message.reply(
      `Unable to make a finals round with ${playerNames.length} players`
    );
  } else {
    const teams = _.chunk(playerNames, 5);
    const team1 = teams.shift();
    const team2 = teams.shift();

    const match = {
      tournamentId: tournament.uuid,
      serverId: message.guild.id,
      date: moment().unix(),
      team1,
      team2,
      roundNumber: round,
      matchNumber: 1,
    };

    // update db
    await db.match.insert(match);

    // update tournament object
    tournament.update({
      $set: {
        currentRound: round,
      },
    });

    // output round info
    const matchEmbed = new Discord.MessageEmbed()
      .setColor('00a3cc')
      .setTitle(`Round ${round} Match 1`)
      .addField(
        'Blue Team',
        match.team1.map((p) => p.displayName).join('\n'),
        true
      )
      .addField(
        'Red Team',
        match.team2.map((p) => p.displayName).join('\n'),
        true
      )
      .setTimestamp()
      .setFooter(tournament.name);

    message.channel.send(matchEmbed);
  }
}

module.exports = {
  name: 'finals',
  description: 'Construct a finals Tournament Round.',
  guildOnly: true,
  permissions: ['ADMINISTRATOR'],
  async execute(message, args, db) {
    message.delete();

    // check for active tournaments in the server
    const active = await db.tournament.active(message.guild.id);

    if (active.length == 0) {
      message.reply('No active tournament in this server.');
      return;
    }

    const tournament = active[0];

    // check if there are any unreported matches in the current round
    const unreported = (
      await db.match.active(
        message.guild.id,
        tournament.uuid,
        tournament.currentRound
      )
    ).filter((m) => !m.reported);

    if (unreported.length > 0) {
      message.channel
        .send(
          `There are ${unreported.length} unreported matches. Proceed with finals? [Y/N]`
        )
        .then(() => {
          const filter = (m) => message.author.id === m.author.id;
          message.channel
            .awaitMessages(filter, { time: 60000, max: 1, errors: ['time'] })
            .then((messages) => {
              if (messages.first().content.toLowerCase() === 'y') {
                generateFinals(tournament, message, db);
              } else {
                message.reply('Cancelled round generation.');
              }
            })
            .catch(() => {
              message.reply('Cancelled round generation.');
            });
        });
    } else {
      generateFinals(tournament, message, db);
    }
  },
};
