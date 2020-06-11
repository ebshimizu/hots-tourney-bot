const _ = require('lodash');
const Discord = require('discord.js');

module.exports = {
  name: 'leaderboard',
  aliases: ['ranks', 'lb'],
  description: 'Displays the record for all tournament members.',
  guildOnly: true,
  permissions: ['ADMINISTRATOR'],
  async execute(message, args, db) {
    message.delete();
    message.channel.startTyping();

    // check for active tournaments in the server
    const active = await db.tournament.active(message.guild.id);

    if (active.length == 0) {
      message.reply('No active tournament in this server.');
      message.channel.stopTyping();
      return;
    }

    const tournament = active[0];

    const sortedPlayers = tournament.players;
    sortedPlayers.sort((a, b) => {
      const delta = b.wins - a.wins;
      if (delta == 0) return b.matches - a.matches;
      return delta;
    });

    const embed = new Discord.MessageEmbed()
      .setTitle(`${tournament.name} Leaderboard`)
      .addField(
        'Player',
        sortedPlayers.map((p) => p.displayName).join('\n'),
        true
      )
      .addField('Wins', sortedPlayers.map((p) => p.wins).join('\n'), true)
      .addField('Matches', sortedPlayers.map((p) => p.matches).join('\n'), true)
      .setTimestamp();

    message.channel.send(embed);

    message.channel.stopTyping();
  },
};
