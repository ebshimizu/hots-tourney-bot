module.exports = {
  name: 'end',
  description: 'End the current tournament.',
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

    // close
    await active[0].update({
      $set: {
        active: false,
      },
    });
    message.reply(`Ended the "${active[0].name}" tournament.`);
  },
};
