const { prefix } = require('../config.json');

module.exports = {
  name: 'help',
  description: 'List available commands or get info about an available command.',
  aliases: ['commands'],
  usage: '[command name]',
  execute(message, args) {
    const data = [];
    const { commands } = message.client;

    if (!args.length) {
      data.push('Available commands:');
      data.push(commands.map((c, v) => v).join(', '));
      data.push(`\nUse \`${prefix}help [command name]\` to get info on a specific command.`);

      return message.reply(data, { split: true });
    }

    const name = args[0].toLowerCase();
    const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));

    if (!command) {
      return message.reply('No valid command specified.');
    }

    data.push(`**Name:** ${command.name}`);

    if (command.aliases) data.push(`**Aliases:** ${command.aliases.join(', ')}`);
    if (command.description) data.push(`**Description:** ${command.description}`);
    if (command.usage) data.push(`**Usage:** ${prefix}${command.name} ${command.usage}`);
    if (command.permissions) data.push(`**Required Permissions:** ${command.permissions.join(', ')}`);

    message.channel.send(data, { split: true });
  },
};