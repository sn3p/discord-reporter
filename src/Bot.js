import packageJson from '../package.json';
import discord from 'discord.js';
import net from 'net';
import logger from 'winston';

class Bot {
  constructor(config) {
    this.config = config;
    this.discord = new discord.Client();
    this.authed = false;
    this.socket = null;
  }

  connect() {
    logger.info('Connecting to Discord ...');
    this.discord.login(this.config.token);
    this.attachDiscordListeners();

    // TCP server
    // https://github.com/frostybay/tutorial-nodejs-tcp-server
    this.server = net.createServer(socket => this.onClientConnected(socket));
    this.attachReporterListeners();
  }

  attachDiscordListeners() {
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

  attachReporterListeners() {
    this.server.on('error', error => {
      logger.error('Error', error);
      throw error;
    });

    this.server.listen(this.config.port, () => {
      const address = this.server.address();
      logger.info(`Server listening on ${address.address}:${address.port}`);
    });
  }

  /**
   * Client connected
   */
  onClientConnected(socket) {
    // console.log('SOCKET?', !!this.socket);
    // if (this.socket) {
    //   return;
    // }
    this.socket = socket;
    // this.socket.setTimeout(0);

    const clientName = this.clientName();
    logger.info(`${clientName} connected!`);

    // this.socket.write('ENTER PASSWORD\r\n');

    this.socket.on('data', this.onClientData.bind(this));

    this.socket.on('error', error => {
      logger.error(`${clientName} errored.`, error);
      this.onClientDisconnected();
    });

    // this.socket.on('close', (hasError) => {
    //   logger.info(`${clientName} terminated`, hasError);
    //   // this.onClientDisconnected();
    // });

    this.socket.on('timeout', () => {
      logger.info(`${clientName} timed out.`);
      this.onClientDisconnected();
    });

    this.socket.on('end', () => {
      logger.info(`${clientName} disconnected.`);
      this.onClientDisconnected();
    });
  }

  /**
   * Client data reveived
   */
  onClientData(data) {
    const clientName = this.clientName();

    // Get the message string and trim new line characters
    const message = data.toString().replace(/[\n\r]*$/, '');
    if (this.config.debug) {
      logger.info(`${clientName}: ${message}`);
    }

    // Authentication
    if (!this.authed) {
      if (message === `PASS ${this.config.password}`) {
        logger.info(`${clientName} logged in.`);
        this.socket.write('200\r\n'); // OK
        this.authed = true;
      } else {
        this.socket.write('401\r\n'); // Unauthorized
      }
      return;
    }

    // Make sure the password is never exposed
    if (message.content.startsWith('PASS')) {
      return;
    }

    // Send message to Discord
    this.sendMessage(message);
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
   * Client disconnected
   */
  onClientDisconnected() {
    logger.info(`Cleaning up client (${this.clientName()}).`);
    this.socket.destroy();
    this.socket = null;
    this.authed = false;
  }

  /**
   * Client name
   */
  clientName() {
    return 'UT';
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
