// use permissions 268692560
const fs = require('fs-extra');
const ms = require('ms');
const {version} = require('./package.json');

// database
const Database = require('./modules/database');

const Discord = require('discord.js');
const { prefix } = require('./config.json');
const client = new Discord.Client();

const commandFiles = fs
  .readdirSync('./commands')
  .filter(file => file.endsWith('.js'));

function debugLog(message) {
  console.log(`${new Date()}\t[DEBUG] ${message}`);
}

async function start() {
  const db = await Database.get();
  client.commands = new Discord.Collection();

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);

    if (command.aliases) {
      for (const alias of command.aliases) {
        client.commands.set(alias, command);
      }
    }
  }

  client.once('ready', () => {
    console.log('Ready!');
    client.user.setActivity(`v${version}`);
  });

  client.on('message', message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (!client.commands.has(commandName)) return;
    const command = client.commands.get(commandName);

    // check permissions
    if (command.permissions) {
      if (
        message.member &&
        !message.member.hasPermission(command.permissions)
      ) {
        message.reply(
          `You do not have permission to execute the ${commandName} command. Required: ${command.permissions.join(
            ', '
          )}.`
        );

        return;
      }
    }

    // no dm commands allowed
    if (command.guildOnly && message.channel.type !== 'text') {
      return message.reply('Command cannot be executed in DMs');
    }

    // bit of scaffolding for arg handling
    if (command.args && !args.length) {
      let reply = `${message.author} Required arguments not found.`;

      if (command.usage) {
        reply += `\nUsage: \`${prefix}${command.name} ${command.usage}\``;
      }

      return message.channel.send(reply);
    }

    try {
      command.execute(message, args, db);
    } catch (error) {
      console.error(error);
      message.reply('Error Executing Command');
    }
  });

  client.login(process.env.HOTSBOT_TOKEN);
}

start();