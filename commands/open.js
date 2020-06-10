module.exports = {
  name: 'open',
  description: 'Open registration.',
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

    // close registration
    await active[0].update({
      $set: {
        signupsOpen: true,
      },
    });
    message.reply(`Registration for **${active[0].name}** is now open.`);
  },
};
