import discord from 'discord.js';
import logger from 'winston';
import packageJson from '../package.json';
import TCPServer from './TCPServer';

class Bot {
  constructor(config) {
    this.config = config;
    this.discord = new discord.Client();
  }

  connect() {
    logger.info('Connecting to Discord ...');
    this.discord.login(this.config.token);
    this.addListeners();

    // Initialize TCP server
    this.server = new TCPServer(this.config);
    this.server.on('data', data => this.sendMessage(data));
    this.server.start();
  }

  addListeners() {
    this.discord.on('ready', () => {
      logger.info('Connected to Discord');

      // Get the channel
      // this.channel = this.discord.channels.find('name', this.config.channel);
      this.channel = this.discord.channels.get(this.config.channel);
    });

    this.discord.on('message', message => this.parseMessage(message));

    this.discord.on('warn', warning => {
      logger.warn('Received warn event from Discord:', warning);
    });

    this.discord.on('error', error => {
      logger.error('Received error event from Discord:', error);
    });
  }

  /**
   * Send message
   */
  sendMessage(message) {
    if (this.channel) {
      this.channel.send(message);
    }
  }

  /**
   * Parse Discord messages
   */
  parseMessage(message) {
    // Ignore messages sent by the bot itself
    if (message.author.id === this.discord.user.id) {
      return;
    }

    // Parse command and arguments
    if (message.content.startsWith(this.config.prefix)) {
      const content = message.content.toLowerCase();
      const args = content.trim().split(/\s+/);
      const command = args.shift().substr(1);

      if (command.length) {
        this.command(command, args, message);
      }
    }
  }

  /**
   * Command
   */
  command(command, args, message) {
    switch (command) {
      case 'info':
      case 'about':
      case 'version': {
        this.info(args, message);
        break;
      }
    }
  }

  /**
   * Info command
   */
  info(args, message) {
    message.channel.send(
      `${packageJson.description} v${packageJson.version} - ${packageJson.url}`
    );
  }
}

export default Bot;
