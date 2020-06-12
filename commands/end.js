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
    message.channel
      .send(
        'Are you sure you want to end the current tournament? **This action is not undoable**. [Y/N]'
      )
      .then(() => {
        const filter = (m) => message.author.id === m.author.id;
        message.channel
          .awaitMessages(filter, { time: 60000, max: 1, errors: ['time'] })
          .then(async (messages) => {
            const choice = messages.first().content.toLowerCase();
            if (choice === 'y') {
              await active[0].update({
                $set: {
                  active: false,
                },
              });
              message.reply(`Ended the "${active[0].name}" tournament.`);
            } else {
              message.reply('End tournament cancelled.');
            }
          });
      });
  },
};
