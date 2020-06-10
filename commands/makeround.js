const _ = require('lodash');
const moment = require('moment');
const Discord = require('discord.js');

async function generateRound(tournament, message, db) {
  message.channel.startTyping();

  // advance current round
  const round = tournament.currentRound + 1;

  // assign players into teams
  const playerNames = _.shuffle(
    tournament.players.map((p) => {
      return { id: p.id, displayName: p.displayName };
    })
  );

  // chunk it
  const teams = _.chunk(playerNames, 5);
  const bye = [];
  const matches = [];

  // construct random teams as long as there's at least two remaining
  while (teams.length >= 2) {
    const team1 = teams.shift();
    const team2 = teams.shift();

    // check for full size teams
    if (team1.length === 5 && team2.length === 5) {
      // construct match
      matches.push({
        tournamentId: tournament.uuid,
        serverId: message.guild.id,
        date: moment().unix(),
        team1,
        team2,
        roundNumber: round,
        matchNumber: matches.length + 1,
      });
    } else {
      // add to bye players
      bye = bye.concat(team1, team2);
    }
  }

  // odd number of teams
  if (teams.length > 0) bye = bye.concat(teams[0]);

  // add matches to database
  const result = await db.match.bulkInsert(matches);

  if (result.error.length > 0) {
    console.log(result.error);
    message.channel.send(`Error: ${result.error}`);
  }

  // update tournament object
  tournament.update({
    $set: {
      currentRound: round,
    },
  });

  // output round info
  for (const match of matches) {
    const matchEmbed = new Discord.MessageEmbed()
      .setColor('00a3cc')
      .setTitle(`Round ${round} Match ${match.matchNumber}`)
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

  if (bye.length > 0) {
    const byeEmbed = new Discord.MessageEmbed()
      .setColor('00a3cc')
      .setTitle('Bye')
      .addField('Players', bye.map((p) => p.displayName).join('\n'))
      .setTimestamp()
      .setFooter(tournament.name);
  }

  message.channel.stopTyping();
}

module.exports = {
  name: 'makeround',
  description: 'Construct a new Tournament Round.',
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
          `There are ${unreported.length} unreported matches. Proceed with next round? [Y/N]`
        )
        .then(() => {
          const filter = (m) => message.author.id === m.author.id;
          message.channel
            .awaitMessages(filter, { time: 60000, max: 1, errors: ['time'] })
            .then((messages) => {
              if (messages.first().content.toLowerCase() === 'y') {
                generateRound(tournament, message, db);
              } else {
                message.reply('Cancelled round generation.');
              }
            })
            .catch(() => {
              message.reply('Cancelled round generation.');
            });
        });
    } else {
      generateRound(tournament, message, db);
    }
  },
};
