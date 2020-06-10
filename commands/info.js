const Discord = require('discord.js');

module.exports = {
  name: 'info',
  description: 'Displays information about the current tournament.',
  guildOnly: true,
  async execute(message, args, db) {
    message.channel.startTyping();
    message.delete();

    // check for active tournaments in the server
    const active = await db.tournament.active(message.guild.id);

    const embed = new Discord.MessageEmbed();

    if (active.length == 0) {
      embed.setTitle('No active Tournament');
    } else {
      const tournament = active[0];
      embed
        .setTitle(`${tournament.name} Information`)
        .addField('Registration', tournament.signupsOpen ? 'Open' : 'Closed')
        .addField('Current Round', tournament.currentRound)
        .setDescription(
          `Participants: ${tournament.players
            .map((p) => p.displayName)
            .join(', ')}`
        );
    }

    message.channel.send(embed);
    message.channel.stopTyping();
  },
};
