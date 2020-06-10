const { v4: uuidv4 } = require('uuid');

module.exports = {
  name: 'start',
  description: 'Start a new tournament.',
  usage: '[tournament name]',
  args: true,
  guildOnly: true,
  permissions: ['ADMINISTRATOR'],
  async execute(message, args, db) {
    message.delete();

    // check for active tournaments in the server
    const active = await db.tournament.active(message.guild.id);

    if (active.length > 0) {
      message.reply(
        `There is already an active tournament running. End the "${active[0].name}" tournament before creating a new one`
      );
      return;
    }

    // otherwise, start one up.
    await db.tournament.addNew(message.guild.id, args.join(' '), uuidv4());
    message.reply(
      `Started a new tournament named ${args.join(
        ' '
      )}. Signups are currently open.`
    );
  },
};
